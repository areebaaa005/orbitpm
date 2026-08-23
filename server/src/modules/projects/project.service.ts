import { Project } from './project.model';
import { Column, DEFAULT_COLUMNS } from './column.model';
import { ApiError } from '../../utils/ApiError';

export async function createProject(
  workspaceId: string,
  userId: string,
  data: { name: string; key: string; description?: string }
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
  const [projects, total] = await Promise.all([
    Project.find({ workspaceId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Project.countDocuments({ workspaceId }),
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
  updates: { name?: string; description?: string; status?: 'active' | 'archived' }
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
