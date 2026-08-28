import { Router, Request, Response } from 'express';
import multer from 'multer';
import { catchAsync } from '../../utils/catchAsync';
import { requireAuth } from '../../middleware/auth';
import { requireWorkspaceMember, requireMinRole } from '../../middleware/rbac';
import { loadTaskWorkspace } from '../../middleware/loadTaskWorkspace';
import { ApiError } from '../../utils/ApiError';
import { uploadBuffer, deleteByPublicId } from '../../utils/cloudinary';
import { Task } from './task.model';
import { logActivity } from '../activities/activity.service';

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('FILE_TYPE_NOT_ALLOWED'));
    }
    cb(null, true);
  },
});

const router = Router({ mergeParams: true });
router.use(requireAuth, loadTaskWorkspace(), requireWorkspaceMember());

router.post(
  '/',
  requireMinRole('member'),
  (req: Request, res: Response, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err.message === 'FILE_TYPE_NOT_ALLOWED') {
          return next(ApiError.badRequest('FILE_TYPE_NOT_ALLOWED', 'This file type is not allowed'));
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(ApiError.badRequest('FILE_TOO_LARGE', 'File exceeds the 10MB limit'));
        }
        return next(ApiError.badRequest('UPLOAD_ERROR', err.message));
      }
      next();
    });
  },
  catchAsync(async (req: Request, res: Response) => {
    if (!req.file) throw ApiError.badRequest('NO_FILE', 'No file was provided');

    const { url, publicId } = await uploadBuffer(req.file.buffer, req.file.originalname);

    const task = await Task.findByIdAndUpdate(
      req.params.taskId,
      {
        $push: {
          attachments: {
            url,
            publicId,
            filename: req.file.originalname,
            size: req.file.size,
            mimeType: req.file.mimetype,
            uploadedBy: req.userId,
          },
        },
      },
      { new: true }
    );
    if (!task) throw ApiError.notFound('Task not found');

    await logActivity({
      workspaceId: task.workspaceId.toString(),
      projectId: task.projectId.toString(),
      taskId: task._id.toString(),
      actorId: req.userId!,
      action: 'task_updated',
      metadata: { fields: ['attachments'] },
    });

    res.status(201).json({ success: true, data: { attachments: task.attachments } });
  })
);

router.delete(
  '/:attachmentId',
  catchAsync(async (req: Request, res: Response) => {
    const task = await Task.findById(req.params.taskId);
    if (!task) throw ApiError.notFound('Task not found');

    const attachment = task.attachments.find(
      (a) => a._id.toString() === req.params.attachmentId
    );
    if (!attachment) throw ApiError.notFound('Attachment not found');

    if (attachment.uploadedBy.toString() !== req.userId) {
      throw ApiError.forbidden('You can only remove attachments you uploaded');
    }

    await deleteByPublicId(attachment.publicId);
    task.attachments = task.attachments.filter(
      (a) => a._id.toString() !== req.params.attachmentId
    ) as typeof task.attachments;
    await task.save();

    res.status(200).json({ success: true, data: null });
  })
);

export default router;
