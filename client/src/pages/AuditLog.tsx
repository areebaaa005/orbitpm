import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ScrollText, Download, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';
import { AppLayout } from '../components/AppLayout';
import { EmptyState } from '../components/EmptyState';
import { RowsSkeleton } from '../components/Skeleton';
import { toast, getErrorMessage } from '../components/Toast';
import {
  useAuditLogs,
  useMembers,
  useMyRole,
  downloadAuditCsv,
  type AuditEntry,
  type AuditFilters,
} from '../hooks/useWorkspaceData';

const ACTIONS: Record<string, string> = {
  'workspace.created': 'Created workspace',
  'workspace.renamed': 'Renamed workspace',
  'workspace.deleted': 'Deleted workspace',
  'member.invited': 'Invited member',
  'member.joined': 'Member joined',
  'member.role_changed': 'Changed member role',
  'member.removed': 'Removed member',
  'project.created': 'Created project',
  'project.updated': 'Updated project',
  'project.deleted': 'Deleted project',
  'column.deleted': 'Deleted column',
  'audit_log.exported': 'Exported audit log',
};

const TONE: Record<string, string> = {
  deleted: 'bg-red-100 text-red-800',
  removed: 'bg-red-100 text-red-800',
  created: 'bg-emerald-50 text-emerald-700',
  joined: 'bg-emerald-50 text-emerald-700',
  invited: 'bg-blue-100 text-blue-800',
};
const tone = (action: string) => TONE[action.split('.')[1]] || 'bg-space-800 text-space-200';

function details(e: AuditEntry): string {
  const m = (e.metadata ?? {}) as Record<string, any>;
  if (m.from !== undefined && m.to !== undefined) return `${m.from ?? '—'} → ${m.to}`;
  if (e.action === 'member.invited' && m.role) return `as ${m.role}`;
  if (e.action === 'project.updated' && Array.isArray(m.fields)) return `changed ${m.fields.join(', ')}`;
  if (e.action === 'column.deleted' && m.project) return `in ${m.project}`;
  if (e.action === 'audit_log.exported' && m.rows !== undefined) return `${m.rows} rows`;
  return '';
}

const EMPTY: AuditFilters = { action: '', actorId: '', from: '', to: '' };

export default function AuditLog() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: role, isLoading: roleLoading } = useMyRole(workspaceId);
  const isAdmin = role === 'owner' || role === 'admin';
  const [filters, setFilters] = useState<AuditFilters>(EMPTY);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const { data, isLoading, isError } = useAuditLogs(isAdmin ? workspaceId : undefined, filters, page);
  const { data: members } = useMembers(isAdmin ? workspaceId : undefined);

  const set = (patch: Partial<AuditFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const hasFilters = Object.values(filters).some(Boolean);

  async function exportCsv() {
    if (!workspaceId) return;
    setExporting(true);
    try {
      await downloadAuditCsv(workspaceId, filters);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not export the audit log.'));
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppLayout workspaceId={workspaceId}>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-space-50">Audit log</h1>
        <p className="mt-1 text-sm text-space-300">
          A record of administrative changes in this workspace: who did what, and when.
        </p>

        {!roleLoading && !isAdmin ? (
          <div className="mt-6">
            <EmptyState
              icon={ShieldAlert}
              title="Admins only"
              description="Only workspace owners and admins can view the audit log."
            />
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-end gap-3">
              <label className="text-xs text-space-300">
                Action
                <select className="input-field mt-1 block w-52" value={filters.action} onChange={(e) => set({ action: e.target.value })}>
                  <option value="">All actions</option>
                  {Object.entries(ACTIONS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-space-300">
                Actor
                <select className="input-field mt-1 block w-48" value={filters.actorId} onChange={(e) => set({ actorId: e.target.value })}>
                  <option value="">Anyone</option>
                  {members?.map((m) => (
                    <option key={m.userId._id} value={m.userId._id}>{m.userId.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-space-300">
                From
                <input type="date" className="input-field mt-1 block w-40" value={filters.from} max={filters.to || undefined} onChange={(e) => set({ from: e.target.value })} />
              </label>
              <label className="text-xs text-space-300">
                To
                <input type="date" className="input-field mt-1 block w-40" value={filters.to} min={filters.from || undefined} onChange={(e) => set({ to: e.target.value })} />
              </label>
              {hasFilters && (
                <button onClick={() => set(EMPTY)} className="pb-2 text-xs text-space-400 hover:text-space-50">
                  Clear filters
                </button>
              )}
              <button onClick={exportCsv} disabled={exporting} className="btn-secondary ml-auto gap-1.5 py-2 text-xs">
                <Download size={14} /> {exporting ? 'Exporting…' : 'Export CSV'}
              </button>
            </div>

            <div className="card mt-4 overflow-x-auto">
              {isLoading ? (
                <RowsSkeleton rows={5} />
              ) : isError ? (
                <p className="px-5 py-6 text-sm text-red-700">Could not load the audit log. Please try again.</p>
              ) : !data || data.logs.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={ScrollText}
                    title={hasFilters ? 'No matching entries' : 'Nothing recorded yet'}
                    description={hasFilters ? 'Try widening the filters.' : 'Changes like renaming a workspace, inviting members, or deleting a project will show up here.'}
                  />
                </div>
              ) : (
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-space-700 text-[11px] font-semibold uppercase tracking-wider text-space-400">
                      <th className="px-4 py-2.5">When</th>
                      <th className="px-4 py-2.5">Who</th>
                      <th className="px-4 py-2.5">Action</th>
                      <th className="px-4 py-2.5">Target</th>
                      <th className="px-4 py-2.5">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.logs.map((e) => (
                      <tr key={e._id} className="border-b border-space-700 last:border-b-0">
                        <td className="whitespace-nowrap px-4 py-3 text-space-300" title={e.ip ? `IP ${e.ip}` : undefined}>
                          {new Date(e.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        </td>
                        <td className="px-4 py-3 text-space-50">{e.actorId?.name ?? <span className="text-space-400">Deleted user</span>}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${tone(e.action)}`}>{ACTIONS[e.action] ?? e.action}</span>
                        </td>
                        <td className="px-4 py-3 text-space-100">{e.targetLabel || '—'}</td>
                        <td className="px-4 py-3 text-space-300">{details(e)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {data && data.total > 0 && (
              <div className="mt-3 flex items-center justify-between text-xs text-space-300">
                <span>{data.total} {data.total === 1 ? 'entry' : 'entries'}</span>
                <div className="flex items-center gap-2">
                  <button className="btn-secondary px-2 py-1" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
                    <ChevronLeft size={14} />
                  </button>
                  <span>Page {page} of {totalPages}</span>
                  <button className="btn-secondary px-2 py-1" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
