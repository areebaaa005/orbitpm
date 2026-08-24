import { Task } from './task.model';
import { ApiError } from '../../utils/ApiError';
import { logActivity } from '../activities/activity.service';
import { createNotification } from '../notifications/notification.service';
import { emitToProject } from '../../config/socket';

interface CreateTaskInput {
  columnId: string;
  title: string;
  description?: string;
  assigneeIds?: string[];
  priority?: string;
  labels?: string[];
  dueDate?: string;
}

export async function createTask(
  workspaceId: string,
  projectId: string,
  reporterId: string,
  input: CreateTaskInput
) {
  const count = await Task.countDocuments({ columnId: input.columnId });
  const task = await Task.create({
    workspaceId,
    projectId,
    columnId: input.columnId,
    title: input.title,
    description: input.description,
    assigneeIds: input.assigneeIds || [],
    reporterId,
    priority: input.priority || 'medium',
    labels: input.labels || [],
    dueDate: input.dueDate,
    order: count,
  });

  await logActivity({
    workspaceId,
    projectId,
    taskId: task._id.toString(),
    actorId: reporterId,
    action: 'task_created',
    metadata: { title: task.title },
  });

  emitToProject(projectId, 'task:created', task);

  for (const assigneeId of input.assigneeIds || []) {
    if (assigneeId === reporterId) continue;
    await createNotification({
      userId: assigneeId,
      type: 'task_assigned',
      workspaceId,
      taskId: task._id.toString(),
      actorId: reporterId,
      message: `You were assigned to "${task.title}"`,
    });
  }

  return task;
}

interface ListTaskFilters {
  columnId?: string;
  assigneeId?: string;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listTasks(projectId: string, filters: ListTaskFilters) {
  const query: Record<string, unknown> = { projectId };
  if (filters.columnId) query.columnId = filters.columnId;
  if (filters.assigneeId) query.assigneeIds = filters.assigneeId;
  if (filters.priority) query.priority = filters.priority;
  if (filters.search) query.$text = { $search: filters.search };

  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 50, 100);
  const skip = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    Task.find(query).sort({ order: 1 }).skip(skip).limit(limit),
    Task.countDocuments(query),
  ]);

  return { tasks, total, page, pages: Math.ceil(total / limit) };
}

export async function getTask(taskId: string) {
  const task = await Task.findById(taskId);
  if (!task) throw ApiError.notFound('Task not found');
  return task;
}

export async function updateTask(taskId: string, updates: Record<string, unknown>, actorId: string) {
  const task = await Task.findByIdAndUpdate(taskId, updates, { new: true });
  if (!task) throw ApiError.notFound('Task not found');

  await logActivity({
    workspaceId: task.workspaceId.toString(),
    projectId: task.projectId.toString(),
    taskId: task._id.toString(),
    actorId,
    action: 'task_updated',
    metadata: { fields: Object.keys(updates) },
  });

  emitToProject(task.projectId.toString(), 'task:updated', task);
  return task;
}

export async function deleteTask(taskId: string) {
  const task = await Task.findByIdAndDelete(taskId);
  if (!task) throw ApiError.notFound('Task not found');
  emitToProject(task.projectId.toString(), 'task:deleted', { taskId });
}

/**
 * Moves a task to a (possibly new) column at a specific order, and shifts
 * the order of sibling tasks so the sequence stays contiguous. This is the
 * server-side source of truth behind drag-and-drop persistence.
 */
export async function moveTask(
  taskId: string,
  targetColumnId: string,
  targetOrder: number,
  actorId: string
) {
  const task = await Task.findById(taskId);
  if (!task) throw ApiError.notFound('Task not found');

  const sourceColumnId = task.columnId.toString();
  const movingWithinSameColumn = sourceColumnId === targetColumnId;

  if (movingWithinSameColumn) {
    if (targetOrder > task.order) {
      await Task.updateMany(
        { columnId: sourceColumnId, order: { $gt: task.order, $lte: targetOrder } },
        { $inc: { order: -1 } }
      );
    } else if (targetOrder < task.order) {
      await Task.updateMany(
        { columnId: sourceColumnId, order: { $gte: targetOrder, $lt: task.order } },
        { $inc: { order: 1 } }
      );
    }
  } else {
    await Task.updateMany(
      { columnId: sourceColumnId, order: { $gt: task.order } },
      { $inc: { order: -1 } }
    );
    await Task.updateMany(
      { columnId: targetColumnId, order: { $gte: targetOrder } },
      { $inc: { order: 1 } }
    );
  }

  task.columnId = targetColumnId as unknown as typeof task.columnId;
  task.order = targetOrder;
  await task.save();

  await logActivity({
    workspaceId: task.workspaceId.toString(),
    projectId: task.projectId.toString(),
    taskId: task._id.toString(),
    actorId,
    action: 'task_moved',
    metadata: { fromColumnId: sourceColumnId, toColumnId: targetColumnId },
  });

  emitToProject(task.projectId.toString(), 'task:moved', task);
  return task;
}
