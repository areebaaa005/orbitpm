import { Schema, model, Document, Types } from 'mongoose';

export interface IProject extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  name: string;
  key: string;
  description?: string;
  status: 'active' | 'archived';
  color: string;
  members: Types.ObjectId[];
  startDate?: Date;
  endDate?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PROJECT_COLORS = ['#5B5FEF', '#F59E0B', '#10B981', '#EF4444', '#06B6D4', '#8B5CF6', '#EC4899', '#84CC16'];

const projectSchema = new Schema<IProject>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    key: { type: String, required: true, uppercase: true, trim: true, maxlength: 10 },
    description: { type: String, maxlength: 2000 },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    color: {
      type: String,
      default: () => PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
    },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    startDate: { type: Date },
    endDate: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

projectSchema.index({ workspaceId: 1, key: 1 }, { unique: true });

export const Project = model<IProject>('Project', projectSchema);
