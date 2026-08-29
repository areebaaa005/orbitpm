import { ReactNode, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { OrbitMark } from './OrbitMark';
import { NotificationBell } from './NotificationBell';
import { EditProfileModal } from './EditProfileModal';
import { CommandPalette } from './CommandPalette';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  label: string;
  icon: string;
  path: string;
}

export function AppLayout({
  children,
  workspaceId,
  projectId,
}: {
  children: ReactNode;
  workspaceId?: string;
  projectId?: string;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const projectNavItems: NavItem[] = projectId
    ? [
        { label: 'Board', icon: '▤', path: `/projects/${projectId}` },
        { label: 'Backlog', icon: '☰', path: `/projects/${projectId}/backlog` },
        { label: 'Epics', icon: '◆', path: `/projects/${projectId}/epics` },
        { label: 'Analytics', icon: '▲', path: `/projects/${projectId}/analytics` },
      ]
    : [];

  const workspaceNavItems: NavItem[] = workspaceId
    ? [{ label: 'Members', icon: '◍', path: `/workspaces/${workspaceId}/members` }]
    : [];

  function isActive(path: string) {
    return location.pathname === path;
  }

  const navLink = (item: NavItem) => (
    <Link
      key={item.path}
      to={item.path}
      onClick={() => setMobileNavOpen(false)}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
        isActive(item.path)
          ? 'bg-orbit-500/15 text-white'
          : 'text-space-200 hover:bg-space-800 hover:text-white'
      }`}
    >
      <span className="w-4 flex-shrink-0 text-center text-orbit-300">{item.icon}</span>
      {item.label}
    </Link>
  );

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

      <nav className="flex-1 space-y-4 px-3 py-2 overflow-y-auto">
        <div>
          <Link
            to="/"
            onClick={() => setMobileNavOpen(false)}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive('/')
                ? 'bg-orbit-500/15 text-white'
                : 'text-space-200 hover:bg-space-800 hover:text-white'
            }`}
          >
            <span className="w-4 flex-shrink-0 text-center text-orbit-300">⌂</span>
            Workspaces
          </Link>
        </div>

        {projectNavItems.length > 0 && (
          <div>
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-space-400">
              Project
            </p>
            <div className="space-y-0.5">{projectNavItems.map(navLink)}</div>
          </div>
        )}

        {workspaceNavItems.length > 0 && (
          <div>
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-space-400">
              Workspace
            </p>
            <div className="space-y-0.5">{workspaceNavItems.map(navLink)}</div>
          </div>
        )}
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
