import { Project } from './project.model';
import { Column, DEFAULT_COLUMNS } from './column.model';
import { Task } from '../tasks/task.model';
import { ApiError } from '../../utils/ApiError';

export async function createProject(
  workspaceId: string,
  userId: string,
  data: { name: string; key: string; description?: string; color?: string }
) {
  const existing = await Project.findOne({ workspaceId, key: data.key.toUpperCase() });
  if (existing) {
    throw ApiError.conflict(`A project with key "${data.key.toUpperCase()}" already exists`);
  }

  const project = await Project.create({
    workspaceId,
    name: data.name,
    key: data.key.toUpperCase(),
    description: data.description,
    color: data.color,
    members: [userId],
    createdBy: userId,
  });

  await Column.insertMany(
    DEFAULT_COLUMNS.map((c) => ({ ...c, projectId: project._id }))
  );

  return project;
}

export async function listProjects(workspaceId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const query = { workspaceId, status: 'active' };
  const [projects, total] = await Promise.all([
    Project.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Project.countDocuments(query),
  ]);
  return { projects, total, page, pages: Math.ceil(total / limit) };
}

export async function getProject(projectId: string) {
  const project = await Project.findById(projectId);
  if (!project) {
    throw ApiError.notFound('Project not found');
  }
  return project;
}

export async function updateProject(
  projectId: string,
  updates: { name?: string; description?: string; status?: 'active' | 'archived'; color?: string }
) {
  const project = await Project.findByIdAndUpdate(projectId, updates, { new: true });
  if (!project) {
    throw ApiError.notFound('Project not found');
  }
  return project;
}

export async function deleteProject(projectId: string) {
  const project = await Project.findByIdAndUpdate(
    projectId,
    { status: 'archived' },
    { new: true }
  );
  if (!project) {
    throw ApiError.notFound('Project not found');
  }
  // Archive rather than hard-delete: collaborative data shouldn't vanish instantly.
  return project;
}

export async function listColumns(projectId: string) {
  return Column.find({ projectId }).sort({ order: 1 });
}

export async function createColumn(projectId: string, name: string, color?: string) {
  const count = await Column.countDocuments({ projectId });
  return Column.create({ projectId, name, color, order: count });
}

export async function updateColumn(
  columnId: string,
  updates: { name?: string; color?: string }
) {
  const column = await Column.findByIdAndUpdate(columnId, updates, { new: true });
  if (!column) throw ApiError.notFound('Column not found');
  return column;
}

export async function deleteColumn(
  columnId: string,
  projectId: string,
  moveTasksToColumnId?: string
) {
  const column = await Column.findById(columnId);
  if (!column) throw ApiError.notFound('Column not found');

  const taskCount = await Task.countDocuments({ columnId });
  if (taskCount > 0) {
    if (!moveTasksToColumnId) {
      throw ApiError.badRequest(
        'COLUMN_HAS_TASKS',
        `This column has ${taskCount} task(s). Choose another column to move them into before deleting.`
      );
    }
    const targetExists = await Column.exists({ _id: moveTasksToColumnId, projectId });
    if (!targetExists) throw ApiError.badRequest('INVALID_TARGET', 'Target column not found');

    const targetCount = await Task.countDocuments({ columnId: moveTasksToColumnId });
    await Task.updateMany(
      { columnId },
      [{ $set: { columnId: moveTasksToColumnId, order: { $add: [targetCount, '$order'] } } }]
    );
  }

  await column.deleteOne();
}

export async function reorderColumn(columnId: string, projectId: string, direction: 'up' | 'down') {
  const columns = await Column.find({ projectId }).sort({ order: 1 });
  const index = columns.findIndex((c) => c._id.toString() === columnId);
  if (index === -1) throw ApiError.notFound('Column not found');

  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= columns.length) return columns; // already at the edge, no-op

  const a = columns[index];
  const b = columns[swapIndex];
  const tempOrder = a.order;
  a.order = b.order;
  b.order = tempOrder;
  await Promise.all([a.save(), b.save()]);

  return Column.find({ projectId }).sort({ order: 1 });
}
