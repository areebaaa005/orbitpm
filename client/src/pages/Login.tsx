import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAcceptInvitation } from '../hooks/useWorkspaceData';
import { AuthLayout } from '../components/AuthLayout';
import { OrbitMark } from '../components/OrbitMark';
import { PENDING_INVITE_KEY } from './AcceptInvite';

export default function Login() {
  const { login, verifyTwoFactor } = useAuth();
  const acceptInvitation = useAcceptInvitation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Set once the password step succeeded for an account with 2FA
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);

  async function finishSignIn() {
    const pendingToken = sessionStorage.getItem(PENDING_INVITE_KEY);
    if (pendingToken) {
      try {
        await acceptInvitation.mutateAsync(pendingToken);
      } catch {
        // Invitation may have expired or already been used — non-fatal, continue to app.
      }
      sessionStorage.removeItem(PENDING_INVITE_KEY);
    }
    navigate('/');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (challengeToken) {
        await verifyTwoFactor(challengeToken, code.trim());
        await finishSignIn();
      } else {
        const result = await login(email, password);
        if (result.challengeToken) {
          setChallengeToken(result.challengeToken);
        } else {
          await finishSignIn();
        }
      }
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || 'Something went wrong. Try again.';
      setError(message);
      // The sign-in step expires after 5 minutes: go back to the password form
      if (challengeToken && err?.response?.status === 401 && /expired/i.test(message)) {
        setChallengeToken(null);
        setCode('');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
          <OrbitMark size={32} />
          <span className="font-display text-xl font-semibold text-space-50">OrbitPM</span>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-semibold text-gray-100">
            {challengeToken ? 'Two-factor authentication' : 'Welcome back'}
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {challengeToken
              ? useRecovery
                ? 'Enter one of your recovery codes.'
                : 'Enter the 6-digit code from your authenticator app.'
              : 'Sign in to keep your projects moving.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {challengeToken ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-100">
                  {useRecovery ? 'Recovery code' : 'Authentication code'}
                </label>
                <input
                  autoFocus
                  required
                  value={code}
                  onChange={(e) => setCode(useRecovery ? e.target.value : e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode={useRecovery ? 'text' : 'numeric'}
                  autoComplete="one-time-code"
                  className="input-field text-center font-mono text-lg tracking-widest"
                  placeholder={useRecovery ? 'xxxxx-xxxxx' : '123456'}
                />
              </div>
            ) : (
            <>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-100">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-100">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
              />
            </div>
            </>
            )}

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? (challengeToken ? 'Verifying…' : 'Signing in…') : challengeToken ? 'Verify' : 'Sign in'}
            </button>

            {challengeToken && (
              <div className="flex justify-between text-xs">
                <button
                  type="button"
                  className="text-orbit-300 hover:text-space-50"
                  onClick={() => {
                    setUseRecovery((v) => !v);
                    setCode('');
                    setError(null);
                  }}
                >
                  {useRecovery ? 'Use authenticator app' : 'Use a recovery code'}
                </button>
                <button
                  type="button"
                  className="text-space-400 hover:text-space-50"
                  onClick={() => {
                    setChallengeToken(null);
                    setCode('');
                    setUseRecovery(false);
                    setError(null);
                  }}
                >
                  Back
                </button>
              </div>
            )}
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-space-300">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-orbit-300 hover:text-space-50">
            Create one
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
