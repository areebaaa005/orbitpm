import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const createCommentSchema = z.object({
  body: z.object({
    body: z.string().trim().min(1).max(3000),
    mentions: z.array(objectId).optional(),
  }),
});
