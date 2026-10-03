import { Router, Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { requireAuth } from '../../middleware/auth';
import { requireWorkspaceMember, requireMinRole } from '../../middleware/rbac';
import { ApiError } from '../../utils/ApiError';
import { isObjectId } from '../../utils/objectId';
import * as auditService from './audit.service';

const router = Router({ mergeParams: true });
router.use(requireAuth, requireWorkspaceMember(), requireMinRole('admin'));

const first = (v: unknown) => (typeof v === 'string' ? v : undefined);

/** Accepts YYYY-MM-DD or a full ISO date. A bare date as `to` means "through the end of that day". */
function parseDate(value: unknown, endOfDay = false): Date | undefined {
  const raw = first(value);
  if (!raw) return undefined;
  const d = new Date(raw);
  if (isNaN(d.getTime())) throw ApiError.badRequest('INVALID_DATE', `Invalid date: ${raw}`);
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(raw)) d.setUTCHours(23, 59, 59, 999);
  return d;
}

function parseFilters(req: Request) {
  const actorId = first(req.query.actorId);
  if (actorId && !isObjectId(actorId)) throw ApiError.badRequest('INVALID_ID', 'Invalid actor id');
  return {
    action: first(req.query.action),
    actorId,
    from: parseDate(req.query.from),
    to: parseDate(req.query.to, true),
  };
}

router.get(
  '/',
  catchAsync(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(first(req.query.page) || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(first(req.query.limit) || '25', 10) || 25));
    const result = await auditService.listAuditLogs(req.params.workspaceId, { ...parseFilters(req), page, limit });
    res.status(200).json({ success: true, data: result });
  })
);

router.get(
  '/export',
  catchAsync(async (req: Request, res: Response) => {
    const filters = parseFilters(req);
    const { csv, count } = await auditService.buildAuditCsv(req.params.workspaceId, filters);
    // Exporting the audit trail is itself something worth auditing.
    await auditService.recordAudit(req, {
      workspaceId: req.params.workspaceId,
      action: 'audit_log.exported',
      targetType: 'audit_log',
      metadata: { rows: count, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) },
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-log.csv"');
    res.status(200).send('\ufeff' + csv);
  })
);

export default router;
