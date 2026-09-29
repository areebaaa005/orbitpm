import { Task } from '../modules/tasks/task.model';
import { ApiError } from '../utils/ApiError';
import { catchAsync } from '../utils/catchAsync';
import { isObjectId } from '../utils/objectId';

export function loadTaskWorkspace() {
  return catchAsync(async (req, _res, next) => {
    if (!isObjectId(req.params.taskId)) {
      return next(ApiError.badRequest('INVALID_ID', 'Invalid task id'));
    }
    const task = await Task.findById(req.params.taskId).select('workspaceId');
    if (!task) {
      return next(ApiError.notFound('Task not found'));
    }
    req.workspaceId = task.workspaceId.toString();
    next();
  });
}
