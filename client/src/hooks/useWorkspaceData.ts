import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { WorkspaceMembership, Project, Column, Task } from '../types';

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
    mutationFn: async (input: { name: string; key: string; description?: string }) => {
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

export function useTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/tasks`, { params: { limit: 100 } });
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
    }) => {
      const res = await api.post(`/projects/${projectId}/tasks`, input);
      return res.data.data.task as Task;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
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
