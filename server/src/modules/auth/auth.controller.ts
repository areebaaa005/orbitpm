import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { env } from '../../config/env';
import * as authService from './auth.service';
import * as userService from '../users/user.service';
import * as twoFactorService from './twofactor.service';

const REFRESH_COOKIE_NAME = 'refreshToken';

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    // 'none' is required for cross-domain cookies (Vercel <-> Render) in
    // production; 'lax' works for local dev where Vite proxies same-origin.
    sameSite: env.nodeEnv === 'production' ? ('none' as const) : ('lax' as const),
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
  if (result.twoFactorRequired) {
    // Password was right but a code is still needed: no cookie, no access token yet.
    return res.status(200).json({
      success: true,
      data: { twoFactorRequired: true, challengeToken: result.challengeToken },
    });
  }
  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());
  res.status(200).json({
    success: true,
    data: { user: result.user, accessToken: result.accessToken },
  });
});

export const twoFactorVerify = catchAsync(async (req: Request, res: Response) => {
  const result = await twoFactorService.verifyLogin(req.body.challengeToken, req.body.code, req.headers['user-agent']);
  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());
  res.status(200).json({ success: true, data: { user: result.user, accessToken: result.accessToken } });
});

export const twoFactorSetup = catchAsync(async (req: Request, res: Response) => {
  const data = await twoFactorService.beginSetup(req.userId!);
  res.status(200).json({ success: true, data });
});

export const twoFactorEnable = catchAsync(async (req: Request, res: Response) => {
  const data = await twoFactorService.confirmEnable(req.userId!, req.body.code);
  res.status(200).json({ success: true, data });
});

export const twoFactorDisable = catchAsync(async (req: Request, res: Response) => {
  await twoFactorService.disable(req.userId!, req.body.password, req.body.code);
  res.status(200).json({ success: true, data: null });
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

export const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.updateProfile(req.userId!, req.body);
  res.status(200).json({ success: true, data: { user } });
});
