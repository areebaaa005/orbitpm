import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useProject,
  useTasks,
  useSprints,
  useCreateSprint,
  useStartSprint,
  useCompleteSprint,
  useDeleteSprint,
  useAssignTaskToSprint,
  useMyRole,
} from '../hooks/useWorkspaceData';
import { AppLayout } from '../components/AppLayout';
import { SprintTimeline } from '../components/SprintTimeline';

const SPRINT_STATUS_STYLES: Record<string, string> = {
  planned: 'bg-space-800 text-gray-600',
  active: 'bg-emerald-500/10 text-emerald-400',
  completed: 'bg-space-800 text-gray-400',
};

export default function Backlog() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId);
  const { data: myRole } = useMyRole(project?.workspaceId);
  const { data: sprints } = useSprints(projectId);
  const { data: allTasks } = useTasks(projectId);
  const { data: backlogTasks } = useTasks(projectId, { sprintId: 'backlog' });
  const createSprint = useCreateSprint(projectId);
  const startSprint = useStartSprint(projectId);
  const completeSprint = useCompleteSprint(projectId);
  const deleteSprint = useDeleteSprint(projectId);
  const assignToSprint = useAssignTaskToSprint(projectId);

  const [newSprintName, setNewSprintName] = useState('');
  const [newSprintStart, setNewSprintStart] = useState('');
  const [newSprintEnd, setNewSprintEnd] = useState('');
  const [showTimeline, setShowTimeline] = useState(false);
  const canManage = myRole === 'owner' || myRole === 'admin' || myRole === 'pm';
  const activeSprint = sprints?.find((s) => s.status === 'active');

  async function handleCreateSprint() {
    if (!newSprintName.trim()) return;
    await createSprint.mutateAsync({
      name: newSprintName.trim(),
      startDate: newSprintStart ? new Date(newSprintStart).toISOString() : undefined,
      endDate: newSprintEnd ? new Date(newSprintEnd).toISOString() : undefined,
    });
    setNewSprintName('');
    setNewSprintStart('');
    setNewSprintEnd('');
  }

  return (
    <AppLayout workspaceId={project?.workspaceId} projectId={projectId}>
      <div className="mx-auto max-w-4xl px-8 py-10">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link to={`/projects/${projectId}`} className="hover:text-gray-400">
            {project?.name}
          </Link>
          <span>/</span>
          <span className="text-gray-100">Backlog</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-100">Sprints & Backlog</h1>
          <button onClick={() => setShowTimeline((s) => !s)} className="btn-secondary text-xs">
            {showTimeline ? 'Hide timeline' : '📅 Roadmap timeline'}
          </button>
        </div>

        {showTimeline && sprints && (
          <div className="mt-4 card p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-100">Roadmap</h2>
            <SprintTimeline sprints={sprints} />
          </div>
        )}

        <div className="mt-6 card p-5">
          <h2 className="text-sm font-semibold text-gray-100">Sprints</h2>
          <div className="mt-3 flex flex-col gap-2">
            {sprints?.map((s) => {
              const sprintTaskCount = allTasks?.filter((t) => t.sprintId === s._id).length || 0;
              return (
                <div key={s._id} className="flex items-center justify-between rounded-lg border border-space-800 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-100">{s.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${SPRINT_STATUS_STYLES[s.status]}`}>
                      {s.status}
                    </span>
                    <span className="text-xs text-gray-500">{sprintTaskCount} task{sprintTaskCount !== 1 ? 's' : ''}</span>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-3">
                      {s.status === 'planned' && (
                        <button
                          onClick={() => {
                            if (sprintTaskCount === 0) {
                              const confirmed = window.confirm(
                                'This sprint has no tasks yet. Starting it now will show an empty board. Start anyway?'
                              );
                              if (!confirmed) return;
                            }
                            startSprint.mutate(s._id);
                          }}
                          disabled={!!activeSprint || startSprint.isPending}
                          className="text-xs font-medium text-orbit-600 hover:text-orbit-300 disabled:text-gray-600"
                        >
                          Start sprint
                        </button>
                      )}
                      {s.status === 'active' && (
                        <button
                          onClick={() => completeSprint.mutate(s._id)}
                          className="text-xs font-medium text-emerald-600 hover:text-emerald-400"
                        >
                          Complete sprint
                        </button>
                      )}
                      <button
                        onClick={() => deleteSprint.mutate(s._id)}
                        className="text-xs font-medium text-gray-500 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {sprints?.length === 0 && (
              <p className="text-sm text-gray-500">No sprints yet — create one below.</p>
            )}
          </div>

          {canManage && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-400">Sprint name</label>
                <input
                  className="input-field text-sm"
                  placeholder="e.g. Sprint 1"
                  value={newSprintName}
                  onChange={(e) => setNewSprintName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateSprint()}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">
                  Start date <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="date"
                  className="input-field text-sm"
                  value={newSprintStart}
                  onChange={(e) => setNewSprintStart(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">
                  End date <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="date"
                  className="input-field text-sm"
                  value={newSprintEnd}
                  onChange={(e) => setNewSprintEnd(e.target.value)}
                />
              </div>
              <button onClick={handleCreateSprint} className="btn-primary text-sm">
                Create
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 card divide-y divide-space-800">
          <div className="px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-100">Backlog</h2>
            <p className="text-xs text-gray-500">Tasks not yet pulled into a sprint.</p>
          </div>
          {backlogTasks?.map((task) => (
            <div key={task._id} className="flex items-center justify-between gap-3 px-5 py-3">
              <span className="text-sm text-gray-100">{task.title}</span>
              {canManage && sprints && sprints.length > 0 && (
                <select
                  className="rounded-lg border border-space-600 px-2 py-1 text-xs"
                  defaultValue=""
                  onChange={(e) =>
                    e.target.value &&
                    assignToSprint.mutate({ taskId: task._id, sprintId: e.target.value })
                  }
                >
                  <option value="" disabled>
                    Move to sprint…
                  </option>
                  {sprints
                    .filter((s) => s.status !== 'completed')
                    .map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              )}
            </div>
          ))}
          {backlogTasks?.length === 0 && (
            <p className="px-5 py-6 text-center text-sm text-gray-500">Backlog is empty.</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
