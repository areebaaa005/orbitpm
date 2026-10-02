import { z } from 'zod';

const dateField = z.coerce.date().nullable().optional();
const orderedDates = (b: { startDate?: Date | null; endDate?: Date | null }) =>
  !b.startDate || !b.endDate || b.endDate >= b.startDate;
const datesMessage = { message: 'End date must be on or after the start date', path: ['endDate'] };

export const createEpicSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(2000).optional(),
    color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    startDate: dateField,
    endDate: dateField,
  }).refine(orderedDates, datesMessage),
});

export const updateEpicSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(2000).optional(),
    color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    status: z.enum(['open', 'closed']).optional(),
    startDate: dateField,
    endDate: dateField,
  }).refine(orderedDates, datesMessage),
});
