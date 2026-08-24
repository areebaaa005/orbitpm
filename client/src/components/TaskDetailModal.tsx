import { useState, FormEvent } from 'react';
import {
  useComments,
  useCreateComment,
  useTaskActivity,
  useUpdateTask,
  useSuggestSubtasks,
  useCreateTask,
} from '../hooks/useWorkspaceData';
import { Task, TaskPriority } from '../types';

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

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

  const [description, setDescription] = useState(task.description || '');
  const [commentText, setCommentText] = useState('');
  const [tab, setTab] = useState<'comments' | 'activity'>('comments');
  const [subtaskSuggestions, setSubtaskSuggestions] = useState<string[]>([]);
  const [addedSubtasks, setAddedSubtasks] = useState<Set<string>>(new Set());

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

  function handleDescriptionBlur() {
    if (description !== (task.description || '')) {
      updateTask.mutate({ taskId: task._id, description });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/30"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <span className="rounded bg-space-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-space-700">
            TASK
          </span>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-ink-400 hover:bg-gray-100 hover:text-ink-900"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-ink-900">{task.title}</h2>

          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-ink-600">Priority</label>
            <div className="flex gap-1.5">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
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

          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-ink-600">Description</label>
            <textarea
              className="input-field resize-none"
              rows={4}
              placeholder="Add a description…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
            />
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
      </div>
    </div>
  );
}
