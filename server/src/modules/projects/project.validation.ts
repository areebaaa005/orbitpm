import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    key: z
      .string()
      .trim()
      .min(2)
      .max(10)
      .regex(/^[A-Za-z0-9]+$/, 'Key must be alphanumeric'),
    description: z.string().trim().max(2000).optional(),
  }),
});

export const updateProjectSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(2000).optional(),
    status: z.enum(['active', 'archived']).optional(),
  }),
});

export const createColumnSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(50),
    color: z.string().trim().optional(),
  }),
});
