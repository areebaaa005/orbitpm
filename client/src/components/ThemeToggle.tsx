import { useState } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme, type Theme } from '../hooks/useTheme';

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ThemeToggle() {
  const { theme, setTheme, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const Icon = isDark ? Moon : Sun;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Theme"
        aria-label="Change theme"
        aria-expanded={open}
        className="rounded-md p-2 text-space-400 transition-colors hover:bg-space-800 hover:text-space-50"
      >
        <Icon size={18} strokeWidth={1.75} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-40 rounded-lg border border-space-700 bg-space-900 p-1 shadow-popover">
            {OPTIONS.map(({ value, label, icon: I }) => (
              <button
                key={value}
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-space-100 hover:bg-space-800"
              >
                <I size={15} className="text-space-400" />
                <span className="flex-1">{label}</span>
                {theme === value && <Check size={14} className="text-orbit-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
