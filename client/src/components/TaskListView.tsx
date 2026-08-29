import { useState, useMemo } from 'react';
import { Task, Column, Epic } from '../types';
import { MemberEntry } from '../hooks/useWorkspaceData';

type SortKey = 'title' | 'priority' | 'dueDate' | 'storyPoints';
type GroupBy = 'none' | 'assignee' | 'priority' | 'epic';

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const TYPE_ICONS: Record<string, string> = { task: '✓', bug: '🐞', story: '📗', spike: '⚡' };

export function TaskListView({
  tasks,
  columns,
  members,
  epics,
  groupBy,
  onTaskClick,
}: {
  tasks: Task[];
  columns: Column[];
  members?: MemberEntry[];
  epics?: Epic[];
  groupBy: GroupBy;
  onTaskClick: (t: Task) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [sortAsc, setSortAsc] = useState(true);

  const columnMap = useMemo(() => Object.fromEntries(columns.map((c) => [c._id, c])), [columns]);
  const memberMap = useMemo(
    () => Object.fromEntries((members || []).map((m) => [m.userId._id, m.userId.name])),
    [members]
  );
  const epicMap = useMemo(() => Object.fromEntries((epics || []).map((e) => [e._id, e])), [epics]);

  function sortTasks(list: Task[]) {
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortKey === 'priority') cmp = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      else if (sortKey === 'dueDate')
        cmp = (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) -
          (b.dueDate ? new Date(b.dueDate).getTime() : Infinity);
      else if (sortKey === 'storyPoints') cmp = (a.storyPoints || 0) - (b.storyPoints || 0);
      return sortAsc ? cmp : -cmp;
    });
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((a) => !a);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ label: null as string | null, tasks: sortTasks(tasks) }];

    const buckets: Record<string, Task[]> = {};
    for (const t of tasks) {
      let keys: string[] = ['Unassigned'];
      if (groupBy === 'assignee') {
        keys = t.assigneeIds.length ? t.assigneeIds.map((id) => memberMap[id] || 'Unknown') : ['Unassigned'];
      } else if (groupBy === 'priority') {
        keys = [t.priority];
      } else if (groupBy === 'epic') {
        keys = [t.epicId ? epicMap[t.epicId]?.name || 'Unknown epic' : 'No epic'];
      }
      for (const k of keys) {
        if (!buckets[k]) buckets[k] = [];
        buckets[k].push(t);
      }
    }
    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, list]) => ({ label, tasks: sortTasks(list) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, groupBy, sortKey, sortAsc, memberMap, epicMap]);

  const headerCell = (key: SortKey, label: string) => (
    <button
      onClick={() => toggleSort(key)}
      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-200"
    >
      {label} {sortKey === key && (sortAsc ? '↑' : '↓')}
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.label || 'all'}>
          {group.label && (
            <h3 className="mb-2 text-sm font-semibold capitalize text-gray-300">
              {group.label} <span className="text-gray-500">({group.tasks.length})</span>
            </h3>
          )}
          <div className="overflow-hidden rounded-xl2 border border-space-700 bg-space-900">
            <div className="grid grid-cols-[1fr_100px_120px_110px_90px_110px] gap-2 border-b border-space-800 bg-space-950 px-4 py-2">
              {headerCell('title', 'Title')}
              {headerCell('priority', 'Priority')}
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Assignees</span>
              {headerCell('dueDate', 'Due')}
              {headerCell('storyPoints', 'Pts')}
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</span>
            </div>
            {group.tasks.map((task) => {
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
              return (
                <div
                  key={task._id}
                  onClick={() => onTaskClick(task)}
                  className="grid cursor-pointer grid-cols-[1fr_100px_120px_110px_90px_110px] items-center gap-2 border-b border-gray-50 px-4 py-2.5 text-sm hover:bg-space-800"
                >
                  <span className="flex items-center gap-1.5 truncate text-gray-100">
                    <span className="flex-shrink-0">{TYPE_ICONS[task.type] || '✓'}</span>
                    {task.title}
                  </span>
                  <span className="capitalize text-gray-400">{task.priority}</span>
                  <span className="truncate text-xs text-gray-500">
                    {task.assigneeIds.map((id) => memberMap[id]).filter(Boolean).join(', ') || '—'}
                  </span>
                  <span className={`text-xs ${isOverdue ? 'font-medium text-red-400' : 'text-gray-500'}`}>
                    {task.dueDate
                      ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                      : '—'}
                  </span>
                  <span className="text-xs text-gray-500">{task.storyPoints ?? '—'}</span>
                  <span className="truncate text-xs text-gray-500">
                    {columnMap[task.columnId]?.name || '—'}
                  </span>
                </div>
              );
            })}
            {group.tasks.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-gray-500">No tasks.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
