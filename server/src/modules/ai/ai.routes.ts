import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { catchAsync } from '../../utils/catchAsync';
import { requireAuth } from '../../middleware/auth';
import { requireWorkspaceMember } from '../../middleware/rbac';
import { loadTaskWorkspace } from '../../middleware/loadTaskWorkspace';
import { loadProjectWorkspace } from '../../middleware/loadProjectWorkspace';
import * as aiService from './ai.service';

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'AI_RATE_LIMITED', message: 'Too many AI requests, please wait a moment' },
  },
});

export const taskAiRouter = Router({ mergeParams: true });
taskAiRouter.use(requireAuth, loadTaskWorkspace(), requireWorkspaceMember(), aiLimiter);
taskAiRouter.post(
  '/breakdown',
  catchAsync(async (req: Request, res: Response) => {
    const subtasks = await aiService.suggestSubtasks(req.params.taskId);
    res.status(200).json({ success: true, data: { subtasks } });
  })
);

export const projectAiRouter = Router({ mergeParams: true });
projectAiRouter.use(requireAuth, loadProjectWorkspace(), requireWorkspaceMember(), aiLimiter);
projectAiRouter.post(
  '/summary',
  catchAsync(async (req: Request, res: Response) => {
    const result = await aiService.summarizeProject(req.params.projectId);
    res.status(200).json({ success: true, data: result });
  })
);
