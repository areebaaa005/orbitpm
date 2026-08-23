import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
  }),
});

export const inviteMemberSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
    role: z.enum(['admin', 'pm', 'member', 'viewer']),
  }),
});

export const acceptInvitationSchema = z.object({
  body: z.object({
    token: z.string().min(10),
  }),
});

export const updateMemberRoleSchema = z.object({
  body: z.object({
    role: z.enum(['admin', 'pm', 'member', 'viewer']),
  }),
});
