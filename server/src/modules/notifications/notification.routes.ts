import { Router, Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { requireAuth } from '../../middleware/auth';
import * as notificationService from './notification.service';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  catchAsync(async (req: Request, res: Response) => {
    const unreadOnly = req.query.unread === 'true';
    const notifications = await notificationService.listNotifications(req.userId!, unreadOnly);
    res.status(200).json({ success: true, data: { notifications } });
  })
);

router.patch(
  '/:id/read',
  catchAsync(async (req: Request, res: Response) => {
    await notificationService.markAsRead(req.userId!, req.params.id);
    res.status(200).json({ success: true, data: null });
  })
);

router.patch(
  '/read-all',
  catchAsync(async (req: Request, res: Response) => {
    await notificationService.markAllAsRead(req.userId!);
    res.status(200).json({ success: true, data: null });
  })
);

export default router;
