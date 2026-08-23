import { Schema, model, Document, Types } from 'mongoose';

export interface IProject extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  name: string;
  key: string;
  description?: string;
  status: 'active' | 'archived';
  members: Types.ObjectId[];
  startDate?: Date;
  endDate?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    key: { type: String, required: true, uppercase: true, trim: true, maxlength: 10 },
    description: { type: String, maxlength: 2000 },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    startDate: { type: Date },
    endDate: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

projectSchema.index({ workspaceId: 1, key: 1 }, { unique: true });

export const Project = model<IProject>('Project', projectSchema);
