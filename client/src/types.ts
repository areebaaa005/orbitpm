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
  color: string;
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
export type TaskType = 'task' | 'bug' | 'story' | 'spike';

export interface TaskLabel {
  name: string;
  color: string;
}

export interface ChecklistItem {
  _id: string;
  text: string;
  done: boolean;
}

export interface Attachment {
  _id: string;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Task {
  _id: string;
  workspaceId: string;
  projectId: string;
  columnId: string;
  epicId?: string;
  sprintId?: string;
  title: string;
  description?: string;
  assigneeIds: string[];
  reporterId: string;
  priority: TaskPriority;
  type: TaskType;
  storyPoints?: number;
  labels: TaskLabel[];
  checklist: ChecklistItem[];
  attachments: Attachment[];
  dueDate?: string;
  order: number;
  createdAt: string;
}

export interface Epic {
  _id: string;
  projectId: string;
  name: string;
  description?: string;
  color: string;
  status: 'open' | 'closed';
}

export interface Sprint {
  _id: string;
  projectId: string;
  name: string;
  goal?: string;
  status: 'planned' | 'active' | 'completed';
  startDate?: string;
  endDate?: string;
}

export interface Comment {
  _id: string;
  taskId: string;
  authorId: { _id: string; name: string; avatar: string | null } | string;
  body: string;
  createdAt: string;
}

export interface Activity {
  _id: string;
  action: string;
  actorId: { _id: string; name: string; avatar: string | null } | string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AppNotification {
  _id: string;
  type: string;
  message: string;
  readAt: string | null;
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
