import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import * as projectService from './project.service';

export const createProject = catchAsync(async (req: Request, res: Response) => {
  const project = await projectService.createProject(
    req.params.workspaceId,
    req.userId!,
    req.body
  );
  res.status(201).json({ success: true, data: { project } });
});

export const listProjects = catchAsync(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const result = await projectService.listProjects(req.params.workspaceId, page, limit);
  res.status(200).json({ success: true, data: result });
});

export const getProject = catchAsync(async (req: Request, res: Response) => {
  const project = await projectService.getProject(req.params.projectId);
  res.status(200).json({ success: true, data: { project } });
});

export const updateProject = catchAsync(async (req: Request, res: Response) => {
  const project = await projectService.updateProject(req.params.projectId, req.body);
  res.status(200).json({ success: true, data: { project } });
});

export const deleteProject = catchAsync(async (req: Request, res: Response) => {
  await projectService.deleteProject(req.params.projectId);
  res.status(200).json({ success: true, data: null });
});

export const listColumns = catchAsync(async (req: Request, res: Response) => {
  const columns = await projectService.listColumns(req.params.projectId);
  res.status(200).json({ success: true, data: { columns } });
});

export const createColumn = catchAsync(async (req: Request, res: Response) => {
  const column = await projectService.createColumn(
    req.params.projectId,
    req.body.name,
    req.body.color
  );
  res.status(201).json({ success: true, data: { column } });
});

export const updateColumn = catchAsync(async (req: Request, res: Response) => {
  const column = await projectService.updateColumn(req.params.columnId, req.body);
  res.status(200).json({ success: true, data: { column } });
});

export const deleteColumn = catchAsync(async (req: Request, res: Response) => {
  await projectService.deleteColumn(
    req.params.columnId,
    req.params.projectId,
    req.query.moveTasksTo as string | undefined
  );
  res.status(200).json({ success: true, data: null });
});

export const reorderColumn = catchAsync(async (req: Request, res: Response) => {
  const columns = await projectService.reorderColumn(
    req.params.columnId,
    req.params.projectId,
    req.body.direction
  );
  res.status(200).json({ success: true, data: { columns } });
});
