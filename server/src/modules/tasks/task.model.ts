import { Schema, model, Document, Types } from 'mongoose';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ITask extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  projectId: Types.ObjectId;
  columnId: Types.ObjectId;
  title: string;
  description?: string;
  assigneeIds: Types.ObjectId[];
  reporterId: Types.ObjectId;
  priority: TaskPriority;
  labels: string[];
  dueDate?: Date;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    columnId: { type: Schema.Types.ObjectId, ref: 'Column', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 5000 },
    assigneeIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    labels: [{ type: String, trim: true, maxlength: 30 }],
    dueDate: { type: Date },
    order: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

taskSchema.index({ projectId: 1, columnId: 1, order: 1 });
taskSchema.index({ assigneeIds: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ title: 'text', description: 'text' });

export const Task = model<ITask>('Task', taskSchema);
