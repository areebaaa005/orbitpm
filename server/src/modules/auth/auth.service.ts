import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, IUser } from '../users/user.model';
import { RefreshSession } from './refreshSession.model';
import { ApiError } from '../../utils/ApiError';
import { OAuth2Client } from 'google-auth-library';
import { signAccessToken, signRefreshToken, verifyRefreshToken, signTwoFactorChallenge } from '../../utils/jwt';
import { env } from '../../config/env';
import { RegisterInput, LoginInput } from './auth.validation';

const SALT_ROUNDS = 12;
// A refresh token used twice within this window is treated as a duplicate request (two tabs, a retry),
// not as theft.
const REUSE_GRACE_MS = 10_000;

export function sanitizeUser(user: IUser) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar || null,
    twoFactorEnabled: !!user.twoFactor?.enabled,
    googleLinked: !!user.googleId,
    hasPassword: user.passwordSet !== false,
  };
}

export async function createSession(userId: string, userAgent?: string) {
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

  // Password is correct, but a second factor is still required: no session yet, only a short-lived challenge.
  if (user.twoFactor?.enabled) {
    return { twoFactorRequired: true as const, challengeToken: signTwoFactorChallenge(user._id.toString()) };
  }

  user.lastSeenAt = new Date();
  await user.save();

  const tokens = await createSession(user._id.toString(), userAgent);
  return { twoFactorRequired: false as const, user: sanitizeUser(user), ...tokens };
}

// ---------- Google sign-in ----------

const googleClient = new OAuth2Client();

interface GoogleIdentity {
  sub: string;
  email: string;
  name: string;
}

/** Checks the signature, expiry, issuer and audience of a Google ID token, and that the email is verified. */
async function verifyGoogleCredential(credential: string): Promise<GoogleIdentity> {
  if (!env.googleClientId) {
    throw new ApiError(503, 'GOOGLE_NOT_CONFIGURED', 'Google sign-in is not set up on this server');
  }
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.googleClientId });
    payload = ticket.getPayload();
  } catch {
    throw ApiError.unauthorized('Google sign-in failed. Please try again.');
  }
  if (!payload?.sub || !payload.email) throw ApiError.unauthorized('Google sign-in failed. Please try again.');
  if (payload.email_verified !== true) throw ApiError.unauthorized('Your Google email address is not verified.');
  const email = payload.email.toLowerCase();
  return { sub: payload.sub, email, name: (payload.name || email.split('@')[0]).slice(0, 80) };
}

/**
 * Sign in (or sign up) with Google. An existing password account is NOT linked automatically: registration does not
 * verify email ownership, so linking by email alone would let someone who pre-registered a victim's address keep
 * access. The owner links Google from the Security page while signed in instead.
 */
export async function loginWithGoogle(credential: string, userAgent?: string) {
  const google = await verifyGoogleCredential(credential);

  let user = await User.findOne({ googleId: google.sub });
  if (!user) {
    if (await User.findOne({ email: google.email })) {
      throw ApiError.conflict(
        'An account with this email already exists. Sign in with your password, then connect Google in Security settings.'
      );
    }
    user = await User.create({
      name: google.name,
      email: google.email,
      googleId: google.sub,
      passwordSet: false,
      // Unusable on purpose: the account signs in with Google, so nobody knows this password.
      passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS),
    });
  }

  if (user.status === 'suspended') throw ApiError.forbidden('This account has been suspended');

  // Google proves who they are, but our own second factor still applies if the user turned it on
  if (user.twoFactor?.enabled) {
    return { twoFactorRequired: true as const, challengeToken: signTwoFactorChallenge(user._id.toString()) };
  }

  user.lastSeenAt = new Date();
  await user.save();
  const tokens = await createSession(user._id.toString(), userAgent);
  return { twoFactorRequired: false as const, user: sanitizeUser(user), ...tokens };
}

/** Connect a Google account to the signed-in user (lets a password account use 'Continue with Google'). */
export async function linkGoogle(userId: string, credential: string) {
  const google = await verifyGoogleCredential(credential);
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  if (user.googleId) throw ApiError.conflict('A Google account is already connected');

  const taken = await User.findOne({ googleId: google.sub });
  if (taken) throw ApiError.conflict('That Google account is already connected to another user');

  user.googleId = google.sub;
  await user.save();
  return sanitizeUser(user);
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

  if (!session) {
    throw ApiError.unauthorized('Session is no longer valid');
  }

  // An already-rotated token coming back after the grace window means someone kept a copy of it:
  // revoke every session of this user so the thief and the real user both have to sign in again.
  if (session.rotatedAt && Date.now() - session.rotatedAt.getTime() > REUSE_GRACE_MS) {
    await RefreshSession.updateMany({ userId: payload.userId, revokedAt: null }, { revokedAt: new Date() });
    throw ApiError.unauthorized('Session is no longer valid');
  }

  if (session.revokedAt || session.expiresAt < new Date()) {
    throw ApiError.unauthorized('Session is no longer valid');
  }

  // Rotate: revoke old session, issue a new one (prevents replay of stolen tokens)
  session.revokedAt = new Date();
  session.rotatedAt = session.revokedAt;
  await session.save();

  const user = await User.findById(payload.userId);
  if (!user) {
    throw ApiError.unauthorized('User no longer exists');
  }

  // A suspended account must not be able to keep renewing its session.
  if (user.status === 'suspended') {
    await RefreshSession.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });
    throw ApiError.forbidden('This account has been suspended');
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
