import { useEffect } from 'react';
import { X } from 'lucide-react';

const Key = ({ children }: { children: string }) => (
  <kbd className="min-w-[1.5rem] rounded border border-space-600 bg-space-950 px-1.5 py-0.5 text-center font-sans text-xs font-medium text-space-100">
    {children}
  </kbd>
);

export function ShortcutsHelp({ open, onClose, mod }: { open: boolean; onClose: () => void; mod: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const groups: { title: string; items: { keys: string[]; label: string }[] }[] = [
    {
      title: 'Anywhere',
      items: [
        { keys: [mod, 'K'], label: 'Search everything' },
        { keys: ['?'], label: 'Show this list' },
        { keys: ['Esc'], label: 'Close panel or dialog' },
      ],
    },
    {
      title: 'On a board',
      items: [
        { keys: ['C'], label: 'Create a task in the first column' },
        { keys: ['/'], label: 'Search tasks' },
        { keys: ['M'], label: 'Toggle "My tasks"' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#091E42]/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Keyboard shortcuts"
        className="w-full max-w-md rounded-xl border border-space-700 bg-space-900 p-5 shadow-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-space-50">Keyboard shortcuts</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-space-400 hover:bg-space-800 hover:text-space-50">
            <X size={18} />
          </button>
        </div>
        {groups.map((g) => (
          <div key={g.title} className="mt-4">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-space-400">{g.title}</p>
            {g.items.map((it) => (
              <div key={it.label} className="flex items-center justify-between py-1.5 text-sm text-space-200">
                {it.label}
                <span className="flex gap-1">{it.keys.map((k) => <Key key={k}>{k}</Key>)}</span>
              </div>
            ))}
          </div>
        ))}
        <p className="mt-4 text-xs text-space-400">Shortcuts are off while you are typing in a field.</p>
      </div>
    </div>
  );
}
