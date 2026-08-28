import { ReactNode, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { OrbitMark } from './OrbitMark';
import { NotificationBell } from './NotificationBell';
import { EditProfileModal } from './EditProfileModal';
import { CommandPalette } from './CommandPalette';
import { useAuth } from '../context/AuthContext';

export function AppLayout({
  children,
  workspaceId,
}: {
  children: ReactNode;
  workspaceId?: string;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2" onClick={() => setMobileNavOpen(false)}>
          <OrbitMark size={26} />
          <span className="font-display text-lg font-semibold text-white">OrbitPM</span>
        </Link>
        <button
          onClick={() => setMobileNavOpen(false)}
          className="rounded p-1 text-space-300 hover:text-white md:hidden"
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      <nav className="flex-1 px-3 py-2">
        <Link
          to="/"
          onClick={() => setMobileNavOpen(false)}
          className="block rounded-lg px-3 py-2 text-sm font-medium text-space-100 transition hover:bg-space-800 hover:text-white"
        >
          Workspaces
        </Link>
      </nav>

      <div className="border-t border-space-800 px-3 py-4">
        <button
          onClick={() => setEditProfileOpen(true)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-space-800"
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orbit-500 text-sm font-semibold text-white">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
            <p className="truncate text-xs text-space-300">{user?.email}</p>
          </div>
        </button>
        <button
          onClick={handleLogout}
          className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-space-300 transition hover:bg-space-800 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-shrink-0 flex-col bg-space-950 text-space-100 md:flex">
        {sidebarContent}
      </aside>

      {/* Mobile slide-in sidebar */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative flex w-64 flex-col bg-space-950 text-space-100">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5 md:justify-end md:px-6">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="rounded p-1.5 text-ink-600 hover:bg-gray-100 md:hidden"
            aria-label="Open menu"
          >
            ☰
          </button>
          <span className="hidden items-center gap-1 text-xs text-ink-400 md:flex">
            Press <kbd className="rounded border border-gray-200 px-1.5 py-0.5 font-sans text-[10px]">Ctrl K</kbd> to search
          </span>
          <NotificationBell />
        </div>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {editProfileOpen && <EditProfileModal onClose={() => setEditProfileOpen(false)} />}
      <CommandPalette workspaceId={workspaceId} />
    </div>
  );
}
