import { Request, Response, NextFunction } from 'express';
import { Project } from '../modules/projects/project.model';
import { ApiError } from '../utils/ApiError';

/**
 * For routes shaped /projects/:projectId/..., loads the project and
 * attaches its workspaceId to req so requireWorkspaceMember() can run next.
 */
export function loadProjectWorkspace() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const projectId = req.params.projectId;
    const project = await Project.findById(projectId).select('workspaceId');
    if (!project) {
      return next(ApiError.notFound('Project not found'));
    }
    req.workspaceId = project.workspaceId.toString();
    next();
  };
}
