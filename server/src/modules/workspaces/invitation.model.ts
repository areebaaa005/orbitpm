import { Schema, model, Document, Types } from 'mongoose';
import { WorkspaceRole, WORKSPACE_ROLES } from './membership.model';

export interface IInvitation extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  email: string;
  role: WorkspaceRole;
  token: string;
  invitedBy: Types.ObjectId;
  expiresAt: Date;
  acceptedAt?: Date | null;
  createdAt: Date;
}

const invitationSchema = new Schema<IInvitation>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  // Owner role can never be granted via invitation — only via ownership transfer
  role: { type: String, enum: WORKSPACE_ROLES.filter((r) => r !== 'owner'), required: true },
  token: { type: String, required: true, unique: true },
  invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
  acceptedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

export const Invitation = model<IInvitation>('Invitation', invitationSchema);
