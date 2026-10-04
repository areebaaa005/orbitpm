import { User, IUser } from '../users/user.model';
import { ApiError } from '../../utils/ApiError';
import { verifyTwoFactorChallenge } from '../../utils/jwt';
import {
  generateSecret,
  verifyTotp,
  otpauthUrl,
  encryptSecret,
  decryptSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  matchRecoveryHash,
} from '../../utils/totp';
import { createSession, sanitizeUser } from './auth.service';

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;

const SECRET_FIELDS =
  '+passwordHash +twoFactor.secretEnc +twoFactor.pendingSecretEnc +twoFactor.recoveryCodeHashes ' +
  '+twoFactor.lastUsedStep +twoFactor.failedAttempts +twoFactor.lockedUntil';

const loadWithSecrets = (userId: string) => User.findById(userId).select(SECRET_FIELDS);

/** Brute-forcing a 6-digit code is feasible without a limit, so repeated failures lock the account's 2FA for a while. */
function assertNotLocked(user: IUser) {
  const until = user.twoFactor?.lockedUntil;
  if (until && until > new Date()) {
    const minutes = Math.ceil((until.getTime() - Date.now()) / 60000);
    throw new ApiError(429, 'TOO_MANY_ATTEMPTS', `Too many incorrect codes. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`);
  }
}

async function registerFailure(userId: string) {
  const updated = await User.findByIdAndUpdate(userId, { $inc: { 'twoFactor.failedAttempts': 1 } }, { new: true }).select(
    '+twoFactor.failedAttempts'
  );
  if ((updated?.twoFactor?.failedAttempts ?? 0) >= MAX_FAILURES) {
    await User.updateOne(
      { _id: userId },
      { $set: { 'twoFactor.failedAttempts': 0, 'twoFactor.lockedUntil': new Date(Date.now() + LOCK_MS) } }
    );
  }
}

/** Accepts either a 6-digit authenticator code or a one-time recovery code. Each can be used once. */
async function checkSecondFactor(user: IUser, code: string): Promise<boolean> {
  const tf = user.twoFactor;
  const input = (code || '').trim();
  if (!tf?.secretEnc || !input) return false;

  if (/^\d{6}$/.test(input)) {
    const step = verifyTotp(decryptSecret(tf.secretEnc), input, Date.now(), tf.lastUsedStep);
    if (step === null) return false;
    // Atomic: when two requests carry the same code, only one can advance lastUsedStep.
    const res = await User.updateOne(
      {
        _id: user._id,
        $or: [
          { 'twoFactor.lastUsedStep': { $exists: false } },
          { 'twoFactor.lastUsedStep': null },
          { 'twoFactor.lastUsedStep': { $lt: step } },
        ],
      },
      { $set: { 'twoFactor.lastUsedStep': step } }
    );
    return res.modifiedCount === 1;
  }

  const match = matchRecoveryHash(tf.recoveryCodeHashes ?? [], input);
  if (!match) return false;
  const res = await User.updateOne(
    { _id: user._id, 'twoFactor.recoveryCodeHashes': match },
    { $pull: { 'twoFactor.recoveryCodeHashes': match } }
  );
  return res.modifiedCount === 1;
}

/** Step 1 of enabling: create a secret and hand it to the user (as QR/URL). Not active until confirmed. */
export async function beginSetup(userId: string) {
  const user = await loadWithSecrets(userId);
  if (!user) throw ApiError.notFound('User not found');
  if (user.twoFactor?.enabled) throw ApiError.conflict('Two-factor authentication is already enabled');

  const secret = generateSecret();
  await User.updateOne({ _id: userId }, { $set: { 'twoFactor.pendingSecretEnc': encryptSecret(secret) } });
  return { secret, otpauthUrl: otpauthUrl(user.email, secret) };
}

/** Step 2: the user proves their app works by entering a code. Returns the recovery codes (shown only once). */
export async function confirmEnable(userId: string, code: string) {
  const user = await loadWithSecrets(userId);
  if (!user) throw ApiError.notFound('User not found');
  if (user.twoFactor?.enabled) throw ApiError.conflict('Two-factor authentication is already enabled');
  const pending = user.twoFactor?.pendingSecretEnc;
  if (!pending) throw ApiError.badRequest('SETUP_NOT_STARTED', 'Start the setup first');

  const step = verifyTotp(decryptSecret(pending), (code || '').trim());
  if (step === null) throw ApiError.badRequest('INVALID_CODE', 'That code is not correct. Check your app and try again.');

  const recoveryCodes = generateRecoveryCodes();
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        'twoFactor.enabled': true,
        'twoFactor.enabledAt': new Date(),
        'twoFactor.secretEnc': pending,
        'twoFactor.recoveryCodeHashes': recoveryCodes.map(hashRecoveryCode),
        'twoFactor.lastUsedStep': step,
        'twoFactor.failedAttempts': 0,
      },
      $unset: { 'twoFactor.pendingSecretEnc': 1, 'twoFactor.lockedUntil': 1 },
    }
  );
  return { recoveryCodes };
}

/** Second step of signing in: exchanges the password-step challenge + a code for a real session. */
export async function verifyLogin(challengeToken: string, code: string, userAgent?: string) {
  let userId: string;
  try {
    userId = verifyTwoFactorChallenge(challengeToken).userId;
  } catch {
    throw ApiError.unauthorized('Your sign-in expired. Please sign in again.');
  }

  const user = await loadWithSecrets(userId);
  if (!user || !user.twoFactor?.enabled) throw ApiError.unauthorized('Your sign-in expired. Please sign in again.');
  if (user.status === 'suspended') throw ApiError.forbidden('This account has been suspended');
  assertNotLocked(user);

  if (!(await checkSecondFactor(user, code))) {
    await registerFailure(userId);
    throw ApiError.unauthorized('Invalid code');
  }

  await User.updateOne(
    { _id: userId },
    { $set: { 'twoFactor.failedAttempts': 0, lastSeenAt: new Date() }, $unset: { 'twoFactor.lockedUntil': 1 } }
  );
  const tokens = await createSession(userId, userAgent);
  return { user: sanitizeUser(user), ...tokens };
}

/** Turning 2FA off needs both the password and a current code, so a stolen session alone cannot remove it. */
export async function disable(userId: string, password: string, code: string) {
  const user = await loadWithSecrets(userId);
  if (!user) throw ApiError.notFound('User not found');
  if (!user.twoFactor?.enabled) throw ApiError.badRequest('NOT_ENABLED', 'Two-factor authentication is not enabled');
  assertNotLocked(user);

  if (!(await user.comparePassword(password))) throw ApiError.unauthorized('Incorrect password');
  if (!(await checkSecondFactor(user, code))) {
    await registerFailure(userId);
    throw ApiError.unauthorized('Invalid code');
  }

  await User.updateOne(
    { _id: userId },
    {
      $set: { 'twoFactor.enabled': false },
      $unset: {
        'twoFactor.secretEnc': 1,
        'twoFactor.pendingSecretEnc': 1,
        'twoFactor.recoveryCodeHashes': 1,
        'twoFactor.lastUsedStep': 1,
        'twoFactor.failedAttempts': 1,
        'twoFactor.lockedUntil': 1,
        'twoFactor.enabledAt': 1,
      },
    }
  );
}

export async function recoveryCodesRemaining(userId: string): Promise<number> {
  const user = await User.findById(userId).select('+twoFactor.recoveryCodeHashes');
  return user?.twoFactor?.recoveryCodeHashes?.length ?? 0;
}
