import { Router, Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { requireAuth } from '../../middleware/auth';
import { requireWorkspaceMember, requireMinRole } from '../../middleware/rbac';
import { loadProjectWorkspace } from '../../middleware/loadProjectWorkspace';
import { validate } from '../../middleware/validate';
import { createEpicSchema, updateEpicSchema } from './epic.validation';
import * as epicService from './epic.service';

export const projectEpicRouter = Router({ mergeParams: true });
projectEpicRouter.use(requireAuth, loadProjectWorkspace(), requireWorkspaceMember());

projectEpicRouter.get(
  '/',
  catchAsync(async (req: Request, res: Response) => {
    const epics = await epicService.listEpics(req.params.projectId);
    res.status(200).json({ success: true, data: { epics } });
  })
);

projectEpicRouter.post(
  '/',
  requireMinRole('pm'),
  validate(createEpicSchema),
  catchAsync(async (req: Request, res: Response) => {
    const epic = await epicService.createEpic(
      req.params.projectId,
      req.workspaceId!,
      req.userId!,
      req.body
    );
    res.status(201).json({ success: true, data: { epic } });
  })
);

projectEpicRouter.patch(
  '/:epicId',
  requireMinRole('pm'),
  validate(updateEpicSchema),
  catchAsync(async (req: Request, res: Response) => {
    const epic = await epicService.updateEpic(req.params.epicId, req.body);
    res.status(200).json({ success: true, data: { epic } });
  })
);

projectEpicRouter.delete(
  '/:epicId',
  requireMinRole('pm'),
  catchAsync(async (req: Request, res: Response) => {
    await epicService.deleteEpic(req.params.epicId);
    res.status(200).json({ success: true, data: null });
  })
);
