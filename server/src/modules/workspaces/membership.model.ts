import { Schema, model, Document, Types } from 'mongoose';

export type WorkspaceRole = 'owner' | 'admin' | 'pm' | 'member' | 'viewer';

export const WORKSPACE_ROLES: WorkspaceRole[] = ['owner', 'admin', 'pm', 'member', 'viewer'];

// Higher number = more powerful. Used for permission checks and to stop
// ordinary members from demoting/removing an Owner.
export const ROLE_RANK: Record<WorkspaceRole, number> = {
  owner: 5,
  admin: 4,
  pm: 3,
  member: 2,
  viewer: 1,
};

export interface IMembership extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  role: WorkspaceRole;
  joinedAt: Date;
}

const membershipSchema = new Schema<IMembership>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, enum: WORKSPACE_ROLES, required: true, default: 'member' },
  joinedAt: { type: Date, default: Date.now },
});

// A user can only have one membership (one role) per workspace
membershipSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

export const Membership = model<IMembership>('Membership', membershipSchema);
