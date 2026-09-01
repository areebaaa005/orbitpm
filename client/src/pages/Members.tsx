import { useState, FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLayout } from '../components/AppLayout';
import {
  useMyRole,
  useMembers,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
  useUpdateWorkspace,
  useDeleteWorkspace,
} from '../hooks/useWorkspaceData';
import { WorkspaceRole } from '../types';
import { useAuth } from '../context/AuthContext';

const ASSIGNABLE_ROLES: WorkspaceRole[] = ['admin', 'pm', 'member', 'viewer'];

const ROLE_STYLES: Record<WorkspaceRole, string> = {
  owner: 'bg-amber-500/10 text-amber-400',
  admin: 'bg-orbit-500/10 text-orbit-300',
  pm: 'bg-blue-500/10 text-blue-400',
  member: 'bg-space-800 text-gray-700',
  viewer: 'bg-space-800 text-gray-500',
};

export default function Members() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: myRole } = useMyRole(workspaceId);
  const { data: members, isLoading } = useMembers(workspaceId);
  const inviteMember = useInviteMember(workspaceId);
  const updateRole = useUpdateMemberRole(workspaceId);
  const removeMember = useRemoveMember(workspaceId);
  const updateWorkspace = useUpdateWorkspace(workspaceId);
  const deleteWorkspace = useDeleteWorkspace();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('member');
  const [inviteResult, setInviteResult] = useState<{ emailSent: boolean; link: string } | null>(
    null
  );
  const [inviteError, setInviteError] = useState<string | null>(null);

  const canManage = myRole === 'owner' || myRole === 'admin';

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviteResult(null);
    try {
      const invitation = await inviteMember.mutateAsync({ email: inviteEmail, role: inviteRole });
      setInviteResult({
        emailSent: invitation.emailSent,
        link: `${window.location.origin}/accept-invite?token=${invitation.token}`,
      });
      setInviteEmail('');
    } catch (err: any) {
      setInviteError(err?.response?.data?.error?.message || 'Could not send invitation');
    }
  }

  return (
    <AppLayout workspaceId={workspaceId}>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-400">
          ← Workspaces
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-gray-100">Members</h1>
        <p className="mt-1 text-sm text-gray-400">
          Manage who has access to this workspace and what they can do.
        </p>

        {!canManage && (
          <p className="mt-4 rounded-lg bg-space-800 px-3 py-2 text-sm text-gray-400">
            You're viewing this page with read access. Only Owners and Admins can invite or manage members.
          </p>
        )}

        {canManage && (
          <div className="card mt-6 p-5">
            <h2 className="text-sm font-semibold text-gray-100">Invite a member</h2>
            <form onSubmit={handleInvite} className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                placeholder="teammate@example.com"
                className="input-field flex-1"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <select
                className="input-field sm:w-36"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r} className="capitalize">
                    {r}
                  </option>
                ))}
              </select>
              <button type="submit" disabled={inviteMember.isPending} className="btn-primary">
                {inviteMember.isPending ? 'Sending…' : 'Invite'}
              </button>
            </form>
            {inviteError && <p className="mt-2 text-sm text-red-400">{inviteError}</p>}
            {inviteResult && (
              <div className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2.5">
                {inviteResult.emailSent ? (
                  <p className="text-sm text-emerald-400">
                    ✓ Invitation email sent — they'll get a link to join with the{' '}
                    <strong>{inviteRole}</strong> role.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-amber-400">
                      Invitation created, but email delivery isn't configured yet.
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Share this link with your teammate instead:{' '}
                      <a href={inviteResult.link} className="break-all text-orbit-600 underline">
                        {inviteResult.link}
                      </a>
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <div className="card mt-6 divide-y divide-space-800">
          {isLoading && <p className="px-5 py-4 text-sm text-gray-500">Loading members…</p>}
          <AnimatePresence>
            {members?.map((m) => (
              <motion.div
                key={m.userId._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-orbit-100 text-sm font-semibold text-orbit-300">
                    {m.userId.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-100">
                      {m.userId.name} {m.userId._id === user?.id && '(you)'}
                    </p>
                    <p className="truncate text-xs text-gray-500">{m.userId.email}</p>
                  </div>
                </div>

                <div className="flex flex-shrink-0 items-center gap-2">
                  {canManage && m.role !== 'owner' ? (
                    <select
                      className={`rounded-full border-0 px-3 py-1 text-xs font-medium capitalize ${ROLE_STYLES[m.role]}`}
                      value={m.role}
                      onChange={(e) =>
                        updateRole.mutate({
                          userId: m.userId._id,
                          role: e.target.value as WorkspaceRole,
                        })
                      }
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${ROLE_STYLES[m.role]}`}
                    >
                      {m.role}
                    </span>
                  )}

                  {canManage && m.role !== 'owner' && (
                    <button
                      onClick={() => removeMember.mutate(m.userId._id)}
                      className="rounded-full p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400"
                      aria-label="Remove member"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {myRole === 'owner' && (
          <>
            <WorkspaceSettings
              onRename={(name) => updateWorkspace.mutate(name)}
              isSaving={updateWorkspace.isPending}
            />
            <DangerZone
              onDelete={async () => {
                if (!workspaceId) return;
                await deleteWorkspace.mutateAsync(workspaceId);
                navigate('/');
              }}
              isDeleting={deleteWorkspace.isPending}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}

function WorkspaceSettings({
  onRename,
  isSaving,
}: {
  onRename: (name: string) => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState('');

  return (
    <div className="card mt-6 p-5">
      <h2 className="text-sm font-semibold text-gray-100">Workspace settings</h2>
      <p className="mt-1 text-xs text-gray-500">Only visible to the workspace Owner.</p>
      <div className="mt-3 flex gap-2">
        <input
          className="input-field flex-1"
          placeholder="Rename workspace…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          onClick={() => name.trim() && onRename(name.trim())}
          disabled={isSaving || !name.trim()}
          className="btn-secondary"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function DangerZone({
  onDelete,
  isDeleting,
}: {
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const canConfirm = confirmText.trim().toUpperCase() === 'DELETE';

  return (
    <div className="mt-6 rounded-xl2 border border-red-500/30 bg-red-500/5 p-5">
      <h2 className="text-sm font-semibold text-red-400">Danger zone</h2>
      <p className="mt-1 text-xs text-gray-500">
        Permanently deletes this workspace and everything in it — all projects, tasks, comments,
        and members. This cannot be undone.
      </p>

      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="mt-3 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10"
        >
          Delete this workspace
        </button>
      ) : (
        <div className="mt-3">
          <p className="mb-1.5 text-xs text-gray-400">
            Type <strong className="text-red-400">DELETE</strong> to confirm:
          </p>
          <div className="flex gap-2">
            <input
              className="input-field flex-1 text-sm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
            />
            <button
              onClick={onDelete}
              disabled={!canConfirm || isDeleting}
              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-40"
            >
              {isDeleting ? 'Deleting…' : 'Confirm delete'}
            </button>
            <button
              onClick={() => {
                setExpanded(false);
                setConfirmText('');
              }}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
