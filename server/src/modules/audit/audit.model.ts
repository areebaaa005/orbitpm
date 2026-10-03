import { Schema, model, Document, Types } from 'mongoose';

export const AUDIT_ACTIONS = [
  'workspace.created',
  'workspace.renamed',
  'workspace.deleted',
  'member.invited',
  'member.joined',
  'member.role_changed',
  'member.removed',
  'project.created',
  'project.updated',
  'project.deleted',
  'column.deleted',
  'audit_log.exported',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  actorId: Types.ObjectId;
  action: AuditAction;
  targetType: 'workspace' | 'member' | 'invitation' | 'project' | 'column' | 'audit_log';
  targetId?: string;
  /** Human-readable snapshot (e.g. the project name) so the entry still makes sense after the target is deleted. */
  targetLabel?: string;
  metadata: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    targetType: { type: String, required: true },
    targetId: { type: String },
    targetLabel: { type: String, maxlength: 200 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String },
    userAgent: { type: String, maxlength: 300 },
    createdAt: { type: Date, default: Date.now },
  },
  {
    // Mongoose drops empty objects by default, which would make `metadata` disappear for events with no extra details.
    minimize: false,
    toJSON: {
      // Entries saved before minimize was turned off have no metadata field: always send one to clients.
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.metadata = ret.metadata ?? {};
        return ret;
      },
    },
  }
);

// Newest-first listing per workspace, optionally filtered by action/actor
auditLogSchema.index({ workspaceId: 1, createdAt: -1 });
auditLogSchema.index({ workspaceId: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ workspaceId: 1, actorId: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
