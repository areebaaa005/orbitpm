import { Epic } from './epic.model';
import { ApiError } from '../../utils/ApiError';

export async function createEpic(
  projectId: string,
  workspaceId: string,
  userId: string,
  data: { name: string; description?: string; color?: string }
) {
  return Epic.create({ projectId, workspaceId, createdBy: userId, ...data });
}

export async function listEpics(projectId: string) {
  return Epic.find({ projectId }).sort({ createdAt: -1 });
}

export async function updateEpic(
  epicId: string,
  updates: { name?: string; description?: string; color?: string; status?: 'open' | 'closed' }
) {
  const epic = await Epic.findByIdAndUpdate(epicId, updates, { new: true });
  if (!epic) throw ApiError.notFound('Epic not found');
  return epic;
}

export async function deleteEpic(epicId: string) {
  const epic = await Epic.findByIdAndDelete(epicId);
  if (!epic) throw ApiError.notFound('Epic not found');
}
