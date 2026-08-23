import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireWorkspaceMember, requireMinRole } from '../../middleware/rbac';
import { loadProjectWorkspace } from '../../middleware/loadProjectWorkspace';
import { loadTaskWorkspace } from '../../middleware/loadTaskWorkspace';
import { validate } from '../../middleware/validate';
import { createTaskSchema, updateTaskSchema, moveTaskSchema } from './task.validation';
import * as taskController from './task.controller';

// Project-scoped: /projects/:projectId/tasks
export const projectTaskRouter = Router({ mergeParams: true });
projectTaskRouter.use(requireAuth, loadProjectWorkspace(), requireWorkspaceMember());
projectTaskRouter.get('/', taskController.listTasks);
projectTaskRouter.post(
  '/',
  requireMinRole('member'),
  validate(createTaskSchema),
  taskController.createTask
);

// Task-scoped: /tasks/:taskId
export const taskRouter = Router();
taskRouter.use(requireAuth);
taskRouter.get('/:taskId', loadTaskWorkspace(), requireWorkspaceMember(), taskController.getTask);
taskRouter.patch(
  '/:taskId',
  loadTaskWorkspace(),
  requireWorkspaceMember(),
  requireMinRole('member'),
  validate(updateTaskSchema),
  taskController.updateTask
);
taskRouter.delete(
  '/:taskId',
  loadTaskWorkspace(),
  requireWorkspaceMember(),
  requireMinRole('pm'),
  taskController.deleteTask
);
taskRouter.patch(
  '/:taskId/move',
  loadTaskWorkspace(),
  requireWorkspaceMember(),
  requireMinRole('member'),
  validate(moveTaskSchema),
  taskController.moveTask
);
