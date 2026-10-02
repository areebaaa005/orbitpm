import { useState } from 'react';
import { Pencil } from 'lucide-react';
import type { Epic, Task } from '../types';

const DAY = 86400000;
const dayOf = (d: string | Date) => Math.floor(new Date(d).getTime() / DAY);
const toInput = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const fmt = (day: number) => new Date(day * DAY).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

interface Row {
  epic: Epic;
  total: number;
  done: number;
  start: number | null;
  end: number | null;
  estimated: boolean;
}

export function EpicRoadmap({
  epics,
  tasks,
  doneColumnIds,
  canManage,
  onUpdate,
}: {
  epics: Epic[];
  tasks: Task[];
  doneColumnIds: string[];
  canManage: boolean;
  onUpdate: (epicId: string, dates: { startDate: string | null; endDate: string | null }) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [startVal, setStartVal] = useState('');
  const [endVal, setEndVal] = useState('');

  const rows: Row[] = epics.map((epic) => {
    const list = tasks.filter((t) => t.epicId === epic._id);
    const done = list.filter((t) => doneColumnIds.includes(t.columnId)).length;
    const dueDays = list.filter((t) => t.dueDate).map((t) => dayOf(t.dueDate as string));
    const createdDays = list.map((t) => dayOf(t.createdAt));
    const derivedStart = createdDays.length ? Math.min(...createdDays) : null;
    const derivedEnd = dueDays.length ? Math.max(...dueDays) : null;
    const start = epic.startDate ? dayOf(epic.startDate) : derivedStart ?? dayOf(epic.createdAt ?? new Date());
    const end = epic.endDate ? dayOf(epic.endDate) : derivedEnd;
    const estimated = !(epic.startDate && epic.endDate);
    return { epic, total: list.length, done, start, end: end !== null && end >= start ? end : null, estimated };
  });

  const scheduled = rows.filter((r) => r.end !== null).sort((a, b) => (a.start as number) - (b.start as number));
  const unscheduled = rows.filter((r) => r.end === null);
  const ordered = [...scheduled, ...unscheduled];

  const today = dayOf(new Date());
  const lows = [today, ...scheduled.map((r) => r.start as number)];
  const highs = [today, ...scheduled.map((r) => r.end as number)];
  const first = new Date(Math.min(...lows) * DAY);
  const rangeStart = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1) / DAY;
  const lastD = new Date(Math.max(...highs) * DAY);
  let rangeEnd = Date.UTC(lastD.getUTCFullYear(), lastD.getUTCMonth() + 1, 1) / DAY;
  if (rangeEnd - rangeStart < 90) rangeEnd = rangeStart + 90;
  const span = rangeEnd - rangeStart;
  const pct = (day: number) => ((day - rangeStart) / span) * 100;

  const months: { left: number; label: string }[] = [];
  for (let d = new Date(rangeStart * DAY); +d / DAY < rangeEnd; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    months.push({
      left: pct(+d / DAY),
      label: d.toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' }),
    });
  }

  function openEditor(r: Row) {
    setEditingId(r.epic._id);
    setStartVal(toInput(r.epic.startDate ?? (r.start !== null ? new Date(r.start * DAY).toISOString() : null)));
    setEndVal(toInput(r.epic.endDate ?? (r.end !== null ? new Date(r.end * DAY).toISOString() : null)));
  }

  const invalid = !!startVal && !!endVal && endVal < startVal;

  return (
    <div className="mt-6 card overflow-x-auto">
      <div className="min-w-[860px]">
        <div className="grid grid-cols-[14rem_1fr] border-b border-space-700">
          <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-space-400">Epic</div>
          <div className="relative h-9">
            {months.map((m) => (
              <span key={m.label} className="absolute top-0 flex h-full items-center border-l border-space-700 pl-2 text-xs text-space-300" style={{ left: `${m.left}%` }}>
                {m.label}
              </span>
            ))}
          </div>
        </div>

        {ordered.map((r) => {
          const pctDone = r.total ? Math.round((r.done / r.total) * 100) : 0;
          return (
            <div key={r.epic._id} className="border-b border-space-700 last:border-b-0">
              <div className="grid grid-cols-[14rem_1fr]">
                <div className="flex items-center gap-2 px-4 py-3">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: r.epic.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-space-50">{r.epic.name}</p>
                    <p className="text-xs text-space-400">{r.done}/{r.total} tasks done</p>
                  </div>
                  {canManage && (
                    <button onClick={() => openEditor(r)} aria-label={`Edit dates for ${r.epic.name}`} className="rounded p-1 text-space-400 hover:bg-space-800 hover:text-space-50">
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
                <div className="relative">
                  {months.map((m) => (
                    <span key={m.label} className="absolute inset-y-0 border-l border-space-700/60" style={{ left: `${m.left}%` }} />
                  ))}
                  <span className="absolute inset-y-0 z-10 w-px bg-red-500" style={{ left: `${pct(today)}%` }} title="Today" />
                  {r.end !== null && r.start !== null ? (
                    <div
                      className={`absolute top-1/2 h-7 -translate-y-1/2 overflow-hidden rounded ${r.estimated ? 'border border-dashed' : ''}`}
                      style={{
                        left: `${pct(r.start)}%`,
                        width: `${Math.max(pct(r.end + 1) - pct(r.start), 1.5)}%`,
                        backgroundColor: r.epic.color + '33',
                        borderColor: r.epic.color,
                      }}
                      title={`${fmt(r.start)} – ${fmt(r.end)}${r.estimated ? ' (estimated from tasks)' : ''} · ${pctDone}% done`}
                    >
                      <div className="h-full" style={{ width: `${pctDone}%`, backgroundColor: r.epic.color }} />
                      <span className="absolute inset-0 flex items-center px-2 text-[11px] font-semibold text-space-50">{pctDone}%</span>
                    </div>
                  ) : (
                    <p className="flex h-full items-center px-3 text-xs text-space-400">No dates yet. Add task due dates or set dates for this epic.</p>
                  )}
                </div>
              </div>

              {editingId === r.epic._id && (
                <div className="flex flex-wrap items-end gap-3 bg-space-950 px-4 py-3">
                  <label className="text-xs text-space-300">
                    Start
                    <input type="date" className="input-field mt-1 block w-40" value={startVal} onChange={(e) => setStartVal(e.target.value)} />
                  </label>
                  <label className="text-xs text-space-300">
                    End
                    <input type="date" className="input-field mt-1 block w-40" value={endVal} min={startVal || undefined} onChange={(e) => setEndVal(e.target.value)} />
                  </label>
                  <button
                    className="btn-primary py-1.5 text-xs"
                    disabled={invalid}
                    onClick={() => {
                      onUpdate(r.epic._id, { startDate: startVal || null, endDate: endVal || null });
                      setEditingId(null);
                    }}
                  >
                    Save
                  </button>
                  <button className="btn-secondary py-1.5 text-xs" onClick={() => { onUpdate(r.epic._id, { startDate: null, endDate: null }); setEditingId(null); }}>
                    Clear dates
                  </button>
                  <button className="text-xs text-space-400 hover:text-space-50" onClick={() => setEditingId(null)}>Cancel</button>
                  {invalid && <span className="text-xs text-red-700">End date must be on or after the start date.</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="border-t border-space-700 px-4 py-2 text-xs text-space-400">
        Solid bars use the dates you set. Dashed bars are estimated from task creation and due dates. The red line is today.
      </p>
    </div>
  );
}
