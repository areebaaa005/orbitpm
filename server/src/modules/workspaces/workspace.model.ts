import { Schema, model, Document, Types } from 'mongoose';

export interface IWorkspace extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  ownerId: Types.ObjectId;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const workspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    settings: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const Workspace = model<IWorkspace>('Workspace', workspaceSchema);
