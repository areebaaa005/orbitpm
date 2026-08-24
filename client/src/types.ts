export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export type WorkspaceRole = 'owner' | 'admin' | 'pm' | 'member' | 'viewer';

export interface Workspace {
  _id: string;
  name: string;
  slug: string;
  ownerId: string;
}

export interface WorkspaceMembership {
  workspace: Workspace;
  role: WorkspaceRole;
}

export interface Project {
  _id: string;
  workspaceId: string;
  name: string;
  key: string;
  description?: string;
  status: 'active' | 'archived';
  members: string[];
  createdAt: string;
}

export interface Column {
  _id: string;
  projectId: string;
  name: string;
  order: number;
  color: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  _id: string;
  workspaceId: string;
  projectId: string;
  columnId: string;
  title: string;
  description?: string;
  assigneeIds: string[];
  reporterId: string;
  priority: TaskPriority;
  labels: string[];
  dueDate?: string;
  order: number;
  createdAt: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: { code: string; message: string; details: unknown };
}
