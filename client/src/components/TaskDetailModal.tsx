import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useComments,
  useCreateComment,
  useTaskActivity,
  useUpdateTask,
  useSuggestSubtasks,
  useCreateTask,
  useDeleteTask,
  useMyRole,
  useMembers,
  useEpics,
  useSprints,
  useAssignTaskToSprint,
} from '../hooks/useWorkspaceData';
import { Task, TaskPriority, TaskType, TaskLabel, ChecklistItem } from '../types';

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
const TYPES: { value: TaskType; label: string; icon: string; color: string }[] = [
  { value: 'task', label: 'Task', icon: '✓', color: '#5B5FEF' },
  { value: 'bug', label: 'Bug', icon: '🐞', color: '#EF4444' },
  { value: 'story', label: 'Story', icon: '📗', color: '#10B981' },
  { value: 'spike', label: 'Spike', icon: '⚡', color: '#8B5CF6' },
];
const LABEL_COLORS = ['#5B5FEF', '#F59E0B', '#10B981', '#EF4444', '#06B6D4', '#8B5CF6', '#EC4899'];

const ACTIVITY_LABEL: Record<string, (m: Record<string, unknown>) => string> = {
  task_created: () => 'created this task',
  task_moved: () => 'moved this task',
  task_updated: (m) => `updated ${(m.fields as string[])?.join(', ') || 'the task'}`,
  task_commented: () => 'commented',
  task_assigned: () => 'changed the assignee',
};

