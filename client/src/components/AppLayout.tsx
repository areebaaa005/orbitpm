import { ReactNode, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { OrbitMark } from './OrbitMark';
import { NotificationBell } from './NotificationBell';
import { EditProfileModal } from './EditProfileModal';
import { CommandPalette } from './CommandPalette';
import { useAuth } from '../context/AuthContext';

import type { LucideIcon } from 'lucide-react';
import { LayoutGrid, Kanban, ListTodo, Zap, ChartColumn, Users, Search, LogOut, Menu, X } from 'lucide-react';

interface NavItem {
  label: string;
  icon: LucideIcon;
  path: string;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform);

function openSearch() {
  // CommandPalette listens for Ctrl/Cmd+K, so the search button reuses that.
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
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
        { label: 'Board', icon: Kanban, path: `/projects/${projectId}` },
        { label: 'Backlog', icon: ListTodo, path: `/projects/${projectId}/backlog` },
        { label: 'Epics', icon: Zap, path: `/projects/${projectId}/epics` },
        { label: 'Analytics', icon: ChartColumn, path: `/projects/${projectId}/analytics` },
      ]
    : [];

  const workspaceNavItems: NavItem[] = workspaceId
    ? [{ label: 'Members', icon: Users, path: `/workspaces/${workspaceId}/members` }]
    : [];

  function isActive(path: string) {
    return location.pathname === path;
  }

  const navLink = (item: NavItem) => {
    const active = isActive(item.path);
    const Icon = item.icon;
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={() => setMobileNavOpen(false)}
        aria-current={active ? 'page' : undefined}
        className={`group relative flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${
          active
            ? 'bg-orbit-500/15 text-white'
            : 'text-space-300 hover:bg-space-800 hover:text-white'
        }`}
      >
        {active && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-orbit-500" />
        )}
        <Icon
          size={18}
          strokeWidth={1.75}
          className={active ? 'text-orbit-300' : 'text-space-400 group-hover:text-space-200'}
        />
        {item.label}
      </Link>
    );
  };

  const sectionLabel = (text: string) => (
    <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-space-400">
      {text}
    </p>
  );

  const sidebarContent = (
    <>
      <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-space-700/60 px-4">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setMobileNavOpen(false)}>
          <OrbitMark size={28} />
          <span className="font-display text-[17px] font-semibold tracking-tight text-white">
            OrbitPM
          </span>
        </Link>
        <button
          onClick={() => setMobileNavOpen(false)}
          className="rounded-md p-1.5 text-space-300 hover:bg-space-800 hover:text-white md:hidden"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <div className="space-y-0.5">
          {navLink({ label: 'Workspaces', icon: LayoutGrid, path: '/' })}
        </div>

        {projectNavItems.length > 0 && (
          <div>
            {sectionLabel('Project')}
            <div className="space-y-0.5">{projectNavItems.map(navLink)}</div>
          </div>
        )}

        {workspaceNavItems.length > 0 && (
          <div>
            {sectionLabel('Workspace')}
            <div className="space-y-0.5">{workspaceNavItems.map(navLink)}</div>
          </div>
        )}
      </nav>

      <div className="flex-shrink-0 border-t border-space-700/60 p-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditProfileOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-space-800"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orbit-500 text-sm font-semibold text-white">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user?.name}</p>
              <p className="truncate text-xs text-space-400">{user?.email}</p>
            </div>
          </button>
          <button
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            className="rounded-md p-2 text-space-400 transition-colors hover:bg-space-800 hover:text-white"
          >
            <LogOut size={17} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-space-950">
      {/* Desktop sidebar: its own surface + right border so it reads as a panel */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col border-r border-space-700/60 bg-space-900 md:flex">
        {sidebarContent}
      </aside>

      {/* Mobile slide-in sidebar */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)} />
          <aside className="relative flex w-64 flex-col border-r border-space-700/60 bg-space-900">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-space-700/60 bg-space-950 px-4 md:px-6">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="rounded-md p-1.5 text-space-300 hover:bg-space-800 hover:text-white md:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <button
            onClick={openSearch}
            className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md border border-space-700 bg-space-900 px-3 text-sm text-space-400 transition-colors hover:border-space-600 hover:text-space-200"
          >
            <Search size={16} strokeWidth={1.75} />
            <span className="flex-1 truncate text-left">Search…</span>
            <kbd className="hidden rounded border border-space-700 px-1.5 py-0.5 font-sans text-[10px] text-space-400 sm:inline">
              {isMac ? '⌘K' : 'Ctrl K'}
            </kbd>
          </button>

          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {editProfileOpen && <EditProfileModal onClose={() => setEditProfileOpen(false)} />}
      <CommandPalette workspaceId={workspaceId} />
    </div>
  );
}
