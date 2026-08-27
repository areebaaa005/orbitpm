import { z } from 'zod';

export const createSprintSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    goal: z.string().trim().max(500).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

export const assignSprintSchema = z.object({
  body: z.object({
    sprintId: z.string().nullable(),
  }),
});
