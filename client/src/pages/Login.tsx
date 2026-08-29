import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAcceptInvitation } from '../hooks/useWorkspaceData';
import { OrbitMark } from '../components/OrbitMark';
import { PENDING_INVITE_KEY } from './AcceptInvite';

export default function Login() {
  const { login } = useAuth();
  const acceptInvitation = useAcceptInvitation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
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
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Something went wrong. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-space-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <OrbitMark size={32} />
          <span className="font-display text-xl font-semibold text-white">OrbitPM</span>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-semibold text-gray-100">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-400">Sign in to keep your projects moving.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-space-300">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-orbit-300 hover:text-white">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
