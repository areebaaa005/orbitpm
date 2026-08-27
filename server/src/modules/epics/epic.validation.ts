import { z } from 'zod';

export const createEpicSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(2000).optional(),
    color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  }),
});

export const updateEpicSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(2000).optional(),
    color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    status: z.enum(['open', 'closed']).optional(),
  }),
});
