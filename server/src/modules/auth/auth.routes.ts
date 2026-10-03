import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { registerSchema, loginSchema, updateProfileSchema } from './auth.validation';
import * as authController from './auth.controller';
import { env } from '../../config/env';

const router = Router();

// Stricter limiter on auth endpoints to slow down brute-force/credential-stuffing attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts, please try again later' } },
});

// Looser limiter for session endpoints: the client calls /refresh on every page load, but it is still a
// credential-bearing endpoint and should not be open to unlimited guessing or flooding.
const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.nodeEnv === 'test',
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } },
});

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', sessionLimiter, authController.refresh);
router.post('/logout', sessionLimiter, authController.logout)
router.get('/me', requireAuth, authController.me);
router.patch('/me', requireAuth, validate(updateProfileSchema), authController.updateProfile);

export default router;
