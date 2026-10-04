import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
    email: z.string().trim().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80).optional(),
    email: z.string().trim().email('Invalid email address').optional(),
  }),
});

const codeField = z.string().trim().min(6, 'Enter your code').max(20);

export const googleCredentialSchema = z.object({
  body: z.object({ credential: z.string().min(20).max(4096) }),
});

export const twoFactorVerifySchema = z.object({
  body: z.object({ challengeToken: z.string().min(10), code: codeField }),
});
export const twoFactorEnableSchema = z.object({
  body: z.object({ code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code from your app') }),
});
export const twoFactorDisableSchema = z.object({
  body: z.object({ password: z.string().min(1, 'Password is required'), code: codeField }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
