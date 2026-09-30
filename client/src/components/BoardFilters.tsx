import { useEffect, useState } from 'react';
import { ListFilter, Check } from 'lucide-react';
import type { Task } from '../types';

export interface BoardFilterState {
  priorities: string[];
  assigneeIds: string[];
  labels: string[];
}

export const EMPTY_FILTERS: BoardFilterState = { priorities: [], assigneeIds: [], labels: [] };

export function countActiveFilters(f: BoardFilterState) {
  return f.priorities.length + f.assigneeIds.length + f.labels.length;
}

/** Filter state remembered per project in this browser. */
export function usePersistentFilters(projectId: string | undefined) {
  const key = `orbitpm:board-filters:${projectId}`;
  const [filters, setFilters] = useState<BoardFilterState>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? { ...EMPTY_FILTERS, ...JSON.parse(raw) } : EMPTY_FILTERS;
    } catch {
      return EMPTY_FILTERS;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(filters));
    } catch {
      /* storage unavailable: filters just won't persist */
    }
  }, [key, filters]);
  return [filters, setFilters] as const;
}

const PRIORITIES = [
  { value: 'urgent', label: 'Urgent', dot: 'bg-red-500' },
  { value: 'high', label: 'High', dot: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', dot: 'bg-blue-500' },
  { value: 'low', label: 'Low', dot: 'bg-slate-400' },
];

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

interface Member {
  userId: { _id: string; name: string };
}

function Row({ checked, onClick, children }: { checked: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      role="checkbox"
      aria-checked={checked}
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-space-100 hover:bg-space-800"
    >
      <span
        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
          checked ? 'border-orbit-500 bg-orbit-500 text-white' : 'border-space-600 bg-space-900'
        }`}
      >
        {checked && <Check size={12} strokeWidth={3} />}
      </span>
      {children}
    </button>
  );
}

export function BoardFilters({
  filters,
  onChange,
  members,
  tasks,
}: {
  filters: BoardFilterState;
  onChange: (f: BoardFilterState) => void;
  members: Member[] | undefined;
  tasks: Task[] | undefined;
}) {
  const [open, setOpen] = useState(false);
  const active = countActiveFilters(filters);

  const labelMap = new Map<string, string>();
  (tasks || []).forEach((t) => t.labels.forEach((l) => labelMap.set(l.name, l.color)));

  const heading = 'px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-space-400';

  return (
    <div className="relative flex items-center gap-2">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
          active ? 'bg-orbit-50 text-orbit-600' : 'bg-space-800 text-space-200 hover:bg-space-700'
        }`}
      >
        <ListFilter size={14} /> Filter
        {active > 0 && (
          <span className="rounded-full bg-orbit-500 px-1.5 text-[10px] font-semibold text-white">{active}</span>
        )}
      </button>
      {active > 0 && (
        <button onClick={() => onChange(EMPTY_FILTERS)} className="text-xs text-space-400 hover:text-space-50">
          Clear
        </button>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-30 mt-1 max-h-[70vh] w-64 overflow-y-auto rounded-lg border border-space-700 bg-space-900 p-2 shadow-popover">
            <p className={heading + ' !pt-1'}>Priority</p>
            {PRIORITIES.map((p) => (
              <Row
                key={p.value}
                checked={filters.priorities.includes(p.value)}
                onClick={() => onChange({ ...filters, priorities: toggle(filters.priorities, p.value) })}
              >
                <span className={`h-2 w-2 rounded-full ${p.dot}`} /> {p.label}
              </Row>
            ))}

            <p className={heading}>Assignee</p>
            {members?.map((m) => (
              <Row
                key={m.userId._id}
                checked={filters.assigneeIds.includes(m.userId._id)}
                onClick={() => onChange({ ...filters, assigneeIds: toggle(filters.assigneeIds, m.userId._id) })}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orbit-500 text-[10px] font-semibold text-white">
                  {m.userId.name[0]?.toUpperCase()}
                </span>
                <span className="truncate">{m.userId.name}</span>
              </Row>
            ))}

            {labelMap.size > 0 && <p className={heading}>Label</p>}
            {[...labelMap.entries()].map(([name, color]) => (
              <Row
                key={name}
                checked={filters.labels.includes(name)}
                onClick={() => onChange({ ...filters, labels: toggle(filters.labels, name) })}
              >
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
                <span className="truncate">{name}</span>
              </Row>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
