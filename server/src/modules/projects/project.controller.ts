import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import * as projectService from './project.service';
import { recordAudit } from '../audit/audit.service';
import { Project } from './project.model';
import { Column } from './column.model';

export const createProject = catchAsync(async (req: Request, res: Response) => {
  const project = await projectService.createProject(
    req.params.workspaceId,
    req.userId!,
    req.body
  );
  await recordAudit(req, {
    workspaceId: req.params.workspaceId,
    action: 'project.created',
    targetType: 'project',
    targetId: project._id.toString(),
    targetLabel: project.name,
  });
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
  const before = await Project.findById(req.params.projectId).select('name');
  const project = await projectService.updateProject(req.params.projectId, req.body);
  await recordAudit(req, {
    workspaceId: project.workspaceId.toString(),
    action: 'project.updated',
    targetType: 'project',
    targetId: project._id.toString(),
    targetLabel: project.name,
    metadata: {
      fields: Object.keys(req.body),
      ...(before && before.name !== project.name ? { from: before.name, to: project.name } : {}),
    },
  });
  res.status(200).json({ success: true, data: { project } });
});

export const deleteProject = catchAsync(async (req: Request, res: Response) => {
  const before = await Project.findById(req.params.projectId).select('name workspaceId');
  await projectService.deleteProject(req.params.projectId);
  if (before) {
    await recordAudit(req, {
      workspaceId: before.workspaceId.toString(),
      action: 'project.deleted',
      targetType: 'project',
      targetId: req.params.projectId,
      targetLabel: before.name,
    });
  }
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
  const [column, project] = await Promise.all([
    Column.findById(req.params.columnId).select('name'),
    Project.findById(req.params.projectId).select('workspaceId name'),
  ]);
  await projectService.deleteColumn(
    req.params.columnId,
    req.params.projectId,
    req.query.moveTasksTo as string | undefined
  );
  if (project) {
    await recordAudit(req, {
      workspaceId: project.workspaceId.toString(),
      action: 'column.deleted',
      targetType: 'column',
      targetId: req.params.columnId,
      targetLabel: column?.name,
      metadata: { project: project.name },
    });
  }
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
