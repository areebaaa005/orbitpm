import { Schema, model, Document, Types } from 'mongoose';

export interface IColumn extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  name: string;
  order: number;
  color?: string;
  createdAt: Date;
}

const columnSchema = new Schema<IColumn>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 50 },
  order: { type: Number, required: true },
  color: { type: String, default: '#6366f1' },
  createdAt: { type: Date, default: Date.now },
});

columnSchema.index({ projectId: 1, order: 1 });

export const Column = model<IColumn>('Column', columnSchema);

// Default columns created automatically whenever a new project is made
export const DEFAULT_COLUMNS = [
  { name: 'Backlog', order: 0, color: '#94a3b8' },
  { name: 'To Do', order: 1, color: '#60a5fa' },
  { name: 'In Progress', order: 2, color: '#fbbf24' },
  { name: 'Done', order: 3, color: '#34d399' },
];
