import { Schema, model, Document, Types } from 'mongoose';

export type ActivityAction =
  | 'task_created'
  | 'task_moved'
  | 'task_updated'
  | 'task_assigned'
  | 'task_commented'
  | 'project_created';

export interface IActivity extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  projectId?: Types.ObjectId;
  taskId?: Types.ObjectId;
  actorId: Types.ObjectId;
  action: ActivityAction;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const activitySchema = new Schema<IActivity>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  taskId: { type: Schema.Types.ObjectId, ref: 'Task', index: true },
  actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: {
    type: String,
    enum: [
      'task_created',
      'task_moved',
      'task_updated',
      'task_assigned',
      'task_commented',
      'project_created',
    ],
    required: true,
  },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true },
});

export const Activity = model<IActivity>('Activity', activitySchema);
