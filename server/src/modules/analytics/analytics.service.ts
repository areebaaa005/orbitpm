import { Task } from '../tasks/task.model';
import { Column } from '../projects/column.model';
import { Project } from '../projects/project.model';

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
