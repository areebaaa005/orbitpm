import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
import { motion, AnimatePresence } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import { AppLayout } from '../components/AppLayout';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { TaskListView } from '../components/TaskListView';
import {
  useProject,
  useColumns,
  useTasks,
  useCreateTask,
  useMoveTask,
  useProjectSummary,
  useMyRole,
  useArchiveProject,
  useMembers,
  useSprints,
  useEpics,
  useUpdateColumn,
  useDeleteColumn,
  useReorderColumn,
  MemberEntry,
} from '../hooks/useWorkspaceData';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../api/socket';
import { Task, TaskPriority, Column } from '../types';

const TYPE_ICONS: Record<string, string> = { task: '✓', bug: '🐞', story: '📗', spike: '⚡' };

const GROUP_BY_LABELS: Record<'none' | 'assignee' | 'priority' | 'epic', string> = {
  none: 'No grouping',
  assignee: 'Group by assignee',
  priority: 'Group by priority',
  epic: 'Group by epic',
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'bg-space-800 text-gray-600',
  medium: 'bg-blue-500/10 text-blue-400',
  high: 'bg-amber-500/10 text-amber-400',
  urgent: 'bg-red-500/10 text-red-400',
};

export default function Board() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: project } = useProject(projectId);
  const { data: columns, isLoading: columnsLoading } = useColumns(projectId);
  const { data: tasks } = useTasks(projectId);
  const { data: members } = useMembers(project?.workspaceId);
  const { data: sprints } = useSprints(projectId);
  const moveTask = useMoveTask(projectId);
  const projectSummary = useProjectSummary();
  const { data: myRole } = useMyRole(project?.workspaceId);
  const archiveProject = useArchiveProject(project?.workspaceId);
  const qc = useQueryClient();

  const canManage = myRole === 'owner' || myRole === 'admin' || myRole === 'pm';
  const canManageMembers = myRole === 'owner' || myRole === 'admin';

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [groupBy, setGroupBy] = useState<'none' | 'assignee' | 'priority' | 'epic'>('none');
  const [showGroupByMenu, setShowGroupByMenu] = useState(false);
  const { data: epics } = useEpics(projectId);

  const activeSprint = sprints?.find((s) => s.status === 'active');

  const filteredTasks = useMemo(() => {
    if (!tasks) return tasks;
    return tasks.filter((t) => {
      // When sprints exist, the board shows only the active sprint's work —
      // everything else lives in the Backlog until pulled in.
      if (sprints && sprints.length > 0) {
        if (activeSprint ? t.sprintId !== activeSprint._id : !!t.sprintId) return false;
      }
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (onlyMine && !(user && t.assigneeIds.includes(user.id))) return false;
      if (onlyOverdue && !(t.dueDate && new Date(t.dueDate) < new Date())) return false;
      return true;
    });
  }, [tasks, searchQuery, onlyMine, onlyOverdue, user, sprints, activeSprint]);

  async function handleDeleteProject() {
    if (!projectId) return;
    await archiveProject.mutateAsync(projectId);
    navigate('/');
  }

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
    for (const t of filteredTasks || []) {
      if (!map[t.columnId]) map[t.columnId] = [];
      map[t.columnId].push(t);
    }
    for (const colId in map) map[colId].sort((a, b) => a.order - b.order);
    return map;
  }, [columns, filteredTasks]);

  function handleDragStart(event: DragStartEvent) {
    const task = filteredTasks?.find((t) => t._id === event.active.id);
    setActiveTask(task || null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeTaskData = filteredTasks?.find((t) => t._id === active.id);
    if (!activeTaskData) return;

    // Dropped on a column (empty area) or on another task
    const overIsColumn = columns?.some((c) => c._id === over.id);
    const targetColumnId = overIsColumn
      ? (over.id as string)
      : filteredTasks?.find((t) => t._id === over.id)?.columnId;

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
    <AppLayout workspaceId={project?.workspaceId} projectId={projectId}>
      <div className="flex h-full flex-col">
        <div className="h-1" style={{ backgroundColor: project?.color || '#5B5FEF' }} />
        <header className="flex items-center gap-3 border-b border-space-700 bg-space-900 px-8 py-5">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-400">
            Workspaces
          </Link>
          <span className="text-gray-500">/</span>
          <span
            className="rounded px-1.5 py-0.5 font-mono text-xs font-semibold text-white"
            style={{ backgroundColor: project?.color || '#5B5FEF' }}
          >
            {project?.key}
          </span>
          <h1 className="flex-1 text-lg font-semibold text-gray-100">{project?.name}</h1>
          {myRole && (
            <span className="text-xs font-medium text-gray-500">
              Viewing as <span className="capitalize text-gray-400">{myRole}</span>
            </span>
          )}
          <button
            onClick={() => {
              setShowSummary(true);
              if (projectId) projectSummary.mutate(projectId);
            }}
            className="btn-secondary text-xs"
          >
            ✨ AI summary
          </button>
          {canManage && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/10"
            >
              Delete
            </button>
          )}
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-space-700 bg-space-900 px-8 py-3">
          <input
            className="input-field max-w-xs text-sm"
            placeholder="🔍 Search tasks…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            onClick={() => setOnlyMine((v) => !v)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              onlyMine ? 'bg-orbit-500 text-white' : 'bg-space-800 text-gray-400 hover:bg-space-700'
            }`}
          >
            My tasks
          </button>
          <button
            onClick={() => setOnlyOverdue((v) => !v)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              onlyOverdue ? 'bg-red-500 text-white' : 'bg-space-800 text-gray-400 hover:bg-space-700'
            }`}
          >
            Overdue
          </button>

          <div className="ml-auto flex items-center gap-2">
            {viewMode === 'list' && (
              <div className="relative">
                <button
                  onClick={() => setShowGroupByMenu((s) => !s)}
                  className="flex items-center gap-1.5 rounded-lg border border-space-600 bg-space-800 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-space-700"
                >
                  {GROUP_BY_LABELS[groupBy]} <span className="text-gray-500">▾</span>
                </button>
                {showGroupByMenu && (
                  <div className="absolute right-0 z-30 mt-1 w-44 rounded-lg border border-space-700 bg-space-900 py-1 shadow-popover">
                    {(Object.keys(GROUP_BY_LABELS) as (keyof typeof GROUP_BY_LABELS)[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => {
                          setGroupBy(key);
                          setShowGroupByMenu(false);
                        }}
                        className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-space-800 ${
                          groupBy === key ? 'text-orbit-300' : 'text-gray-300'
                        }`}
                      >
                        {GROUP_BY_LABELS[key]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex rounded-lg border border-space-600 p-0.5">
              <button
                onClick={() => setViewMode('kanban')}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  viewMode === 'kanban' ? 'bg-orbit-500 text-white' : 'text-gray-400'
                }`}
              >
                Board
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  viewMode === 'list' ? 'bg-orbit-500 text-white' : 'text-gray-400'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {confirmDelete && (
          <div className="border-b border-red-500/30 bg-red-500/10 px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-red-400">
                Delete <span className="font-semibold">{project?.name}</span>? It will be archived
                and removed from your workspace's active projects.
              </p>
              <div className="flex flex-shrink-0 gap-2">
                <button
                  onClick={handleDeleteProject}
                  disabled={archiveProject.isPending}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                >
                  {archiveProject.isPending ? 'Deleting…' : 'Confirm delete'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-space-600 px-3 py-1.5 text-xs font-semibold text-gray-400 hover:bg-space-900"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showSummary && (
          <div className="border-b border-space-700 bg-orbit-500/10 px-8 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-orbit-300">
                  AI project summary
                </p>
                {projectSummary.isPending && (
                  <p className="text-sm text-gray-400">Generating summary…</p>
                )}
                {projectSummary.isError && (
                  <p className="text-sm text-red-400">
                    Couldn't generate a summary right now. Try again in a moment.
                  </p>
                )}
                {projectSummary.data && (
                  <p className="whitespace-pre-line text-sm text-gray-100">
                    {projectSummary.data}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowSummary(false)}
                className="text-gray-500 hover:text-gray-400"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-x-auto px-8 py-6">
          {columnsLoading && <p className="text-sm text-gray-500">Loading board…</p>}

          {sprints && sprints.length > 0 && !activeSprint && (
            <p className="mb-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
              No active sprint —{' '}
              <Link to={`/projects/${projectId}/backlog`} className="underline">
                start one from the Backlog
              </Link>{' '}
              to begin working the board.
            </p>
          )}

          {viewMode === 'kanban' ? (
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
                    members={members}
                    allColumns={columns}
                    canManage={canManage}
                    onTaskClick={setOpenTask}
                  />
                ))}
              </div>

              <DragOverlay>
                {activeTask && <TaskCard task={activeTask} members={members} dragging />}
              </DragOverlay>
            </DndContext>
          ) : (
            <TaskListView
              tasks={filteredTasks || []}
              columns={columns || []}
              members={members}
              epics={epics}
              groupBy={groupBy}
              onTaskClick={setOpenTask}
            />
          )}
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
  members,
  allColumns,
  canManage,
  onTaskClick,
}: {
  projectId: string;
  column: Column;
  tasks: Task[];
  members?: MemberEntry[];
  allColumns: Column[];
  canManage: boolean;
  onTaskClick: (t: Task) => void;
}) {
  const createTask = useCreateTask(projectId);
  const updateColumn = useUpdateColumn(projectId);
  const deleteColumn = useDeleteColumn(projectId);
  const reorderColumn = useReorderColumn(projectId);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(column.name);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [moveTasksTo, setMoveTasksTo] = useState('');
  const { setNodeRef, isOver } = useDroppable({ id: column._id });

  const otherColumns = allColumns.filter((c) => c._id !== column._id);
  const colIndex = allColumns.findIndex((c) => c._id === column._id);

  async function handleAdd() {
    if (!title.trim()) return;
    await createTask.mutateAsync({ columnId: column._id, title: title.trim() });
    setTitle('');
    setIsAdding(false);
  }

  function handleRenameSubmit() {
    if (renameValue.trim() && renameValue.trim() !== column.name) {
      updateColumn.mutate({ columnId: column._id, name: renameValue.trim() });
    }
    setIsRenaming(false);
  }

  async function handleDelete() {
    await deleteColumn.mutateAsync({
      columnId: column._id,
      moveTasksTo: tasks.length > 0 ? moveTasksTo : undefined,
    });
    setShowDeleteConfirm(false);
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 flex-shrink-0 flex-col rounded-xl2 p-3 transition ${
        isOver ? 'bg-orbit-500/10' : 'bg-space-900/70'
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: column.color }} />
          {isRenaming ? (
            <input
              autoFocus
              className="min-w-0 flex-1 rounded border border-orbit-300 bg-space-900 px-1 py-0.5 text-sm font-semibold text-gray-100"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
            />
          ) : (
            <span className="truncate text-sm font-semibold text-gray-100">{column.name}</span>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <span className="text-xs text-gray-500">{tasks.length}</span>
          {canManage && (
            <div className="relative">
              <button
                onClick={() => setShowMenu((s) => !s)}
                className="rounded p-0.5 text-gray-500 hover:bg-space-700 hover:text-gray-300"
              >
                ⋯
              </button>
              {showMenu && (
                <div className="absolute right-0 z-30 mt-1 w-40 rounded-lg border border-space-700 bg-space-900 py-1 shadow-popover">
                  <button
                    onClick={() => {
                      setIsRenaming(true);
                      setShowMenu(false);
                    }}
                    className="block w-full px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-space-800"
                  >
                    Rename
                  </button>
                  {colIndex > 0 && (
                    <button
                      onClick={() => {
                        reorderColumn.mutate({ columnId: column._id, direction: 'up' });
                        setShowMenu(false);
                      }}
                      className="block w-full px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-space-800"
                    >
                      ← Move left
                    </button>
                  )}
                  {colIndex < allColumns.length - 1 && (
                    <button
                      onClick={() => {
                        reorderColumn.mutate({ columnId: column._id, direction: 'down' });
                        setShowMenu(false);
                      }}
                      className="block w-full px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-space-800"
                    >
                      Move right →
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(true);
                      setShowMenu(false);
                    }}
                    className="block w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-red-500/10"
                  >
                    Delete column
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5">
          <p className="text-xs text-red-400">Delete "{column.name}"?</p>
          {tasks.length > 0 && (
            <>
              <p className="mt-1 text-xs text-red-400">
                {tasks.length} task(s) here — move them first:
              </p>
              <select
                className="mt-1 w-full rounded border border-red-500/30 px-1.5 py-1 text-xs"
                value={moveTasksTo}
                onChange={(e) => setMoveTasksTo(e.target.value)}
              >
                <option value="">Choose a column…</option>
                {otherColumns.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </>
          )}
          <div className="mt-2 flex gap-1.5">
            <button
              onClick={handleDelete}
              disabled={(tasks.length > 0 && !moveTasksTo) || deleteColumn.isPending}
              className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-40"
            >
              Confirm
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded border border-space-600 px-2 py-1 text-xs text-gray-400 hover:bg-space-900"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-2 flex-col gap-2">
          <AnimatePresence initial={false}>
            {tasks.map((task) => (
              <SortableTaskCard key={task._id} task={task} members={members} onClick={() => onTaskClick(task)} />
            ))}
          </AnimatePresence>
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
          className="mt-2 rounded-lg px-2 py-1.5 text-left text-sm text-gray-500 transition hover:bg-space-900 hover:text-gray-400"
        >
          + Add task
        </button>
      )}
    </div>
  );
}

function SortableTaskCard({
  task,
  members,
  onClick,
}: {
  task: Task;
  members?: MemberEntry[];
  onClick: () => void;
}) {
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
      <TaskCard task={task} members={members} />
    </div>
  );
}

function TaskCard({
  task,
  members,
  dragging = false,
}: {
  task: Task;
  members?: MemberEntry[];
  dragging?: boolean;
}) {
  const assignees = members?.filter((m) => task.assigneeIds.includes(m.userId._id)) || [];
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const checklistTotal = task.checklist?.length || 0;
  const checklistDone = task.checklist?.filter((c) => c.done).length || 0;

  return (
    <motion.div
      layout={!dragging}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={dragging ? {} : { y: -2, boxShadow: '0 4px 12px rgba(15,20,36,0.08)' }}
      transition={{ duration: 0.15 }}
      className={`card cursor-pointer p-3 ${dragging ? 'rotate-2 shadow-popover' : ''}`}
    >
      {task.labels?.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {task.labels.map((l) => (
            <span
              key={l.name}
              className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: l.color }}
            >
              {l.name}
            </span>
          ))}
        </div>
      )}

      <p className="flex items-start gap-1 text-sm font-medium text-gray-100">
        <span className="flex-shrink-0">{TYPE_ICONS[task.type] || '✓'}</span>
        {task.title}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PRIORITY_STYLES[task.priority]}`}
        >
          {task.priority}
        </span>
        {typeof task.storyPoints === 'number' && (
          <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-300">
            {task.storyPoints} pts
          </span>
        )}
        {task.dueDate && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              isOverdue ? 'bg-red-500/10 text-red-400' : 'bg-space-800 text-gray-600'
            }`}
          >
            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}
        {checklistTotal > 0 && (
          <span className="rounded-full bg-space-800 px-2 py-0.5 text-xs font-medium text-gray-600">
            ☑ {checklistDone}/{checklistTotal}
          </span>
        )}
      </div>

      {assignees.length > 0 && (
        <div className="mt-2 flex -space-x-1.5">
          {assignees.slice(0, 4).map((m) => (
            <span
              key={m.userId._id}
              title={m.userId.name}
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-orbit-500 text-[10px] font-semibold text-white"
            >
              {m.userId.name?.[0]?.toUpperCase()}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
