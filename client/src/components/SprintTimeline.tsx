import { Sprint } from '../types';

const STATUS_COLORS: Record<string, string> = {
  planned: '#9CA3AF',
  active: '#5B5FEF',
  completed: '#10B981',
};

export function SprintTimeline({ sprints }: { sprints: Sprint[] }) {
  const withDates = sprints.filter((s) => s.startDate && s.endDate);

  if (withDates.length === 0) {
    return (
      <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-ink-400">
        No sprints with start/end dates yet. Set dates when creating a sprint, or start one to
        begin tracking it on the timeline.
      </p>
    );
  }

  const allDates = withDates.flatMap((s) => [
    new Date(s.startDate!).getTime(),
    new Date(s.endDate!).getTime(),
  ]);
  const minDate = Math.min(...allDates);
  const maxDate = Math.max(...allDates);
  const range = Math.max(maxDate - minDate, 1);

  function pct(date: string) {
    return ((new Date(date).getTime() - minDate) / range) * 100;
  }

  return (
    <div className="flex flex-col gap-3">
      {withDates.map((s) => {
        const left = pct(s.startDate!);
        const width = Math.max(pct(s.endDate!) - left, 3);
        return (
          <div key={s._id} className="flex items-center gap-3">
            <span className="w-28 flex-shrink-0 truncate text-xs font-medium text-ink-700">
              {s.name}
            </span>
            <div className="relative h-6 flex-1 rounded bg-gray-50">
              <div
                className="absolute top-0 h-full rounded text-[10px] font-medium leading-6 text-white"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: STATUS_COLORS[s.status],
                }}
              >
                <span className="px-1.5">{s.status}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
