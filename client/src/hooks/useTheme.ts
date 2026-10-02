import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';
const KEY = 'orbitpm:theme';

function stored(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'dark' || t === 'system' ? t : 'light';
  } catch {
    return 'light';
  }
}

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

/** Applies the theme to <html> and keeps it in sync with the OS when set to 'system'. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(stored);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && prefersDark());
      document.documentElement.classList.toggle('dark', dark);
      setIsDark(dark);
    };
    apply();
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* storage unavailable: theme just won't persist */
    }
    setThemeState(t);
  }, []);

  return { theme, setTheme, isDark };
}
