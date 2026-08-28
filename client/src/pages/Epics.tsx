import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useProject,
  useEpics,
  useCreateEpic,
  useDeleteEpic,
  useTasks,
  useMyRole,
} from '../hooks/useWorkspaceData';
import { AppLayout } from '../components/AppLayout';

const EPIC_COLORS = ['#5B5FEF', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function Epics() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId);
  const { data: myRole } = useMyRole(project?.workspaceId);
  const { data: epics } = useEpics(projectId);
  const { data: tasks } = useTasks(projectId);
  const createEpic = useCreateEpic(projectId);
  const deleteEpic = useDeleteEpic(projectId);

  const [name, setName] = useState('');
  const [color, setColor] = useState(EPIC_COLORS[0]);
  const canManage = myRole === 'owner' || myRole === 'admin' || myRole === 'pm';

  async function handleCreate() {
    if (!name.trim()) return;
    await createEpic.mutateAsync({ name: name.trim(), color });
    setName('');
  }

  return (
    <AppLayout workspaceId={project?.workspaceId}>
      <div className="mx-auto max-w-3xl px-8 py-10">
        <div className="flex items-center gap-2 text-sm text-ink-400">
          <Link to={`/projects/${projectId}`} className="hover:text-ink-600">
            {project?.name}
          </Link>
          <span>/</span>
          <span className="text-ink-900">Epics</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-ink-900">Epics</h1>
        <p className="mt-1 text-sm text-ink-600">
          Group related tasks under a larger initiative or feature.
        </p>

        {canManage && (
          <div className="mt-6 card flex items-center gap-2 p-4">
            <input
              className="input-field flex-1"
              placeholder="New epic name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <div className="flex gap-1">
              {EPIC_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full ${color === c ? 'ring-2 ring-offset-1 ring-ink-900' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button onClick={handleCreate} className="btn-primary">
              Create
            </button>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AnimatePresence>
            {epics?.map((epic) => {
              const taskCount = tasks?.filter((t) => t.epicId === epic._id).length || 0;
              return (
                <motion.div
                  key={epic._id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="card flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: epic.color }} />
                    <div>
                      <p className="text-sm font-medium text-ink-900">{epic.name}</p>
                      <p className="text-xs text-ink-500">{taskCount} task{taskCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => deleteEpic.mutate(epic._id)}
                      className="text-ink-300 hover:text-red-500"
                      aria-label="Delete epic"
                    >
                      ✕
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {epics?.length === 0 && (
            <p className="text-sm text-ink-400">No epics yet. Create one above to get started.</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
