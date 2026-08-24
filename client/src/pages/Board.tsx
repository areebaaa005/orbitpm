import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { useProject, useColumns, useTasks, useCreateTask } from '../hooks/useWorkspaceData';
import { Task, TaskPriority } from '../types';

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-50 text-blue-700',
  high: 'bg-amber-50 text-amber-700',
  urgent: 'bg-red-50 text-red-700',
};

export default function Board() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId);
  const { data: columns, isLoading: columnsLoading } = useColumns(projectId);
  const { data: tasks } = useTasks(projectId);

  return (
    <AppLayout>
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-8 py-5">
          <Link to="/" className="text-sm text-ink-400 hover:text-ink-600">
            Workspaces
          </Link>
          <span className="text-ink-400">/</span>
          <span className="rounded bg-space-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-space-700">
            {project?.key}
          </span>
          <h1 className="text-lg font-semibold text-ink-900">{project?.name}</h1>
        </header>

        <div className="flex-1 overflow-x-auto px-8 py-6">
          {columnsLoading && <p className="text-sm text-ink-400">Loading board…</p>}

          <div className="flex gap-4">
            {columns?.map((col) => (
              <BoardColumn
                key={col._id}
                projectId={projectId!}
                columnId={col._id}
                name={col.name}
                color={col.color}
                tasks={tasks?.filter((t) => t.columnId === col._id) || []}
              />
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function BoardColumn({
  projectId,
  columnId,
  name,
  color,
  tasks,
}: {
  projectId: string;
  columnId: string;
  name: string;
  color: string;
  tasks: Task[];
}) {
  const createTask = useCreateTask(projectId);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');

  async function handleAdd() {
    if (!title.trim()) return;
    await createTask.mutateAsync({ columnId, title: title.trim() });
    setTitle('');
    setIsAdding(false);
  }

  return (
    <div className="flex w-72 flex-shrink-0 flex-col rounded-xl2 bg-gray-100/70 p-3">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-semibold text-ink-900">{name}</span>
        </div>
        <span className="text-xs text-ink-400">{tasks.length}</span>
      </div>

      <div className="flex flex-col gap-2">
        {tasks
          .sort((a, b) => a.order - b.order)
          .map((task) => (
            <div key={task._id} className="card p-3">
              <p className="text-sm font-medium text-ink-900">{task.title}</p>
              <div className="mt-2 flex items-center justify-between">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PRIORITY_STYLES[task.priority]}`}
                >
                  {task.priority}
                </span>
              </div>
            </div>
          ))}
      </div>

      {isAdding ? (
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            autoFocus
            className="input-field resize-none"
            rows={2}
            placeholder="Task title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-primary flex-1 py-1.5 text-xs">
              Add task
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="btn-secondary py-1.5 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="mt-2 rounded-lg px-2 py-1.5 text-left text-sm text-ink-400 transition hover:bg-white hover:text-ink-600"
        >
          + Add task
        </button>
      )}
    </div>
  );
}
