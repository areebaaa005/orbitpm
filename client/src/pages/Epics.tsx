import { useState } from 'react';
import { Zap, List, CalendarRange } from 'lucide-react';
import { EpicRoadmap } from '../components/EpicRoadmap';
import { EmptyState } from '../components/EmptyState';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useProject,
  useEpics,
  useCreateEpic,
  useDeleteEpic,
  useTasks,
  useColumns,
  useUpdateEpic,
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
  const updateEpic = useUpdateEpic(projectId);
  const { data: columns } = useColumns(projectId);
  const [view, setView] = useState<'list' | 'roadmap'>('list');
  const doneColumnIds = (columns || []).filter((c) => /^done$/i.test(c.name)).map((c) => c._id);

  const [name, setName] = useState('');
  const [color, setColor] = useState(EPIC_COLORS[0]);
  const canManage = myRole === 'owner' || myRole === 'admin' || myRole === 'pm';

  async function handleCreate() {
    if (!name.trim()) return;
    await createEpic.mutateAsync({ name: name.trim(), color });
    setName('');
  }

  return (
    <AppLayout workspaceId={project?.workspaceId} projectId={projectId}>
      <div className={`mx-auto px-4 py-10 sm:px-8 ${view === 'roadmap' ? 'max-w-6xl' : 'max-w-3xl'}`}>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link to={`/projects/${projectId}`} className="hover:text-gray-400">
            {project?.name}
          </Link>
          <span>/</span>
          <span className="text-gray-100">Epics</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-gray-100">Epics</h1>
        <p className="mt-1 text-sm text-gray-400">
          Group related tasks under a larger initiative or feature.
        </p>

        <div className="mt-4 inline-flex rounded-md border border-space-700 bg-space-900 p-0.5 text-xs font-medium">
          {([['list', 'List', List], ['roadmap', 'Roadmap', CalendarRange]] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 ${view === key ? 'bg-orbit-500 text-white' : 'text-space-200 hover:bg-space-800'}`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {canManage && (
          <div className="mt-6 card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-2">
            <input
              className="input-field flex-1"
              placeholder="New epic name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <div className="flex flex-wrap gap-1">
              {EPIC_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 flex-shrink-0 rounded-full ${color === c ? 'ring-2 ring-offset-1 ring-offset-space-900 ring-space-50' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button onClick={handleCreate} className="btn-primary">
              Create
            </button>
          </div>
        )}

        {view === 'roadmap' && epics && epics.length > 0 ? (
          <EpicRoadmap
            epics={epics}
            tasks={tasks || []}
            doneColumnIds={doneColumnIds}
            canManage={canManage}
            onUpdate={(epicId, dates) => updateEpic.mutate({ epicId, ...dates })}
          />
        ) : (
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
                      <p className="text-sm font-medium text-gray-100">{epic.name}</p>
                      <p className="text-xs text-gray-500">{taskCount} task{taskCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => deleteEpic.mutate(epic._id)}
                      className="text-gray-600 hover:text-red-500"
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
            <EmptyState
              icon={Zap}
              title="No epics yet"
              description="Epics group related tasks under a bigger goal. Create one above to get started."
            />
          )}
        </div>
        )}
      </div>
    </AppLayout>
  );
}
