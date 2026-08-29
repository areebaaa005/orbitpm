import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAcceptInvitation } from '../hooks/useWorkspaceData';
import { OrbitMark } from '../components/OrbitMark';
import { PENDING_INVITE_KEY } from './AcceptInvite';

export default function Register() {
  const { register } = useAuth();
  const acceptInvitation = useAcceptInvitation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register(name, email, password);
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
          <h1 className="text-xl font-semibold text-gray-100">Create your account</h1>
          <p className="mt-1 text-sm text-gray-400">Start organizing your team's work.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-100">Full name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="Areeba Khan"
              />
            </div>
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
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="At least 8 characters"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-space-300">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-orbit-300 hover:text-white">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
