import { Router, Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { requireAuth } from '../../middleware/auth';
import { requireWorkspaceMember, requireMinRole } from '../../middleware/rbac';
import { loadTaskWorkspace } from '../../middleware/loadTaskWorkspace';
import { validate } from '../../middleware/validate';
import { createCommentSchema } from './comment.validation';
import * as commentService from './comment.service';

const router = Router({ mergeParams: true });
router.use(requireAuth, loadTaskWorkspace(), requireWorkspaceMember());

router.get(
  '/',
  catchAsync(async (req: Request, res: Response) => {
    const comments = await commentService.listComments(req.params.taskId);
    res.status(200).json({ success: true, data: { comments } });
  })
);

router.post(
  '/',
  requireMinRole('member'),
  validate(createCommentSchema),
  catchAsync(async (req: Request, res: Response) => {
    const comment = await commentService.createComment(req.params.taskId, req.userId!, req.body);
    res.status(201).json({ success: true, data: { comment } });
  })
);

router.delete(
  '/:commentId',
  catchAsync(async (req: Request, res: Response) => {
    await commentService.deleteComment(req.params.commentId, req.userId!);
    res.status(200).json({ success: true, data: null });
  })
);

export default router;
