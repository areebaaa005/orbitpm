import { useParams, Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { AppLayout } from '../components/AppLayout';
import { useProject, useProjectAnalytics } from '../hooks/useWorkspaceData';

const PRIORITY_COLORS: Record<string, string> = {
  low: '#9CA3AF',
  medium: '#60A5FA',
  high: '#FBBF24',
  urgent: '#F87171',
};

export default function Analytics() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId);
  const { data, isLoading } = useProjectAnalytics(projectId);

  function handleExportPdf() {
    if (!data || !project) return;
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(18);
    doc.text('OrbitPM — Project Report', 14, y);
    y += 8;
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`${project.name} (${project.key})`, 14, y);
    y += 6;
    doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, y);
    y += 12;

    doc.setTextColor(20);
    doc.setFontSize(13);
    doc.text('Summary', 14, y);
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(60);
    const rows = [
      ['Total tasks', String(data.total)],
      ['Completed', String(data.completed)],
      ['Open', String(data.open)],
      ['Overdue', String(data.overdue)],
    ];
    for (const [label, value] of rows) {
      doc.text(`${label}:`, 14, y);
      doc.text(value, 60, y);
      y += 6;
    }

    y += 6;
    doc.setFontSize(13);
    doc.setTextColor(20);
    doc.text('Priority distribution', 14, y);
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(60);
    for (const [priority, count] of Object.entries(data.priorityDistribution)) {
      doc.text(`${priority}:`, 14, y);
      doc.text(String(count), 60, y);
      y += 6;
    }

    doc.save(`${project.key}-report.pdf`);
  }

  const priorityData = data
    ? Object.entries(data.priorityDistribution).map(([priority, count]) => ({
        priority,
        count,
      }))
    : [];

  const statusData = data
    ? [
        { name: 'Completed', value: data.completed, color: '#34D399' },
        { name: 'Open', value: data.open, color: '#60A5FA' },
      ]
    : [];

  return (
    <AppLayout workspaceId={project?.workspaceId} projectId={projectId}>
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-8 py-5">
          <Link to={`/projects/${projectId}`} className="text-sm text-ink-400 hover:text-ink-600">
            {project?.name}
          </Link>
          <span className="text-ink-400">/</span>
          <h1 className="flex-1 text-lg font-semibold text-ink-900">Analytics</h1>
          <button onClick={handleExportPdf} disabled={!data} className="btn-secondary text-xs">
            📄 Export PDF
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {isLoading && <p className="text-sm text-ink-400">Loading analytics…</p>}

          {data && (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Total tasks" value={data.total} />
                <StatCard label="Completed" value={data.completed} accent="text-emerald-600" />
                <StatCard label="Open" value={data.open} accent="text-blue-600" />
                <StatCard label="Overdue" value={data.overdue} accent="text-red-600" />
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="card p-5">
                  <h3 className="mb-4 text-sm font-semibold text-ink-900">
                    Priority distribution
                  </h3>
                  {priorityData.every((p) => p.count === 0) ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={priorityData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                        <XAxis dataKey="priority" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {priorityData.map((entry) => (
                            <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="card p-5">
                  <h3 className="mb-4 text-sm font-semibold text-ink-900">
                    Completed vs open
                  </h3>
                  {data.total === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={2}
                        >
                          {statusData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="card p-5 lg:col-span-2">
                  <h3 className="mb-4 text-sm font-semibold text-ink-900">
                    Completions — last 14 days
                  </h3>
                  {data.completionTrend.length === 0 ? (
                    <EmptyChart message="No tasks completed in this period yet." />
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={data.completionTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#5B5FEF"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({
  label,
  value,
  accent = 'text-ink-900',
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-ink-600">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

function EmptyChart({ message = 'Not enough data yet.' }: { message?: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-ink-400">
      {message}
    </div>
  );
}
