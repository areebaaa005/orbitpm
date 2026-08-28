import { Schema, model, Document, Types } from 'mongoose';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskType = 'task' | 'bug' | 'story' | 'spike';

export interface ITaskLabel {
  name: string;
  color: string;
}

export interface IAttachment {
  _id: Types.ObjectId;
  url: string;
  publicId: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedBy: Types.ObjectId;
  uploadedAt: Date;
}

export interface IChecklistItem {
  _id: Types.ObjectId;
  text: string;
  done: boolean;
}

export interface ITask extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  projectId: Types.ObjectId;
  columnId: Types.ObjectId;
  epicId?: Types.ObjectId;
  sprintId?: Types.ObjectId;
  title: string;
  description?: string;
  assigneeIds: Types.ObjectId[];
  reporterId: Types.ObjectId;
  priority: TaskPriority;
  type: TaskType;
  storyPoints?: number;
  labels: ITaskLabel[];
  checklist: IChecklistItem[];
  attachments: IAttachment[];
  dueDate?: Date;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<IAttachment>({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  filename: { type: String, required: true },
  size: { type: Number, required: true },
  mimeType: { type: String, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const checklistItemSchema = new Schema<IChecklistItem>({
  text: { type: String, required: true, trim: true, maxlength: 200 },
  done: { type: Boolean, default: false },
});

const taskLabelSchema = new Schema<ITaskLabel>(
  {
    name: { type: String, required: true, trim: true, maxlength: 30 },
    color: { type: String, required: true },
  },
  { _id: false }
);

const taskSchema = new Schema<ITask>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    columnId: { type: Schema.Types.ObjectId, ref: 'Column', required: true, index: true },
    epicId: { type: Schema.Types.ObjectId, ref: 'Epic', index: true },
    sprintId: { type: Schema.Types.ObjectId, ref: 'Sprint', index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 5000 },
    assigneeIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    type: { type: String, enum: ['task', 'bug', 'story', 'spike'], default: 'task' },
    storyPoints: { type: Number, min: 0, max: 100 },
    labels: [taskLabelSchema],
    checklist: [checklistItemSchema],
    attachments: [attachmentSchema],
    dueDate: { type: Date },
    order: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

taskSchema.index({ projectId: 1, columnId: 1, order: 1 });
taskSchema.index({ assigneeIds: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ epicId: 1 });
taskSchema.index({ sprintId: 1 });
taskSchema.index({ title: 'text', description: 'text' });

export const Task = model<ITask>('Task', taskSchema);
