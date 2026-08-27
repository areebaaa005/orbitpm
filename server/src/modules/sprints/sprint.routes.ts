import { Router, Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { requireAuth } from '../../middleware/auth';
import { requireWorkspaceMember, requireMinRole } from '../../middleware/rbac';
import { loadProjectWorkspace } from '../../middleware/loadProjectWorkspace';
import { loadTaskWorkspace } from '../../middleware/loadTaskWorkspace';
import { validate } from '../../middleware/validate';
import { createSprintSchema, assignSprintSchema } from './sprint.validation';
import * as sprintService from './sprint.service';

export const projectSprintRouter = Router({ mergeParams: true });
projectSprintRouter.use(requireAuth, loadProjectWorkspace(), requireWorkspaceMember());

projectSprintRouter.get(
  '/',
  catchAsync(async (req: Request, res: Response) => {
    const sprints = await sprintService.listSprints(req.params.projectId);
    res.status(200).json({ success: true, data: { sprints } });
  })
);

projectSprintRouter.post(
  '/',
  requireMinRole('pm'),
  validate(createSprintSchema),
  catchAsync(async (req: Request, res: Response) => {
    const sprint = await sprintService.createSprint(
      req.params.projectId,
      req.workspaceId!,
      req.userId!,
      req.body
    );
    res.status(201).json({ success: true, data: { sprint } });
  })
);

projectSprintRouter.patch(
  '/:sprintId/start',
  requireMinRole('pm'),
  catchAsync(async (req: Request, res: Response) => {
    const sprint = await sprintService.startSprint(req.params.sprintId, req.params.projectId);
    res.status(200).json({ success: true, data: { sprint } });
  })
);

projectSprintRouter.patch(
  '/:sprintId/complete',
  requireMinRole('pm'),
  catchAsync(async (req: Request, res: Response) => {
    const sprint = await sprintService.completeSprint(req.params.sprintId);
    res.status(200).json({ success: true, data: { sprint } });
  })
);

projectSprintRouter.delete(
  '/:sprintId',
  requireMinRole('pm'),
  catchAsync(async (req: Request, res: Response) => {
    await sprintService.deleteSprint(req.params.sprintId);
    res.status(200).json({ success: true, data: null });
  })
);

// Task <-> Sprint assignment, mounted separately under /tasks/:taskId/sprint
export const taskSprintRouter = Router({ mergeParams: true });
taskSprintRouter.use(requireAuth, loadTaskWorkspace(), requireWorkspaceMember());
taskSprintRouter.patch(
  '/',
  requireMinRole('member'),
  validate(assignSprintSchema),
  catchAsync(async (req: Request, res: Response) => {
    const task = await sprintService.assignTaskToSprint(req.params.taskId, req.body.sprintId);
    res.status(200).json({ success: true, data: { task } });
  })
);