export function TaskDetailModal({
  task,
  projectId,
  onClose,
}: {
  task: Task;
  projectId: string;
  onClose: () => void;
}) {
  const { data: comments } = useComments(task._id);
  const { data: activities } = useTaskActivity(task._id);
  const createComment = useCreateComment(task._id);
  const updateTask = useUpdateTask(projectId);
  const suggestSubtasks = useSuggestSubtasks();
  const createTask = useCreateTask(projectId);
  const deleteTask = useDeleteTask(projectId);
  const { data: myRole } = useMyRole(task.workspaceId);
  const { data: members } = useMembers(task.workspaceId);
  const { data: epics } = useEpics(projectId);
  const { data: sprints } = useSprints(projectId);
  const assignToSprint = useAssignTaskToSprint(projectId);
  const canDelete = myRole === 'owner' || myRole === 'admin' || myRole === 'pm';
  const canEdit = myRole !== 'viewer';

  const [description, setDescription] = useState(task.description || '');
  const [commentText, setCommentText] = useState('');
  const [tab, setTab] = useState<'comments' | 'activity'>('comments');
  const [subtaskSuggestions, setSubtaskSuggestions] = useState<string[]>([]);
  const [addedSubtasks, setAddedSubtasks] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);
  const [newChecklistText, setNewChecklistText] = useState('');

  async function handleDelete() {
    await deleteTask.mutateAsync(task._id);
    onClose();
  }

  async function handleSuggestSubtasks() {
    const suggestions = await suggestSubtasks.mutateAsync(task._id);
    setSubtaskSuggestions(suggestions);
    setAddedSubtasks(new Set());
  }

  async function handleAddSubtask(title: string) {
    await createTask.mutateAsync({ columnId: task.columnId, title });
    setAddedSubtasks((prev) => new Set(prev).add(title));
  }

  async function handleSubmitComment(e: FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    await createComment.mutateAsync(commentText.trim());
    setCommentText('');
  }

  function handlePriorityChange(priority: TaskPriority) {
    updateTask.mutate({ taskId: task._id, priority });
  }

  function handleTypeChange(type: TaskType) {
    updateTask.mutate({ taskId: task._id, type });
  }

  function handleStoryPointsChange(value: string) {
    const num = value === '' ? undefined : Number(value);
    updateTask.mutate({ taskId: task._id, storyPoints: num as number | undefined });
  }

  function handleDueDateChange(value: string) {
    updateTask.mutate({ taskId: task._id, dueDate: value ? new Date(value).toISOString() : undefined });
  }

  function handleEpicChange(epicId: string) {
    updateTask.mutate({ taskId: task._id, epicId: epicId || undefined });
  }

  function handleSprintChange(sprintId: string) {
    assignToSprint.mutate({ taskId: task._id, sprintId: sprintId || null });
  }

  function toggleAssignee(userId: string) {
    const current = task.assigneeIds;
    const next = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId];
    updateTask.mutate({ taskId: task._id, assigneeIds: next });
  }

  function handleAddLabel() {
    if (!newLabelName.trim()) return;
    const newLabel: TaskLabel = { name: newLabelName.trim(), color: newLabelColor };
    updateTask.mutate({ taskId: task._id, labels: [...task.labels, newLabel] });
    setNewLabelName('');
  }

  function handleRemoveLabel(name: string) {
    updateTask.mutate({ taskId: task._id, labels: task.labels.filter((l) => l.name !== name) });
  }

  function handleAddChecklistItem() {
    if (!newChecklistText.trim()) return;
    const newItem = { text: newChecklistText.trim(), done: false } as ChecklistItem;
    updateTask.mutate({ taskId: task._id, checklist: [...task.checklist, newItem] });
    setNewChecklistText('');
  }

  function toggleChecklistItem(itemId: string) {
    const next = task.checklist.map((item) =>
      item._id === itemId ? { ...item, done: !item.done } : item
    );
    updateTask.mutate({ taskId: task._id, checklist: next });
  }

  function removeChecklistItem(itemId: string) {
    updateTask.mutate({ taskId: task._id, checklist: task.checklist.filter((i) => i._id !== itemId) });
  }

  function handleDescriptionBlur() {
    if (description !== (task.description || '')) {
      updateTask.mutate({ taskId: task._id, description });
    }
  }

  const assignedMembers = members?.filter((m) => task.assigneeIds.includes(m.userId._id)) || [];
  const checklistDone = task.checklist.filter((c) => c.done).length;
  const currentType = TYPES.find((t) => t.value === task.type) || TYPES[0];
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-end bg-black/30"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-popover"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <span
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold text-white"
              style={{ backgroundColor: currentType.color }}
            >
              {currentType.icon} {currentType.label.toUpperCase()}
            </span>
            <div className="flex items-center gap-2">
              {canDelete && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-full p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete task"
                >
                  🗑
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded-full p-1 text-ink-400 hover:bg-gray-100 hover:text-ink-900"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {confirmDelete && (
            <div className="border-b border-red-100 bg-red-50 px-6 py-3">
              <p className="text-sm text-red-800">Delete this task permanently?</p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleteTask.isPending}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                >
                  {deleteTask.isPending ? 'Deleting…' : 'Confirm delete'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="px-6 py-5">
            <h2 className="text-lg font-semibold text-ink-900">{task.title}</h2>

            {/* Meta grid: type, priority, story points, due date */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-600">Type</label>
                <select
                  disabled={!canEdit}
                  className="input-field text-sm"
                  value={task.type}
                  onChange={(e) => handleTypeChange(e.target.value as TaskType)}
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.icon} {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-600">Story points</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  disabled={!canEdit}
                  className="input-field text-sm"
                  placeholder="—"
                  defaultValue={task.storyPoints ?? ''}
                  onBlur={(e) => handleStoryPointsChange(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-600">Due date</label>
                <input
                  type="date"
                  disabled={!canEdit}
                  className={`input-field text-sm ${isOverdue ? 'text-red-600' : ''}`}
                  defaultValue={task.dueDate ? task.dueDate.slice(0, 10) : ''}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-600">Epic</label>
                <select
                  disabled={!canEdit}
                  className="input-field text-sm"
                  value={task.epicId || ''}
                  onChange={(e) => handleEpicChange(e.target.value)}
                >
                  <option value="">No epic</option>
                  {epics?.map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {sprints && sprints.length > 0 && (
              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-ink-600">Sprint</label>
                <select
                  disabled={!canEdit}
                  className="input-field text-sm"
                  value={task.sprintId || ''}
                  onChange={(e) => handleSprintChange(e.target.value)}
                >
                  <option value="">Backlog (no sprint)</option>
                  {sprints.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} {s.status === 'active' ? '(active)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-ink-600">Priority</label>
              <div className="flex gap-1.5">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    disabled={!canEdit}
                    onClick={() => handlePriorityChange(p)}
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                      task.priority === p
                        ? 'bg-orbit-500 text-white'
                        : 'bg-gray-100 text-ink-600 hover:bg-gray-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Assignees */}
            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-ink-600">Assignees</label>
              <div className="flex flex-wrap items-center gap-1.5">
                {assignedMembers.map((m) => (
                  <span
                    key={m.userId._id}
                    className="flex items-center gap-1 rounded-full bg-orbit-50 py-1 pl-1 pr-2 text-xs font-medium text-orbit-700"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orbit-500 text-[10px] font-semibold text-white">
                      {m.userId.name?.[0]?.toUpperCase()}
                    </span>
                    {m.userId.name}
                  </span>
                ))}
                {canEdit && (
                  <button
                    onClick={() => setShowAssigneePicker((s) => !s)}
                    className="rounded-full border border-dashed border-gray-300 px-2 py-1 text-xs text-ink-500 hover:border-orbit-400 hover:text-orbit-600"
                  >
                    + Add
                  </button>
                )}
              </div>
              {showAssigneePicker && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-gray-200 p-1.5">
                  {members?.map((m) => (
                    <label
                      key={m.userId._id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={task.assigneeIds.includes(m.userId._id)}
                        onChange={() => toggleAssignee(m.userId._id)}
                      />
                      {m.userId.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Labels */}
            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-ink-600">Labels</label>
              <div className="flex flex-wrap items-center gap-1.5">
                {task.labels.map((l) => (
                  <span
                    key={l.name}
                    className="flex items-center gap-1 rounded-full py-1 pl-2.5 pr-1 text-xs font-medium text-white"
                    style={{ backgroundColor: l.color }}
                  >
                    {l.name}
                    {canEdit && (
                      <button
                        onClick={() => handleRemoveLabel(l.name)}
                        className="rounded-full px-1 hover:bg-black/20"
                      >
                        ✕
                      </button>
                    )}
                  </span>
                ))}
                {canEdit && (
                  <button
                    onClick={() => setShowLabelPicker((s) => !s)}
                    className="rounded-full border border-dashed border-gray-300 px-2 py-1 text-xs text-ink-500 hover:border-orbit-400 hover:text-orbit-600"
                  >
                    + Add
                  </button>
                )}
              </div>
              {showLabelPicker && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 p-2">
                  <input
                    className="input-field flex-1 text-sm"
                    placeholder="Label name"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddLabel()}
                  />
                  <div className="flex gap-1">
                    {LABEL_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewLabelColor(c)}
                        className={`h-5 w-5 rounded-full ${newLabelColor === c ? 'ring-2 ring-offset-1 ring-ink-900' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <button onClick={handleAddLabel} className="btn-primary py-1 text-xs">
                    Add
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-ink-600">Description</label>
              <textarea
                disabled={!canEdit}
                className="input-field resize-none"
                rows={4}
                placeholder="Add a description…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
              />
            </div>

            {/* Checklist */}
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-ink-600">Checklist</label>
                {task.checklist.length > 0 && (
                  <span className="text-xs text-ink-400">
                    {checklistDone}/{task.checklist.length}
                  </span>
                )}
              </div>
              {task.checklist.length > 0 && (
                <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{
                      width: `${task.checklist.length ? (checklistDone / task.checklist.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              )}
              <div className="flex flex-col gap-1">
                {task.checklist.map((item) => (
                  <div key={item._id} className="flex items-center gap-2 rounded px-1 py-1 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleChecklistItem(item._id)}
                    />
                    <span className={`flex-1 text-sm ${item.done ? 'text-ink-400 line-through' : 'text-ink-900'}`}>
                      {item.text}
                    </span>
                    {canEdit && (
                      <button
                        onClick={() => removeChecklistItem(item._id)}
                        className="text-ink-300 hover:text-red-500"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {canEdit && (
                <div className="mt-1.5 flex gap-2">
                  <input
                    className="input-field text-sm"
                    placeholder="Add checklist item…"
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                  />
                  <button onClick={handleAddChecklistItem} className="btn-secondary text-xs">
                    Add
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4">
              <button
                onClick={handleSuggestSubtasks}
                disabled={suggestSubtasks.isPending}
                className="btn-secondary text-xs"
              >
                {suggestSubtasks.isPending ? 'Thinking…' : '✨ Suggest subtasks with AI'}
              </button>

              {suggestSubtasks.isError && (
                <p className="mt-2 text-xs text-red-600">
                  Couldn't generate suggestions right now. Try again in a moment.
                </p>
              )}

              {subtaskSuggestions.length > 0 && (
                <div className="mt-3 flex flex-col gap-1.5 rounded-lg border border-orbit-100 bg-orbit-50 p-3">
                  {subtaskSuggestions.map((s) => {
                    const added = addedSubtasks.has(s);
                    return (
                      <div key={s} className="flex items-center justify-between gap-2">
                        <span className={`text-sm ${added ? 'text-ink-400 line-through' : 'text-ink-900'}`}>
                          {s}
                        </span>
                        <button
                          onClick={() => !added && handleAddSubtask(s)}
                          disabled={added}
                          className="flex-shrink-0 text-xs font-medium text-orbit-600 hover:text-orbit-700 disabled:text-ink-400"
                        >
                          {added ? 'Added' : '+ Add as task'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-4 border-b border-gray-200">
              <button
                onClick={() => setTab('comments')}
                className={`border-b-2 px-1 pb-2 text-sm font-medium ${
                  tab === 'comments'
                    ? 'border-orbit-500 text-ink-900'
                    : 'border-transparent text-ink-400'
                }`}
              >
                Comments {comments?.length ? `(${comments.length})` : ''}
              </button>
              <button
                onClick={() => setTab('activity')}
                className={`border-b-2 px-1 pb-2 text-sm font-medium ${
                  tab === 'activity'
                    ? 'border-orbit-500 text-ink-900'
                    : 'border-transparent text-ink-400'
                }`}
              >
                Activity
              </button>
            </div>

            {tab === 'comments' ? (
              <div className="mt-4">
                <form onSubmit={handleSubmitComment} className="mb-4 flex gap-2">
                  <input
                    className="input-field"
                    placeholder="Write a comment…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={createComment.isPending}
                    className="btn-primary px-3 text-sm"
                  >
                    Send
                  </button>
                </form>

                <div className="flex flex-col gap-3">
                  {comments?.map((c) => {
                    const author = typeof c.authorId === 'object' ? c.authorId : null;
                    return (
                      <div key={c._id} className="flex gap-2">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-orbit-100 text-xs font-semibold text-orbit-700">
                          {author?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 rounded-lg bg-gray-50 px-3 py-2">
                          <p className="text-xs font-medium text-ink-900">{author?.name}</p>
                          <p className="mt-0.5 text-sm text-ink-600">{c.body}</p>
                        </div>
                      </div>
                    );
                  })}
                  {comments?.length === 0 && (
                    <p className="text-sm text-ink-400">No comments yet. Start the conversation.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                {activities?.map((a) => {
                  const actor = typeof a.actorId === 'object' ? a.actorId : null;
                  const label = ACTIVITY_LABEL[a.action]?.(a.metadata) || a.action;
                  return (
                    <div key={a._id} className="flex items-center gap-2 text-sm">
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-ink-600">
                        {actor?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <p className="text-ink-600">
                        <span className="font-medium text-ink-900">{actor?.name}</span> {label}
                      </p>
                    </div>
                  );
                })}
                {activities?.length === 0 && (
                  <p className="text-sm text-ink-400">No activity recorded yet.</p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
