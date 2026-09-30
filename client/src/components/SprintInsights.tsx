import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useProjectInsights } from '../hooks/useWorkspaceData';
import { Skeleton } from './Skeleton';

const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function Empty({ message }: { message: string }) {
  return <div className="flex h-[220px] items-center justify-center px-4 text-center text-sm text-space-400">{message}</div>;
}

export function SprintInsights({ projectId }: { projectId: string | undefined }) {
  const { data, isLoading } = useProjectInsights(projectId);

  if (isLoading) return <Skeleton className="mt-6 h-72 w-full" />;
  if (!data) return null;

  const { burndown, velocity, statusBreakdown } = data;
  const totalTasks = statusBreakdown.reduce((n, c) => n + c.count, 0);

  let summary = '';
  if (burndown) {
    const reached = burndown.days.filter((d) => d.actual !== null);
    const last = reached[reached.length - 1];
    if (last && last.actual !== null) {
      const diff = Math.round((last.actual - last.ideal) * 10) / 10;
      summary = `${last.actual} of ${burndown.total} ${burndown.unit} remaining · ${
        diff <= 0 ? 'on or ahead of the ideal line' : `${diff} ${burndown.unit} behind the ideal line`
      }`;
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-space-50">
            Sprint burndown{burndown ? ` · ${burndown.sprint.name}` : ''}
          </h3>
          {summary && <p className="text-xs text-space-300">{summary}</p>}
        </div>
        {!burndown ? (
          <Empty message="Create and start a sprint in the Backlog to see its burndown." />
        ) : burndown.total === 0 ? (
          <Empty message="Add tasks to this sprint to see the burndown." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={burndown.days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DFE1E6" />
              <XAxis dataKey="date" tickFormatter={fmt} tick={{ fontSize: 12 }} minTickGap={24} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
              <Tooltip labelFormatter={(l) => fmt(String(l))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="linear" dataKey="ideal" name="Ideal" stroke="#8993A4" strokeDasharray="5 5" dot={false} />
              <Line type="stepAfter" dataKey="actual" name={`Remaining (${burndown.unit})`} stroke="#0C66E4" strokeWidth={2} dot={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-space-50">Velocity (last completed sprints)</h3>
          {velocity.length === 0 ? (
            <Empty message="Complete a sprint to see velocity." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={velocity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DFE1E6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="committed" name="In sprint" fill="#C1C7D0" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#0C66E4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-space-50">Work by status</h3>
          {totalTasks === 0 ? (
            <Empty message="No tasks yet." />
          ) : (
            <ul className="space-y-3">
              {statusBreakdown.map((c) => (
                <li key={c.name}>
                  <div className="mb-1 flex justify-between text-xs text-space-200">
                    <span>{c.name}</span>
                    <span className="font-medium">{c.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-space-800">
                    <div className="h-full rounded-full bg-orbit-500" style={{ width: `${(c.count / totalTasks) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
