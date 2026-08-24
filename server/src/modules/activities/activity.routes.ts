import { Router, Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { requireAuth } from '../../middleware/auth';
import { requireWorkspaceMember } from '../../middleware/rbac';
import { loadTaskWorkspace } from '../../middleware/loadTaskWorkspace';
import { loadProjectWorkspace } from '../../middleware/loadProjectWorkspace';
import * as activityService from './activity.service';

export const taskActivityRouter = Router({ mergeParams: true });
taskActivityRouter.use(requireAuth, loadTaskWorkspace(), requireWorkspaceMember());
taskActivityRouter.get(
  '/',
  catchAsync(async (req: Request, res: Response) => {
    const activities = await activityService.listTaskActivity(req.params.taskId);
    res.status(200).json({ success: true, data: { activities } });
  })
);

export const projectActivityRouter = Router({ mergeParams: true });
projectActivityRouter.use(requireAuth, loadProjectWorkspace(), requireWorkspaceMember());
projectActivityRouter.get(
  '/',
  catchAsync(async (req: Request, res: Response) => {
    const activities = await activityService.listProjectActivity(req.params.projectId);
    res.status(200).json({ success: true, data: { activities } });
  })
);
