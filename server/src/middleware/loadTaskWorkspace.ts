import { Request, Response, NextFunction } from 'express';
import { Task } from '../modules/tasks/task.model';
import { ApiError } from '../utils/ApiError';

export function loadTaskWorkspace() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const task = await Task.findById(req.params.taskId).select('workspaceId');
    if (!task) {
      return next(ApiError.notFound('Task not found'));
    }
    req.workspaceId = task.workspaceId.toString();
    next();
  };
}
