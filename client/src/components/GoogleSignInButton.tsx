import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: any;
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

/** False when no Google client id is configured: callers should then hide their Google UI entirely. */
export const googleEnabled = !!CLIENT_ID;

let scriptPromise: Promise<void> | null = null;
function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => {
        scriptPromise = null;
        reject(new Error('Could not load Google sign-in'));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

/** Google's official button. It hands us an ID token ("credential"), which the server verifies. */
export function GoogleSignInButton({
  onCredential,
  text = 'continue_with',
}: {
  onCredential: (credential: string) => void;
  text?: 'continue_with' | 'signin_with' | 'signup_with';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const latest = useRef(onCredential);
  latest.current = onCredential;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !ref.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response: { credential?: string }) => {
            if (response.credential) latest.current(response.credential);
          },
        });
        window.google.accounts.id.renderButton(ref.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          width: Math.min(320, ref.current.offsetWidth || 320),
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!CLIENT_ID) return null;
  if (failed) {
    return <p className="text-center text-xs text-space-400">Google sign-in could not load. Check your connection.</p>;
  }
  return <div ref={ref} className="flex min-h-[44px] justify-center" />;
}

export function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-space-400">
      <span className="h-px flex-1 bg-space-700" /> or <span className="h-px flex-1 bg-space-700" />
    </div>
  );
}
