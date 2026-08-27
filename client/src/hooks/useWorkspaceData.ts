import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { WorkspaceMembership, Project, Column, Task, Comment, Activity, AppNotification, WorkspaceRole, Epic, Sprint } from '../types';

// ---------- Workspaces ----------

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await api.get('/workspaces');
      return res.data.data.workspaces as WorkspaceMembership[];
    },
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post('/workspaces', { name });
      return res.data.data.workspace;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  });
}

// ---------- Projects ----------

export function useProjects(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/projects`);
      return res.data.data.projects as Project[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateProject(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; key: string; description?: string; color?: string }) => {
      const res = await api.post(`/workspaces/${workspaceId}/projects`, input);
      return res.data.data.project as Project;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', workspaceId] }),
  });
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}`);
      return res.data.data.project as Project;
    },
    enabled: !!projectId,
  });
}

// ---------- Columns ----------

export function useColumns(projectId: string | undefined) {
  return useQuery({
    queryKey: ['columns', projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/columns`);
      return res.data.data.columns as Column[];
    },
    enabled: !!projectId,
  });
}

// ---------- Tasks ----------

export function useTasks(projectId: string | undefined, filters?: { sprintId?: string }) {
  return useQuery({
    queryKey: ['tasks', projectId, filters?.sprintId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/tasks`, {
        params: { limit: 100, ...filters },
      });
      return res.data.data.tasks as Task[];
    },
    enabled: !!projectId,
  });
}

export function useCreateTask(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      columnId: string;
      title: string;
      priority?: string;
      description?: string;
      type?: string;
      storyPoints?: number;
      epicId?: string;
      assigneeIds?: string[];
      labels?: { name: string; color: string }[];
      dueDate?: string;
    }) => {
      const res = await api.post(`/projects/${projectId}/tasks`, input);
      return res.data.data.task as Task;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });
}

export function useUpdateTask(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, ...updates }: { taskId: string } & Partial<Task>) => {
      const res = await api.patch(`/tasks/${taskId}`, updates);
      return res.data.data.task as Task;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });
}

// ---------- Comments ----------

export function useComments(taskId: string | undefined) {
  return useQuery({
    queryKey: ['comments', taskId],
    queryFn: async () => {
      const res = await api.get(`/tasks/${taskId}/comments`);
      return res.data.data.comments as Comment[];
    },
    enabled: !!taskId,
  });
}

export function useCreateComment(taskId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const res = await api.post(`/tasks/${taskId}/comments`, { body });
      return res.data.data.comment as Comment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', taskId] }),
  });
}

// ---------- Activity ----------

export function useTaskActivity(taskId: string | undefined) {
  return useQuery({
    queryKey: ['activity', taskId],
    queryFn: async () => {
      const res = await api.get(`/tasks/${taskId}/activity`);
      return res.data.data.activities as Activity[];
    },
    enabled: !!taskId,
  });
}

// ---------- Notifications ----------

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data.data.notifications as AppNotification[];
    },
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

// ---------- Analytics ----------

export interface ProjectAnalytics {
  total: number;
  completed: number;
  open: number;
  overdue: number;
  priorityDistribution: Record<string, number>;
  workload: { userId: string; count: number }[];
  completionTrend: { date: string; count: number }[];
}

export function useProjectAnalytics(projectId: string | undefined) {
  return useQuery({
    queryKey: ['analytics', projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/analytics`);
      return res.data.data as ProjectAnalytics;
    },
    enabled: !!projectId,
  });
}

// ---------- AI ----------

export function useSuggestSubtasks() {
  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await api.post(`/tasks/${taskId}/ai/breakdown`);
      return res.data.data.subtasks as string[];
    },
  });
}

export function useProjectSummary() {
  return useMutation({
    mutationFn: async (projectId: string) => {
      const res = await api.post(`/projects/${projectId}/ai/summary`);
      return res.data.data.summary as string;
    },
  });
}

export function useAcceptInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      const res = await api.post('/workspaces/invitations/accept', { token });
      return res.data.data.workspaceId as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  });
}

export function useMyRole(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['my-role', workspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/me`);
      return res.data.data.role as WorkspaceRole;
    },
    enabled: !!workspaceId,
  });
}

export interface MemberEntry {
  userId: { _id: string; name: string; email: string; avatar: string | null };
  role: WorkspaceRole;
  joinedAt: string;
}

export function useMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['members', workspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/members`);
      return res.data.data.members as MemberEntry[];
    },
    enabled: !!workspaceId,
  });
}

export function useInviteMember(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; role: WorkspaceRole }) => {
      const res = await api.post(`/workspaces/${workspaceId}/invitations`, input);
      return res.data.data.invitation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', workspaceId] }),
  });
}

export function useUpdateMemberRole(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: WorkspaceRole }) => {
      await api.patch(`/workspaces/${workspaceId}/members/${userId}`, { role });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', workspaceId] }),
  });
}

export function useRemoveMember(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', workspaceId] }),
  });
}

export function useUpdateWorkspace(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await api.patch(`/workspaces/${workspaceId}`, { name });
      return res.data.data.workspace;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  });
}

export function useDeleteTask(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      await api.delete(`/tasks/${taskId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });
}

export function useArchiveProject(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      await api.delete(`/projects/${projectId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', workspaceId] }),
  });
}

export function useMoveTask(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      columnId,
      order,
    }: {
      taskId: string;
      columnId: string;
      order: number;
    }) => {
      const res = await api.patch(`/tasks/${taskId}/move`, { columnId, order });
      return res.data.data.task as Task;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });
}

// ---------- Epics ----------

export function useEpics(projectId: string | undefined) {
  return useQuery({
    queryKey: ['epics', projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/epics`);
      return res.data.data.epics as Epic[];
    },
    enabled: !!projectId,
  });
}

export function useCreateEpic(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; color?: string }) => {
      const res = await api.post(`/projects/${projectId}/epics`, input);
      return res.data.data.epic as Epic;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['epics', projectId] }),
  });
}

export function useUpdateEpic(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ epicId, ...updates }: { epicId: string } & Partial<Epic>) => {
      const res = await api.patch(`/projects/${projectId}/epics/${epicId}`, updates);
      return res.data.data.epic as Epic;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['epics', projectId] }),
  });
}

export function useDeleteEpic(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (epicId: string) => {
      await api.delete(`/projects/${projectId}/epics/${epicId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['epics', projectId] }),
  });
}

// ---------- Sprints ----------

export function useSprints(projectId: string | undefined) {
  return useQuery({
    queryKey: ['sprints', projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/sprints`);
      return res.data.data.sprints as Sprint[];
    },
    enabled: !!projectId,
  });
}

export function useCreateSprint(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; goal?: string }) => {
      const res = await api.post(`/projects/${projectId}/sprints`, input);
      return res.data.data.sprint as Sprint;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sprints', projectId] }),
  });
}

export function useStartSprint(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sprintId: string) => {
      const res = await api.patch(`/projects/${projectId}/sprints/${sprintId}/start`);
      return res.data.data.sprint as Sprint;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sprints', projectId] });
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}

export function useCompleteSprint(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sprintId: string) => {
      const res = await api.patch(`/projects/${projectId}/sprints/${sprintId}/complete`);
      return res.data.data.sprint as Sprint;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sprints', projectId] });
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}

export function useAssignTaskToSprint(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, sprintId }: { taskId: string; sprintId: string | null }) => {
      const res = await api.patch(`/tasks/${taskId}/sprint`, { sprintId });
      return res.data.data.task as Task;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });
}
