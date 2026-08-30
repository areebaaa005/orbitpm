import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAcceptInvitation, useInvitationPreview } from '../hooks/useWorkspaceData';
import { OrbitMark } from '../components/OrbitMark';

export const PENDING_INVITE_KEY = 'orbitpm_pending_invite_token';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, isLoading: authLoading, logout } = useAuth();
  const acceptInvitation = useAcceptInvitation();
  const { data: preview, isLoading: previewLoading, isError: previewError } = useInvitationPreview(token);
  const navigate = useNavigate();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Always stash the token so whichever path the person takes next
  // (sign in, register, or switch account) picks it back up automatically.
  useEffect(() => {
    if (token) sessionStorage.setItem(PENDING_INVITE_KEY, token);
  }, [token]);

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

  async function handleSwitchAccount(destination: '/login' | '/register') {
    if (user) await logout();
    navigate(destination);
  }

  if (!token) {
    return (
      <CenteredCard>
        <p className="text-sm text-gray-400">This invitation link is missing its token.</p>
      </CenteredCard>
    );
  }

  if (authLoading || previewLoading) {
    return (
      <CenteredCard>
        <p className="text-sm text-gray-400">Loading…</p>
      </CenteredCard>
    );
  }

  if (previewError || !preview) {
    return (
      <CenteredCard>
        <p className="text-sm text-red-400">
          This invitation link is invalid or has expired. Ask whoever invited you to send a new one.
        </p>
      </CenteredCard>
    );
  }

  const isCorrectAccount = user && user.email.toLowerCase() === preview.email.toLowerCase();

  // Not logged in, or logged in as the wrong person — never show an Accept
  // button here, since it would just fail. Only offer the two real options.
  if (!isCorrectAccount) {
    return (
      <CenteredCard>
        <h1 className="text-lg font-semibold text-gray-100">
          You've been invited to {preview.workspaceName}
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          This invitation is for <strong className="text-gray-200">{preview.email}</strong>.
          {user && (
            <>
              {' '}
              You're currently signed in as <strong className="text-gray-200">{user.email}</strong>.
            </>
          )}
        </p>
        <p className="mt-2 text-sm text-gray-400">
          Already have an account with that email? Sign in. First time? Create one — either way
          you'll be added to the workspace automatically.
        </p>
        <div className="mt-5 flex gap-2">
          <button onClick={() => handleSwitchAccount('/login')} className="btn-primary flex-1">
            Sign in
          </button>
          <button onClick={() => handleSwitchAccount('/register')} className="btn-secondary flex-1">
            Create account
          </button>
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
          <h1 className="text-lg font-semibold text-gray-100">Join {preview.workspaceName}?</h1>
          <p className="mt-2 text-sm text-gray-400">
            Signed in as <strong>{user!.email}</strong>. You'll join as a{' '}
            <strong className="capitalize">{preview.role}</strong>.
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
