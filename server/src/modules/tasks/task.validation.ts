import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const labelSchema = z.object({
  name: z.string().trim().min(1).max(30),
  color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a hex value'),
});

const checklistItemSchema = z.object({
  _id: z.string().optional(),
  text: z.string().trim().min(1).max(200),
  done: z.boolean().optional(),
});

export const createTaskSchema = z.object({
  body: z.object({
    columnId: objectId,
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).optional(),
    assigneeIds: z.array(objectId).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    type: z.enum(['task', 'bug', 'story', 'spike']).optional(),
    storyPoints: z.number().min(0).max(100).optional(),
    epicId: objectId.optional(),
    labels: z.array(labelSchema).optional(),
    dueDate: z.string().datetime().optional(),
  }),
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    assigneeIds: z.array(objectId).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    type: z.enum(['task', 'bug', 'story', 'spike']).optional(),
    storyPoints: z.number().min(0).max(100).nullable().optional(),
    epicId: objectId.nullable().optional(),
    labels: z.array(labelSchema).optional(),
    checklist: z.array(checklistItemSchema).optional(),
    dueDate: z.string().datetime().nullable().optional(),
  }),
});

export const moveTaskSchema = z.object({
  body: z.object({
    columnId: objectId,
    order: z.number().int().min(0),
  }),
});
