import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../hooks/useWorkspaceData';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../api/socket';

export function NotificationBell() {
  const { data: notifications } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications?.filter((n) => !n.readAt).length || 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = () => qc.invalidateQueries({ queryKey: ['notifications'] });
    socket.on('notification:new', handler);
    return () => {
      socket.off('notification:new', handler);
    };
  }, [qc]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-ink-400 hover:bg-gray-100 hover:text-ink-900"
        aria-label="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 z-40 mt-2 w-80 rounded-xl2 border border-gray-200 bg-white shadow-popover"
          >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-semibold text-ink-900">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs font-medium text-orbit-600 hover:text-orbit-700"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications?.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-ink-400">You're all caught up.</p>
            )}
            {notifications?.map((n) => (
              <button
                key={n._id}
                onClick={() => !n.readAt && markRead.mutate(n._id)}
                className={`block w-full border-b border-gray-50 px-4 py-3 text-left text-sm transition hover:bg-gray-50 ${
                  n.readAt ? 'text-ink-400' : 'font-medium text-ink-900'
                }`}
              >
                {n.message}
                {!n.readAt && <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-orbit-500" />}
              </button>
            ))}
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
