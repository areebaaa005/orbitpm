import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { AppLayout } from '../components/AppLayout';
import { TaskDetailModal } from '../components/TaskDetailModal';
import {
  useProject,
  useColumns,
  useTasks,
  useCreateTask,
  useMoveTask,
} from '../hooks/useWorkspaceData';
import { getSocket } from '../api/socket';
import { Task, TaskPriority, Column } from '../types';

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
  const moveTask = useMoveTask(projectId);
  const qc = useQueryClient();

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [openTask, setOpenTask] = useState<Task | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Join the project's realtime room and react to events pushed by other users
  useEffect(() => {
    if (!projectId) return;
    const socket = getSocket();
    if (!socket || !project) return;

    socket.emit('join:project', { projectId, workspaceId: project.workspaceId });

    const refresh = () => qc.invalidateQueries({ queryKey: ['tasks', projectId] });
    socket.on('task:created', refresh);
    socket.on('task:updated', refresh);
    socket.on('task:moved', refresh);
    socket.on('task:deleted', refresh);

    return () => {
      socket.emit('leave:project', projectId);
      socket.off('task:created', refresh);
      socket.off('task:updated', refresh);
      socket.off('task:moved', refresh);
      socket.off('task:deleted', refresh);
    };
  }, [projectId, project, qc]);

  const tasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const col of columns || []) map[col._id] = [];
    for (const t of tasks || []) {
      if (!map[t.columnId]) map[t.columnId] = [];
      map[t.columnId].push(t);
    }
    for (const colId in map) map[colId].sort((a, b) => a.order - b.order);
    return map;
  }, [columns, tasks]);

  function handleDragStart(event: DragStartEvent) {
    const task = tasks?.find((t) => t._id === event.active.id);
    setActiveTask(task || null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeTaskData = tasks?.find((t) => t._id === active.id);
    if (!activeTaskData) return;

    // Dropped on a column (empty area) or on another task
    const overIsColumn = columns?.some((c) => c._id === over.id);
    const targetColumnId = overIsColumn
      ? (over.id as string)
      : tasks?.find((t) => t._id === over.id)?.columnId;

    if (!targetColumnId) return;

    const targetList = tasksByColumn[targetColumnId] || [];
    let targetIndex = overIsColumn
      ? targetList.length
      : targetList.findIndex((t) => t._id === over.id);
    if (targetIndex < 0) targetIndex = targetList.length;

    if (targetColumnId === activeTaskData.columnId && activeTaskData.order === targetIndex) {
      return; // no-op
    }

    moveTask.mutate({ taskId: activeTaskData._id, columnId: targetColumnId, order: targetIndex });
  }

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

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4">
              {columns?.map((col) => (
                <BoardColumn
                  key={col._id}
                  projectId={projectId!}
                  column={col}
                  tasks={tasksByColumn[col._id] || []}
                  onTaskClick={setOpenTask}
                />
              ))}
            </div>

            <DragOverlay>
              {activeTask && <TaskCard task={activeTask} dragging />}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {openTask && (
        <TaskDetailModal
          task={tasks?.find((t) => t._id === openTask._id) || openTask}
          projectId={projectId!}
          onClose={() => setOpenTask(null)}
        />
      )}
    </AppLayout>
  );
}

function BoardColumn({
  projectId,
  column,
  tasks,
  onTaskClick,
}: {
  projectId: string;
  column: Column;
  tasks: Task[];
  onTaskClick: (t: Task) => void;
}) {
  const createTask = useCreateTask(projectId);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const { setNodeRef, isOver } = useDroppable({ id: column._id });

  async function handleAdd() {
    if (!title.trim()) return;
    await createTask.mutateAsync({ columnId: column._id, title: title.trim() });
    setTitle('');
    setIsAdding(false);
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 flex-shrink-0 flex-col rounded-xl2 p-3 transition ${
        isOver ? 'bg-orbit-50' : 'bg-gray-100/70'
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: column.color }} />
          <span className="text-sm font-semibold text-ink-900">{column.name}</span>
        </div>
        <span className="text-xs text-ink-400">{tasks.length}</span>
      </div>

      <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-2 flex-col gap-2">
          {tasks.map((task) => (
            <SortableTaskCard key={task._id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </div>
      </SortableContext>

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
            <button onClick={() => setIsAdding(false)} className="btn-secondary py-1.5 text-xs">
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

function SortableTaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onClick}>
      <TaskCard task={task} />
    </div>
  );
}

function TaskCard({ task, dragging = false }: { task: Task; dragging?: boolean }) {
  return (
    <div className={`card cursor-pointer p-3 ${dragging ? 'rotate-2 shadow-popover' : ''}`}>
      <p className="text-sm font-medium text-ink-900">{task.title}</p>
      <div className="mt-2 flex items-center justify-between">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PRIORITY_STYLES[task.priority]}`}
        >
          {task.priority}
        </span>
      </div>
    </div>
  );
}
