import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const createTaskSchema = z.object({
  body: z.object({
    columnId: objectId,
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).optional(),
    assigneeIds: z.array(objectId).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    labels: z.array(z.string().trim().max(30)).optional(),
    dueDate: z.string().datetime().optional(),
  }),
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    assigneeIds: z.array(objectId).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    labels: z.array(z.string().trim().max(30)).optional(),
    dueDate: z.string().datetime().nullable().optional(),
  }),
});

export const moveTaskSchema = z.object({
  body: z.object({
    columnId: objectId,
    order: z.number().int().min(0),
  }),
});
