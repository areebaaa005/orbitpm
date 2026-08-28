import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceSearch } from '../hooks/useWorkspaceData';

export function CommandPalette({ workspaceId }: { workspaceId?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { data: results, isFetching } = useWorkspaceSearch(workspaceId, query);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen((o) => !o);
    }
    if (e.key === 'Escape') setOpen(false);
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  function go(path: string) {
    navigate(path);
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 px-4 pt-24"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ y: -12, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -12, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-lg overflow-hidden rounded-xl2 bg-white shadow-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
              <span className="text-ink-400">🔍</span>
              <input
                autoFocus
                className="flex-1 border-0 text-sm text-ink-900 outline-none placeholder:text-ink-400"
                placeholder={workspaceId ? 'Search tasks, projects…' : 'Type to search…'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd className="rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-ink-400">
                Esc
              </kbd>
            </div>

            <div className="max-h-80 overflow-y-auto py-2">
              {!workspaceId && (
                <p className="px-4 py-3 text-xs text-ink-400">
                  Open a project to search its tasks — for now, jump around:
                </p>
              )}

              <button
                onClick={() => go('/')}
                className="block w-full px-4 py-2 text-left text-sm text-ink-700 hover:bg-gray-50"
              >
                🏠 Go to Dashboard
              </button>

              {workspaceId && query.trim().length >= 2 && (
                <>
                  {isFetching && <p className="px-4 py-2 text-xs text-ink-400">Searching…</p>}

                  {results?.projects && results.projects.length > 0 && (
                    <div className="mt-1">
                      <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                        Projects
                      </p>
                      {results.projects.map((p) => (
                        <button
                          key={p._id}
                          onClick={() => go(`/projects/${p._id}`)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-ink-700 hover:bg-gray-50"
                        >
                          <span
                            className="h-2 w-2 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {results?.tasks && results.tasks.length > 0 && (
                    <div className="mt-1">
                      <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                        Tasks
                      </p>
                      {results.tasks.map((t) => (
                        <button
                          key={t._id}
                          onClick={() => go(`/projects/${t.projectId._id}`)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-ink-700 hover:bg-gray-50"
                        >
                          <span className="flex-shrink-0 rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px] text-ink-500">
                            {t.projectId.key}
                          </span>
                          <span className="truncate">{t.title}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {!isFetching &&
                    results?.tasks?.length === 0 &&
                    results?.projects?.length === 0 && (
                      <p className="px-4 py-3 text-sm text-ink-400">No results found.</p>
                    )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
