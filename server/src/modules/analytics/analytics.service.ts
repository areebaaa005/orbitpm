import { Task } from '../tasks/task.model';
import { Column } from '../projects/column.model';
import { Project } from '../projects/project.model';
import { Sprint } from '../sprints/sprint.model';
import { Activity } from '../activities/activity.model';

async function getDoneColumnIds(projectId: string): Promise<string[]> {
  // "Done" is a convention, not a hardcoded status field — this keeps
  // analytics working even if a team renames/reorders their columns,
  // as long as one column is still named "Done".
  const doneColumns = await Column.find({
    projectId,
    name: { $regex: /^done$/i },
  }).select('_id');
  return doneColumns.map((c) => c._id.toString());
}

export async function getProjectAnalytics(projectId: string) {
  const [tasks, doneColumnIds] = await Promise.all([
    Task.find({ projectId }).select('priority assigneeIds dueDate columnId createdAt updatedAt'),
    getDoneColumnIds(projectId),
  ]);

  const now = new Date();
  const total = tasks.length;
  const completed = tasks.filter((t) => doneColumnIds.includes(t.columnId.toString())).length;
  const open = total - completed;
  const overdue = tasks.filter(
    (t) => t.dueDate && t.dueDate < now && !doneColumnIds.includes(t.columnId.toString())
  ).length;

  const priorityDistribution: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
  for (const t of tasks) {
    priorityDistribution[t.priority] = (priorityDistribution[t.priority] || 0) + 1;
  }

  const workloadMap: Record<string, number> = {};
  for (const t of tasks) {
    for (const assigneeId of t.assigneeIds) {
      const key = assigneeId.toString();
      workloadMap[key] = (workloadMap[key] || 0) + 1;
    }
  }

  // Completion trend: tasks completed per day over the last 14 days,
  // approximated via updatedAt on tasks currently sitting in a Done column.
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const recentlyCompleted = tasks.filter(
    (t) => doneColumnIds.includes(t.columnId.toString()) && t.updatedAt >= fourteenDaysAgo
  );
  const trendMap: Record<string, number> = {};
  for (const t of recentlyCompleted) {
    const day = t.updatedAt.toISOString().slice(0, 10);
    trendMap[day] = (trendMap[day] || 0) + 1;
  }
  const completionTrend = Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return {
    total,
    completed,
    open,
    overdue,
    priorityDistribution,
    workload: Object.entries(workloadMap).map(([userId, count]) => ({ userId, count })),
    completionTrend,
  };
}

export async function getWorkspaceAnalytics(workspaceId: string) {
  const projects = await Project.find({ workspaceId, status: 'active' }).select('_id name');
  const perProject = await Promise.all(
    projects.map(async (p) => ({
      projectId: p._id,
      name: p.name,
      ...(await getProjectAnalytics(p._id.toString())),
    }))
  );

  const totals = perProject.reduce(
    (acc, p) => ({
      total: acc.total + p.total,
      completed: acc.completed + p.completed,
      overdue: acc.overdue + p.overdue,
    }),
    { total: 0, completed: 0, overdue: 0 }
  );

  return { totals, projects: perProject };
}

const DAY = 24 * 60 * 60 * 1000;
const dayStr = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Sprint burndown, velocity and status breakdown for one project.
 * Work is measured in story points when the sprint uses them, otherwise in task count.
 * Exact completion times come from the "task_moved into Done" activity log; tasks without
 * one fall back to updatedAt.
 */
export async function getProjectInsights(projectId: string) {
  const [columns, sprints, doneColumnIds, tasks] = await Promise.all([
    Column.find({ projectId }).sort({ order: 1 }).select('name'),
    Sprint.find({ projectId }).sort({ createdAt: -1 }),
    getDoneColumnIds(projectId),
    Task.find({ projectId }).select('columnId sprintId storyPoints createdAt updatedAt'),
  ]);

  const isDone = (t: (typeof tasks)[number]) => doneColumnIds.includes(t.columnId.toString());
  const inSprint = (sprintId: unknown) => tasks.filter((t) => t.sprintId && String(t.sprintId) === String(sprintId));
  const usesPoints = (list: typeof tasks) => list.some((t) => (t.storyPoints ?? 0) > 0);
  const sum = (list: typeof tasks, points: boolean) =>
    list.reduce((n, t) => n + (points ? (t.storyPoints ?? 0) : 1), 0);

  const statusBreakdown = columns.map((c) => ({
    name: c.name,
    count: tasks.filter((t) => t.columnId.toString() === c._id.toString()).length,
  }));

  const velocity = sprints
    .filter((sp) => sp.status === 'completed')
    .slice(0, 6)
    .reverse()
    .map((sp) => {
      const list = inSprint(sp._id);
      const points = usesPoints(list);
      return {
        name: sp.name,
        unit: points ? 'points' : 'tasks',
        committed: sum(list, points),
        completed: sum(list.filter(isDone), points),
      };
    });

  const focus = sprints.find((sp) => sp.status === 'active') ?? sprints.find((sp) => sp.status === 'completed');
  let burndown = null;

  if (focus) {
    const list = inSprint(focus._id);
    const points = usesPoints(list);
    const total = sum(list, points);

    const doneTasks = list.filter(isDone);
    const completedAt = new Map<string, Date>(doneTasks.map((t) => [String(t._id), t.updatedAt]));
    if (doneTasks.length > 0) {
      const moves = await Activity.find({ taskId: { $in: doneTasks.map((t) => t._id) }, action: 'task_moved' })
        .sort({ createdAt: 1 })
        .select('taskId createdAt metadata');
      for (const a of moves) {
        if (doneColumnIds.includes(String(a.metadata?.toColumnId))) completedAt.set(String(a.taskId), a.createdAt);
      }
    }

    const first = focus.startDate ?? (list.length ? new Date(Math.min(...list.map((t) => +t.createdAt))) : focus.createdAt);
    const startDay = new Date(dayStr(first) + 'T00:00:00Z');
    let endDay = focus.endDate ? new Date(dayStr(focus.endDate) + 'T00:00:00Z') : new Date(+startDay + 14 * DAY);
    if (endDay <= startDay) endDay = new Date(+startDay + 14 * DAY);
    const span = Math.min(Math.round((+endDay - +startDay) / DAY), 120);
    const today = new Date(dayStr(new Date()) + 'T00:00:00Z');

    const days = [];
    for (let i = 0; i <= span; i++) {
      const d = new Date(+startDay + i * DAY);
      const endOfDay = +d + DAY - 1;
      const remaining = +d <= +today
        ? sum(list.filter((t) => { const c = completedAt.get(String(t._id)); return !(c && +c <= endOfDay); }), points)
        : null;
      days.push({ date: dayStr(d), ideal: Math.round(total * (1 - i / span) * 10) / 10, actual: remaining });
    }

    burndown = {
      sprint: { id: focus._id, name: focus.name, status: focus.status, startDate: dayStr(startDay), endDate: dayStr(endDay) },
      unit: points ? 'points' : 'tasks',
      total,
      days,
    };
  }

  return { burndown, velocity, statusBreakdown };
}
