import { Sprint } from './sprint.model';
import { Task } from '../tasks/task.model';
import { ApiError } from '../../utils/ApiError';

export async function createSprint(
  projectId: string,
  workspaceId: string,
  userId: string,
  data: { name: string; goal?: string; startDate?: string; endDate?: string }
) {
  return Sprint.create({ projectId, workspaceId, createdBy: userId, ...data });
}

export async function listSprints(projectId: string) {
  return Sprint.find({ projectId }).sort({ createdAt: -1 });
}

export async function startSprint(sprintId: string, projectId: string) {
  // Only one sprint can be active at a time per project — mirrors Jira's model.
  const alreadyActive = await Sprint.findOne({ projectId, status: 'active' });
  if (alreadyActive && alreadyActive._id.toString() !== sprintId) {
    throw ApiError.conflict('Another sprint is already active. Complete it first.');
  }
  const sprint = await Sprint.findByIdAndUpdate(
    sprintId,
    { status: 'active', startDate: new Date() },
    { new: true }
  );
  if (!sprint) throw ApiError.notFound('Sprint not found');
  return sprint;
}

export async function completeSprint(sprintId: string) {
  const sprint = await Sprint.findByIdAndUpdate(
    sprintId,
    { status: 'completed', endDate: new Date() },
    { new: true }
  );
  if (!sprint) throw ApiError.notFound('Sprint not found');
  // Incomplete tasks automatically return to the backlog for re-planning.
  await Task.updateMany({ sprintId }, { $unset: { sprintId: '' } });
  return sprint;
}

export async function deleteSprint(sprintId: string) {
  const sprint = await Sprint.findByIdAndDelete(sprintId);
  if (!sprint) throw ApiError.notFound('Sprint not found');
  await Task.updateMany({ sprintId }, { $unset: { sprintId: '' } });
}

export async function assignTaskToSprint(taskId: string, sprintId: string | null) {
  const update = sprintId ? { sprintId } : { $unset: { sprintId: '' } };
  const task = await Task.findByIdAndUpdate(taskId, update, { new: true });
  if (!task) throw ApiError.notFound('Task not found');
  return task;
}
