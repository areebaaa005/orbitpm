import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireWorkspaceMember, requireMinRole } from '../../middleware/rbac';
import { loadProjectWorkspace } from '../../middleware/loadProjectWorkspace';
import { validate } from '../../middleware/validate';
import {
  createProjectSchema,
  updateProjectSchema,
  createColumnSchema,
  updateColumnSchema,
  reorderColumnSchema,
} from './project.validation';
import * as projectController from './project.controller';

// Workspace-scoped routes: /workspaces/:workspaceId/projects
export const workspaceProjectRouter = Router({ mergeParams: true });
workspaceProjectRouter.use(requireAuth, requireWorkspaceMember());
workspaceProjectRouter.get('/', projectController.listProjects);
workspaceProjectRouter.post(
  '/',
  requireMinRole('pm'),
  validate(createProjectSchema),
  projectController.createProject
);

// Project-scoped routes: /projects/:projectId
export const projectRouter = Router();
projectRouter.use(requireAuth);
projectRouter.get(
  '/:projectId',
  loadProjectWorkspace(),
  requireWorkspaceMember(),
  projectController.getProject
);
projectRouter.patch(
  '/:projectId',
  loadProjectWorkspace(),
  requireWorkspaceMember(),
  requireMinRole('pm'),
  validate(updateProjectSchema),
  projectController.updateProject
);
projectRouter.delete(
  '/:projectId',
  loadProjectWorkspace(),
  requireWorkspaceMember(),
  requireMinRole('pm'),
  projectController.deleteProject
);
projectRouter.get(
  '/:projectId/columns',
  loadProjectWorkspace(),
  requireWorkspaceMember(),
  projectController.listColumns
);
projectRouter.post(
  '/:projectId/columns',
  loadProjectWorkspace(),
  requireWorkspaceMember(),
  requireMinRole('pm'),
  validate(createColumnSchema),
  projectController.createColumn
);
projectRouter.patch(
  '/:projectId/columns/:columnId',
  loadProjectWorkspace(),
  requireWorkspaceMember(),
  requireMinRole('pm'),
  validate(updateColumnSchema),
  projectController.updateColumn
);
projectRouter.delete(
  '/:projectId/columns/:columnId',
  loadProjectWorkspace(),
  requireWorkspaceMember(),
  requireMinRole('pm'),
  projectController.deleteColumn
);
projectRouter.patch(
  '/:projectId/columns/:columnId/reorder',
  loadProjectWorkspace(),
  requireWorkspaceMember(),
  requireMinRole('pm'),
  validate(reorderColumnSchema),
  projectController.reorderColumn
);
