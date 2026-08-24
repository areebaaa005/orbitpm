import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType =
  | 'task_assigned'
  | 'mention'
  | 'due_soon'
  | 'invitation'
  | 'task_status_changed';

export interface INotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  workspaceId: Types.ObjectId;
  taskId?: Types.ObjectId;
  actorId?: Types.ObjectId;
  message: string;
  readAt?: Date | null;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['task_assigned', 'mention', 'due_soon', 'invitation', 'task_status_changed'],
    required: true,
  },
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
  taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
  actorId: { type: Schema.Types.ObjectId, ref: 'User' },
  message: { type: String, required: true, maxlength: 500 },
  readAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
});

notificationSchema.index({ userId: 1, readAt: 1 });

export const Notification = model<INotification>('Notification', notificationSchema);
