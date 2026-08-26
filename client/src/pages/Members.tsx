import { useState, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLayout } from '../components/AppLayout';
import {
  useMyRole,
  useMembers,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
  useUpdateWorkspace,
} from '../hooks/useWorkspaceData';
import { WorkspaceRole } from '../types';
import { useAuth } from '../context/AuthContext';

const ASSIGNABLE_ROLES: WorkspaceRole[] = ['admin', 'pm', 'member', 'viewer'];

const ROLE_STYLES: Record<WorkspaceRole, string> = {
  owner: 'bg-amber-50 text-amber-700',
  admin: 'bg-orbit-50 text-orbit-700',
  pm: 'bg-blue-50 text-blue-700',
  member: 'bg-gray-100 text-gray-700',
  viewer: 'bg-gray-100 text-gray-500',
};

export default function Members() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuth();
  const { data: myRole } = useMyRole(workspaceId);
  const { data: members, isLoading } = useMembers(workspaceId);
  const inviteMember = useInviteMember(workspaceId);
  const updateRole = useUpdateMemberRole(workspaceId);
  const removeMember = useRemoveMember(workspaceId);
  const updateWorkspace = useUpdateWorkspace(workspaceId);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('member');
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const canManage = myRole === 'owner' || myRole === 'admin';

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviteResult(null);
    try {
      const invitation = await inviteMember.mutateAsync({ email: inviteEmail, role: inviteRole });
      setInviteResult(invitation.token);
      setInviteEmail('');
    } catch (err: any) {
      setInviteError(err?.response?.data?.error?.message || 'Could not send invitation');
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-8 py-10">
        <Link to="/" className="text-sm text-ink-400 hover:text-ink-600">
          ← Workspaces
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink-900">Members</h1>
        <p className="mt-1 text-sm text-ink-600">
          Manage who has access to this workspace and what they can do.
        </p>

        {!canManage && (
          <p className="mt-4 rounded-lg bg-gray-100 px-3 py-2 text-sm text-ink-600">
            You're viewing this page with read access. Only Owners and Admins can invite or manage members.
          </p>
        )}

        {canManage && (
          <div className="card mt-6 p-5">
            <h2 className="text-sm font-semibold text-ink-900">Invite a member</h2>
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
            {inviteError && <p className="mt-2 text-sm text-red-600">{inviteError}</p>}
            {inviteResult && (
              <p className="mt-2 text-xs text-ink-500">
                Invitation created for the <strong>{inviteRole}</strong> role. Since there's no
                email provider configured yet, copy this token and send it to your teammate —
                they can paste it under "Have an invite?" on their Dashboard after logging in:{' '}
                <code className="rounded bg-gray-100 px-1 py-0.5">{inviteResult}</code>
              </p>
            )}
          </div>
        )}

        <div className="card mt-6 divide-y divide-gray-100">
          {isLoading && <p className="px-5 py-4 text-sm text-ink-400">Loading members…</p>}
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
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-orbit-100 text-sm font-semibold text-orbit-700">
                    {m.userId.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">
                      {m.userId.name} {m.userId._id === user?.id && '(you)'}
                    </p>
                    <p className="truncate text-xs text-ink-500">{m.userId.email}</p>
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
                      className="rounded-full p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
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
          <WorkspaceSettings
            onRename={(name) => updateWorkspace.mutate(name)}
            isSaving={updateWorkspace.isPending}
          />
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
      <h2 className="text-sm font-semibold text-ink-900">Workspace settings</h2>
      <p className="mt-1 text-xs text-ink-500">Only visible to the workspace Owner.</p>
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
