import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import * as taskService from './task.service';

export const createTask = catchAsync(async (req: Request, res: Response) => {
  const task = await taskService.createTask(
    req.workspaceId!,
    req.params.projectId,
    req.userId!,
    req.body
  );
  res.status(201).json({ success: true, data: { task } });
});

export const listTasks = catchAsync(async (req: Request, res: Response) => {
  const { columnId, assigneeId, priority, search, page, limit } = req.query;
  const result = await taskService.listTasks(req.params.projectId, {
    columnId: columnId as string,
    assigneeId: assigneeId as string,
    priority: priority as string,
    search: search as string,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });
  res.status(200).json({ success: true, data: result });
});

export const getTask = catchAsync(async (req: Request, res: Response) => {
  const task = await taskService.getTask(req.params.taskId);
  res.status(200).json({ success: true, data: { task } });
});

export const updateTask = catchAsync(async (req: Request, res: Response) => {
  const task = await taskService.updateTask(req.params.taskId, req.body, req.userId!);
  res.status(200).json({ success: true, data: { task } });
});

export const deleteTask = catchAsync(async (req: Request, res: Response) => {
  await taskService.deleteTask(req.params.taskId);
  res.status(200).json({ success: true, data: null });
});

export const moveTask = catchAsync(async (req: Request, res: Response) => {
  const task = await taskService.moveTask(
    req.params.taskId,
    req.body.columnId,
    req.body.order,
    req.userId!
  );
  res.status(200).json({ success: true, data: { task } });
});
