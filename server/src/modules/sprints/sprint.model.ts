import { Schema, model, Document, Types } from 'mongoose';

export type SprintStatus = 'planned' | 'active' | 'completed';

export interface ISprint extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  workspaceId: Types.ObjectId;
  name: string;
  goal?: string;
  status: SprintStatus;
  startDate?: Date;
  endDate?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const sprintSchema = new Schema<ISprint>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  goal: { type: String, maxlength: 500 },
  status: { type: String, enum: ['planned', 'active', 'completed'], default: 'planned' },
  startDate: { type: Date },
  endDate: { type: Date },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Sprint = model<ISprint>('Sprint', sprintSchema);
