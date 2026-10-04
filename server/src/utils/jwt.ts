import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AccessTokenPayload {
  userId: string;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn,
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: `${env.jwtRefreshExpiresInDays}d`,
  } as jwt.SignOptions);
}

/** Short-lived token proving the password step passed; only good for submitting a 2FA code. */
const challengeSecret = () => `${env.jwtAccessSecret}:2fa-challenge`;

export function signTwoFactorChallenge(userId: string): string {
  return jwt.sign({ userId, purpose: '2fa' }, challengeSecret(), { expiresIn: '5m' });
}

export function verifyTwoFactorChallenge(token: string): { userId: string } {
  const payload = jwt.verify(token, challengeSecret()) as { userId: string; purpose?: string };
  if (payload.purpose !== '2fa') throw new Error('Wrong token purpose');
  return { userId: payload.userId };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.jwtRefreshSecret) as RefreshTokenPayload;
}
