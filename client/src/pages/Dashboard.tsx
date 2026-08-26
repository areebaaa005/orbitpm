import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppLayout } from '../components/AppLayout';
import {
  useWorkspaces,
  useCreateWorkspace,
  useProjects,
  useCreateProject,
} from '../hooks/useWorkspaceData';

export default function Dashboard() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

  const activeWorkspace = workspaces?.find((w) => w.workspace._id === activeWorkspaceId);

  async function handleCreateWorkspace() {
    if (!newWorkspaceName.trim()) return;
    const workspace = await createWorkspace.mutateAsync(newWorkspaceName.trim());
    setNewWorkspaceName('');
    setActiveWorkspaceId(workspace._id);
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl px-8 py-10">
        <h1 className="text-2xl font-semibold text-ink-900">Your workspaces</h1>
        <p className="mt-1 text-sm text-ink-600">
          A workspace is where your team, projects, and boards live together.
        </p>

        {isLoading && <p className="mt-6 text-sm text-ink-400">Loading…</p>}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces?.map((m) => (
            <button
              key={m.workspace._id}
              onClick={() => setActiveWorkspaceId(m.workspace._id)}
              className={`card flex flex-col items-start p-4 text-left transition hover:border-orbit-300 ${
                activeWorkspaceId === m.workspace._id ? 'border-orbit-500 ring-1 ring-orbit-500' : ''
              }`}
            >
              <span className="font-medium text-ink-900">{m.workspace.name}</span>
              <span className="mt-1 rounded-full bg-orbit-50 px-2 py-0.5 text-xs font-medium capitalize text-orbit-700">
                {m.role}
              </span>
            </button>
          ))}

          <div className="card flex flex-col gap-2 p-4">
            <input
              className="input-field"
              placeholder="New workspace name"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
            />
            <button
              onClick={handleCreateWorkspace}
              disabled={createWorkspace.isPending}
              className="btn-primary"
            >
              {createWorkspace.isPending ? 'Creating…' : 'Create workspace'}
            </button>
          </div>
        </div>

        {activeWorkspace && (
          <ProjectsSection workspaceId={activeWorkspace.workspace._id} />
        )}
      </div>
    </AppLayout>
  );
}

const PROJECT_COLORS = ['#5B5FEF', '#F59E0B', '#10B981', '#EF4444', '#06B6D4', '#8B5CF6', '#EC4899', '#84CC16'];

function ProjectsSection({ workspaceId }: { workspaceId: string }) {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects(workspaceId);
  const createProject = useCreateProject(workspaceId);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [showForm, setShowForm] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !key.trim()) return;
    const project = await createProject.mutateAsync({ name: name.trim(), key: key.trim(), color });
    setName('');
    setKey('');
    setShowForm(false);
    navigate(`/projects/${project._id}`);
  }

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink-900">Projects</h2>
        <button onClick={() => setShowForm((s) => !s)} className="btn-secondary text-xs">
          {showForm ? 'Cancel' : '+ New project'}
        </button>
      </div>

      {showForm && (
        <div className="card mt-3 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-ink-600">Project name</label>
            <input
              className="input-field"
              placeholder="Website Redesign"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="w-32">
            <label className="mb-1 block text-xs font-medium text-ink-600">Key</label>
            <input
              className="input-field uppercase"
              placeholder="WEB"
              maxLength={10}
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
            />
          </div>
          <button onClick={handleCreate} disabled={createProject.isPending} className="btn-primary">
            Create
          </button>
        </div>
      )}

      {showForm && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs font-medium text-ink-600">Color:</span>
          {PROJECT_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-6 w-6 rounded-full transition ${color === c ? 'ring-2 ring-offset-2 ring-ink-900' : ''}`}
              style={{ backgroundColor: c }}
              aria-label={`Select color ${c}`}
            />
          ))}
        </div>
      )}

      {isLoading && <p className="mt-4 text-sm text-ink-400">Loading projects…</p>}

      {projects && projects.length === 0 && !showForm && (
        <p className="mt-4 text-sm text-ink-400">
          No projects yet. Create one to start building your board.
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {projects?.map((p) => (
          <motion.button
            key={p._id}
            onClick={() => navigate(`/projects/${p._id}`)}
            whileHover={{ y: -3, boxShadow: '0 8px 20px rgba(15,20,36,0.08)' }}
            transition={{ duration: 0.15 }}
            className="card flex flex-col items-start overflow-hidden p-4 text-left"
            style={{ borderLeft: `4px solid ${p.color || '#5B5FEF'}` }}
          >
            <span
              className="rounded px-1.5 py-0.5 font-mono text-xs font-semibold text-white"
              style={{ backgroundColor: p.color || '#5B5FEF' }}
            >
              {p.key}
            </span>
            <span className="mt-2 font-medium text-ink-900">{p.name}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
