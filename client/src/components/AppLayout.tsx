import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { OrbitMark } from './OrbitMark';
import { useAuth } from '../context/AuthContext';

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="flex w-60 flex-shrink-0 flex-col bg-space-950 text-space-100">
        <Link to="/" className="flex items-center gap-2 px-5 py-5">
          <OrbitMark size={26} />
          <span className="font-display text-lg font-semibold text-white">OrbitPM</span>
        </Link>

        <nav className="flex-1 px-3 py-2">
          <Link
            to="/"
            className="block rounded-lg px-3 py-2 text-sm font-medium text-space-100 transition hover:bg-space-800 hover:text-white"
          >
            Workspaces
          </Link>
        </nav>

        <div className="border-t border-space-800 px-3 py-4">
          <div className="flex items-center gap-2 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orbit-500 text-sm font-semibold text-white">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user?.name}</p>
              <p className="truncate text-xs text-space-300">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-space-300 transition hover:bg-space-800 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
