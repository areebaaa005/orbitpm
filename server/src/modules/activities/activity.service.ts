import { Activity, ActivityAction } from './activity.model';

export async function logActivity(input: {
  workspaceId: string;
  projectId?: string;
  taskId?: string;
  actorId: string;
  action: ActivityAction;
  metadata?: Record<string, unknown>;
}) {
  return Activity.create({
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    taskId: input.taskId,
    actorId: input.actorId,
    action: input.action,
    metadata: input.metadata || {},
  });
}

export async function listProjectActivity(projectId: string, limit = 50) {
  return Activity.find({ projectId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('actorId', 'name avatar');
}

export async function listTaskActivity(taskId: string) {
  return Activity.find({ taskId }).sort({ createdAt: 1 }).populate('actorId', 'name avatar');
}
