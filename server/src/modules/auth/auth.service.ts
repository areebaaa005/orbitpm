import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, IUser } from '../users/user.model';
import { RefreshSession } from './refreshSession.model';
import { ApiError } from '../../utils/ApiError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { env } from '../../config/env';
import { RegisterInput, LoginInput } from './auth.validation';

const SALT_ROUNDS = 12;

function sanitizeUser(user: IUser) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar || null,
  };
}

async function createSession(userId: string, userAgent?: string) {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + env.jwtRefreshExpiresInDays * 24 * 60 * 60 * 1000);

  await RefreshSession.create({ userId, sessionId, userAgent, expiresAt });

  const accessToken = signAccessToken({ userId });
  const refreshToken = signRefreshToken({ userId, sessionId });

  return { accessToken, refreshToken };
}

export async function registerUser(input: RegisterInput, userAgent?: string) {
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,
  });

  const tokens = await createSession(user._id.toString(), userAgent);
  return { user: sanitizeUser(user), ...tokens };
}

export async function loginUser(input: LoginInput, userAgent?: string) {
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  // Generic message on purpose: don't leak whether the email exists
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const isMatch = await user.comparePassword(input.password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (user.status === 'suspended') {
    throw ApiError.forbidden('This account has been suspended');
  }

  user.lastSeenAt = new Date();
  await user.save();

  const tokens = await createSession(user._id.toString(), userAgent);
  return { user: sanitizeUser(user), ...tokens };
}

export async function refreshSession(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const session = await RefreshSession.findOne({
    sessionId: payload.sessionId,
    userId: payload.userId,
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw ApiError.unauthorized('Session is no longer valid');
  }

  // Rotate: revoke old session, issue a new one (prevents replay of stolen tokens)
  session.revokedAt = new Date();
  await session.save();

  const user = await User.findById(payload.userId);
  if (!user) {
    throw ApiError.unauthorized('User no longer exists');
  }

  const tokens = await createSession(user._id.toString());
  return { user: sanitizeUser(user), ...tokens };
}

export async function logoutUser(refreshToken: string | undefined) {
  if (!refreshToken) return;
  try {
    const payload = verifyRefreshToken(refreshToken);
    await RefreshSession.updateOne(
      { sessionId: payload.sessionId },
      { revokedAt: new Date() }
    );
  } catch {
    // Token already invalid/expired — nothing to revoke, fail silently
  }
}

export async function getCurrentUser(userId: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return sanitizeUser(user);
}
