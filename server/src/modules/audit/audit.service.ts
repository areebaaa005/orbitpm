import { Request } from 'express';
import { Types } from 'mongoose';
import { AuditLog, AuditAction, IAuditLog, AUDIT_ACTIONS } from './audit.model';
import { User } from '../users/user.model';

interface RecordInput {
  workspaceId: string;
  action: AuditAction;
  targetType: IAuditLog['targetType'];
  targetId?: string;
  targetLabel?: string;
  metadata?: Record<string, unknown>;
  /** Defaults to the signed-in user of the request. */
  actorId?: string;
}

/**
 * Records an audit entry. It never throws: a failure to write the audit trail is logged
 * but must not turn a successful admin action into an error for the user.
 */
export async function recordAudit(req: Request, input: RecordInput) {
  try {
    const actorId = input.actorId ?? req.userId;
    if (!actorId) return;
    await AuditLog.create({
      workspaceId: input.workspaceId,
      actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      targetLabel: input.targetLabel?.slice(0, 200),
      metadata: input.metadata ?? {},
      ip: req.ip,
      userAgent: req.get('user-agent')?.slice(0, 300),
    });
  } catch (err) {
    console.error('[audit] failed to record entry', err);
  }
}

/** Email of a user, used as a readable label for member events. */
export async function userEmail(userId: string): Promise<string | undefined> {
  const user = await User.findById(userId).select('email');
  return user?.email;
}

export interface AuditQuery {
  action?: string;
  actorId?: string;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}

function buildFilter(workspaceId: string, q: Pick<AuditQuery, 'action' | 'actorId' | 'from' | 'to'>) {
  const filter: Record<string, unknown> = { workspaceId: new Types.ObjectId(workspaceId) };
  if (q.action && (AUDIT_ACTIONS as readonly string[]).includes(q.action)) filter.action = q.action;
  if (q.actorId) filter.actorId = new Types.ObjectId(q.actorId);
  if (q.from || q.to) {
    filter.createdAt = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) };
  }
  return filter;
}

export async function listAuditLogs(workspaceId: string, q: AuditQuery) {
  const filter = buildFilter(workspaceId, q);
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate('actorId', 'name email avatar'),
    AuditLog.countDocuments(filter),
  ]);
  return { logs, total, page: q.page, limit: q.limit };
}

export const EXPORT_LIMIT = 5000;

/** CSV cell: quoted, and neutralised against spreadsheet formula injection (=, +, -, @). */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function buildAuditCsv(workspaceId: string, q: Omit<AuditQuery, 'page' | 'limit'>) {
  const logs = await AuditLog.find(buildFilter(workspaceId, q))
    .sort({ createdAt: -1 })
    .limit(EXPORT_LIMIT)
    .populate('actorId', 'name email');

  const header = ['Time (UTC)', 'Actor', 'Actor email', 'Action', 'Target type', 'Target', 'Details', 'IP address'];
  const rows = logs.map((l) => {
    const actor = l.actorId as unknown as { name?: string; email?: string } | null;
    return [
      l.createdAt.toISOString(),
      actor?.name ?? 'Deleted user',
      actor?.email ?? '',
      l.action,
      l.targetType,
      l.targetLabel ?? '',
      Object.keys(l.metadata ?? {}).length ? JSON.stringify(l.metadata) : '',
      l.ip ?? '',
    ].map(csvCell).join(',');
  });
  return { csv: [header.map(csvCell).join(','), ...rows].join('\r\n') + '\r\n', count: logs.length };
}
