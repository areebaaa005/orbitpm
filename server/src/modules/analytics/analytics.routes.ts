import { Router, Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { requireAuth } from '../../middleware/auth';
import { requireWorkspaceMember } from '../../middleware/rbac';
import { loadProjectWorkspace } from '../../middleware/loadProjectWorkspace';
import * as analyticsService from './analytics.service';

export const projectAnalyticsRouter = Router({ mergeParams: true });
projectAnalyticsRouter.use(requireAuth, loadProjectWorkspace(), requireWorkspaceMember());
projectAnalyticsRouter.get(
  '/',
  catchAsync(async (req: Request, res: Response) => {
    const analytics = await analyticsService.getProjectAnalytics(req.params.projectId);
    res.status(200).json({ success: true, data: analytics });
  })
);

export const workspaceAnalyticsRouter = Router({ mergeParams: true });
workspaceAnalyticsRouter.use(requireAuth, requireWorkspaceMember());
workspaceAnalyticsRouter.get(
  '/',
  catchAsync(async (req: Request, res: Response) => {
    const analytics = await analyticsService.getWorkspaceAnalytics(req.params.workspaceId);
    res.status(200).json({ success: true, data: analytics });
  })
);
