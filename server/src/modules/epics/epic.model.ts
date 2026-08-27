import { Schema, model, Document, Types } from 'mongoose';

export interface IEpic extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  workspaceId: Types.ObjectId;
  name: string;
  description?: string;
  color: string;
  status: 'open' | 'closed';
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const EPIC_COLORS = ['#5B5FEF', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#06B6D4'];

const epicSchema = new Schema<IEpic>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, maxlength: 2000 },
  color: {
    type: String,
    default: () => EPIC_COLORS[Math.floor(Math.random() * EPIC_COLORS.length)],
  },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Epic = model<IEpic>('Epic', epicSchema);
