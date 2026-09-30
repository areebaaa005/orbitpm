import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, UserPlus } from 'lucide-react';
import { useUpdateTask, useMyRole, type MemberEntry } from '../hooks/useWorkspaceData';
import type { Task, TaskPriority } from '../types';

const PRIORITIES: { value: TaskPriority; label: string; dot: string }[] = [
  { value: 'urgent', label: 'Urgent', dot: 'bg-red-500' },
  { value: 'high', label: 'High', dot: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', dot: 'bg-blue-500' },
  { value: 'low', label: 'Low', dot: 'bg-slate-400' },
];

const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

/** Floating menu rendered in a portal so it is never clipped by the column. Events are
 *  stopped because React portals bubble to the card (which would open the task). */
function Popover({ anchor, onClose, children }: { anchor: DOMRect; onClose: () => void; children: ReactNode }) {
  const top = Math.max(8, Math.min(anchor.bottom + 4, window.innerHeight - 280));
  const left = Math.max(8, Math.min(anchor.left, window.innerWidth - 232));
  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[60]"
        onClick={(e) => {
          stop(e);
          onClose();
        }}
        onPointerDown={stop}
      />
      <div
        className="fixed z-[70] max-h-64 w-56 overflow-y-auto rounded-lg border border-space-700 bg-space-900 p-1.5 shadow-popover"
        style={{ top, left }}
        onClick={stop}
        onPointerDown={stop}
      >
        {children}
      </div>
    </>,
    document.body
  );
}

const optionClass = 'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-space-100 hover:bg-space-800';

export function PriorityQuickEdit({
  task,
  className,
  interactive = true,
}: {
  task: Task;
  className: string;
  interactive?: boolean;
}) {
  const update = useUpdateTask(task.projectId);
  const { data: myRole } = useMyRole(task.workspaceId);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  if (!interactive || !myRole || myRole === 'viewer') {
    return <span className={className}>{task.priority}</span>;
  }
  return (
    <>
      <button
        type="button"
        title="Change priority"
        onPointerDown={stop}
        onClick={(e) => {
          stop(e);
          setAnchor(e.currentTarget.getBoundingClientRect());
        }}
        className={`${className} transition hover:ring-2 hover:ring-orbit-500/40`}
      >
        {task.priority}
      </button>
      {anchor && (
        <Popover anchor={anchor} onClose={() => setAnchor(null)}>
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              className={optionClass}
              onClick={() => {
                if (p.value !== task.priority) update.mutate({ taskId: task._id, priority: p.value });
                setAnchor(null);
              }}
            >
              <span className={`h-2 w-2 rounded-full ${p.dot}`} />
              <span className="flex-1">{p.label}</span>
              {p.value === task.priority && <Check size={14} className="text-orbit-600" />}
            </button>
          ))}
        </Popover>
      )}
    </>
  );
}

export function AssigneeQuickEdit({
  task,
  members,
  interactive = true,
}: {
  task: Task;
  members?: MemberEntry[];
  interactive?: boolean;
}) {
  const update = useUpdateTask(task.projectId);
  const { data: myRole } = useMyRole(task.workspaceId);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  const assignees = members?.filter((m) => task.assigneeIds.includes(m.userId._id)) || [];
  const avatars =
    assignees.length > 0 ? (
      <div className="flex -space-x-1.5">
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
    ) : null;

  if (!interactive || !myRole || myRole === 'viewer') {
    return avatars ? <div className="mt-2">{avatars}</div> : null;
  }

  function toggle(userId: string) {
    const next = task.assigneeIds.includes(userId)
      ? task.assigneeIds.filter((id) => id !== userId)
      : [...task.assigneeIds, userId];
    update.mutate({ taskId: task._id, assigneeIds: next });
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        title="Change assignees"
        onPointerDown={stop}
        onClick={(e) => {
          stop(e);
          setAnchor(e.currentTarget.getBoundingClientRect());
        }}
        className="rounded-full transition hover:ring-2 hover:ring-orbit-500/40"
      >
        {avatars ?? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-space-500 text-space-400 opacity-0 transition group-hover:opacity-100">
            <UserPlus size={12} />
          </span>
        )}
      </button>
      {anchor && (
        <Popover anchor={anchor} onClose={() => setAnchor(null)}>
          {members?.map((m) => {
            const checked = task.assigneeIds.includes(m.userId._id);
            return (
              <button key={m.userId._id} className={optionClass} onClick={() => toggle(m.userId._id)}>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orbit-500 text-[10px] font-semibold text-white">
                  {m.userId.name?.[0]?.toUpperCase()}
                </span>
                <span className="flex-1 truncate">{m.userId.name}</span>
                {checked && <Check size={14} className="text-orbit-600" />}
              </button>
            );
          })}
        </Popover>
      )}
    </div>
  );
}
