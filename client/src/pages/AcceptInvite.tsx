import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAcceptInvitation } from '../hooks/useWorkspaceData';
import { OrbitMark } from '../components/OrbitMark';

export const PENDING_INVITE_KEY = 'orbitpm_pending_invite_token';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, isLoading: authLoading } = useAuth();
  const acceptInvitation = useAcceptInvitation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // If the person isn't logged in yet, stash the token and send them to log
  // in or register first — we pick this back up right after that succeeds.
  useEffect(() => {
    if (!authLoading && !user && token) {
      sessionStorage.setItem(PENDING_INVITE_KEY, token);
    }
  }, [authLoading, user, token]);

  async function handleAccept() {
    if (!token) return;
    try {
      await acceptInvitation.mutateAsync(token);
      sessionStorage.removeItem(PENDING_INVITE_KEY);
      setStatus('success');
      setTimeout(() => navigate('/'), 1200);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err?.response?.data?.error?.message || 'This invitation could not be accepted.');
    }
  }

  if (!token) {
    return (
      <CenteredCard>
        <p className="text-sm text-gray-400">This invitation link is missing its token.</p>
      </CenteredCard>
    );
  }

  if (authLoading) {
    return (
      <CenteredCard>
        <p className="text-sm text-gray-400">Loading…</p>
      </CenteredCard>
    );
  }

  if (!user) {
    return (
      <CenteredCard>
        <h1 className="text-lg font-semibold text-gray-100">You've been invited to OrbitPM</h1>
        <p className="mt-2 text-sm text-gray-400">
          Log in or create an account first — we'll add you to the workspace automatically right after.
        </p>
        <div className="mt-5 flex gap-2">
          <Link to="/login" className="btn-primary flex-1 text-center">
            Sign in
          </Link>
          <Link to="/register" className="btn-secondary flex-1 text-center">
            Create account
          </Link>
        </div>
      </CenteredCard>
    );
  }

  return (
    <CenteredCard>
      {status === 'success' ? (
        <>
          <h1 className="text-lg font-semibold text-emerald-400">You're in! 🎉</h1>
          <p className="mt-2 text-sm text-gray-400">Redirecting you to your workspaces…</p>
        </>
      ) : (
        <>
          <h1 className="text-lg font-semibold text-gray-100">Join this workspace?</h1>
          <p className="mt-2 text-sm text-gray-400">
            Signed in as <strong>{user.email}</strong>. Accepting will add this workspace to your list.
          </p>
          {status === 'error' && (
            <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{errorMessage}</p>
          )}
          <button
            onClick={handleAccept}
            disabled={acceptInvitation.isPending}
            className="btn-primary mt-5 w-full"
          >
            {acceptInvitation.isPending ? 'Joining…' : 'Accept invitation'}
          </button>
        </>
      )}
    </CenteredCard>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-space-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <OrbitMark size={32} />
          <span className="font-display text-xl font-semibold text-white">OrbitPM</span>
        </div>
        <div className="card p-8">{children}</div>
      </div>
    </div>
  );
}
