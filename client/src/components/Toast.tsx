import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error';
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

const listeners = new Set<(t: ToastItem) => void>();
let nextId = 1;

function emit(type: ToastType, message: string) {
  const item = { id: nextId++, type, message };
  listeners.forEach((l) => l(item));
}

/** Callable from anywhere (components, react-query cache callbacks). */
export const toast = {
  success: (message: string) => emit('success', message),
  error: (message: string) => emit('error', message),
};

export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.') {
  const e = err as any;
  if (e?.response?.status === 401) return 'Your session expired. Please sign in again.';
  return e?.response?.data?.error?.message || (e?.code === 'ERR_NETWORK' ? 'Cannot reach the server.' : fallback);
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (t: ToastItem) => {
      setItems((prev) => [...prev.slice(-3), t]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 4500);
    };
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role={t.type === 'error' ? 'alert' : 'status'}
          className="pointer-events-auto flex items-start gap-2.5 rounded-lg border border-space-700 bg-space-900 p-3 text-sm shadow-popover"
        >
          {t.type === 'success' ? (
            <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-red-600" />
          )}
          <p className="flex-1 text-space-50">{t.message}</p>
          <button
            onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
            aria-label="Dismiss"
            className="text-space-400 hover:text-space-50"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
