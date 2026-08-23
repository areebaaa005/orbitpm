import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { env } from '../../config/env';
import * as authService from './auth.service';

const REFRESH_COOKIE_NAME = 'refreshToken';

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax' as const,
    path: '/api/v1/auth',
    maxAge: env.jwtRefreshExpiresInDays * 24 * 60 * 60 * 1000,
  };
}

export const register = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.registerUser(req.body, req.headers['user-agent']);
  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());
  res.status(201).json({
    success: true,
    data: { user: result.user, accessToken: result.accessToken },
  });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.loginUser(req.body, req.headers['user-agent']);
  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());
  res.status(200).json({
    success: true,
    data: { user: result.user, accessToken: result.accessToken },
  });
});

export const refresh = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  const result = await authService.refreshSession(token);
  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());
  res.status(200).json({
    success: true,
    data: { user: result.user, accessToken: result.accessToken },
  });
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  await authService.logoutUser(token);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
  res.status(200).json({ success: true, data: null });
});

export const me = catchAsync(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.userId!);
  res.status(200).json({ success: true, data: { user } });
});
