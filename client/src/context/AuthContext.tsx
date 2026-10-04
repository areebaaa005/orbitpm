import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, setAccessToken, refreshAccessToken } from '../api/client';
import { connectSocket, disconnectSocket } from '../api/socket';
import { User } from '../types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  /** Resolves with a challengeToken when the account has 2FA: finish with verifyTwoFactor(). */
  login: (email: string, password: string) => Promise<{ challengeToken?: string }>;
  verifyTwoFactor: (challengeToken: string, code: string) => Promise<void>;
  /** Same contract as login(): resolves with a challengeToken if the account also has 2FA. */
  loginWithGoogle: (credential: string) => Promise<{ challengeToken?: string }>;
  /** Re-reads the signed-in user (e.g. after turning 2FA on or off). */
  refreshUser: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: { name?: string; email?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On first load, try to silently restore a session via the refresh cookie
  useEffect(() => {
    (async () => {
      const token = await refreshAccessToken();
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.data.user);
          connectSocket();
        } catch {
          setAccessToken(null);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.data.twoFactorRequired) {
      return { challengeToken: res.data.data.challengeToken as string };
    }
    setAccessToken(res.data.data.accessToken);
    setUser(res.data.data.user);
    connectSocket();
    return {};
  }

  async function loginWithGoogle(credential: string) {
    const res = await api.post('/auth/google', { credential });
    if (res.data.data.twoFactorRequired) {
      return { challengeToken: res.data.data.challengeToken as string };
    }
    setAccessToken(res.data.data.accessToken);
    setUser(res.data.data.user);
    connectSocket();
    return {};
  }

  async function verifyTwoFactor(challengeToken: string, code: string) {
    const res = await api.post('/auth/2fa/verify', { challengeToken, code });
    setAccessToken(res.data.data.accessToken);
    setUser(res.data.data.user);
    connectSocket();
  }

  async function refreshUser() {
    const res = await api.get('/auth/me');
    setUser(res.data.data.user);
  }

  async function register(name: string, email: string, password: string) {
    const res = await api.post('/auth/register', { name, email, password });
    setAccessToken(res.data.data.accessToken);
    setUser(res.data.data.user);
    connectSocket();
  }

  async function logout() {
    await api.post('/auth/logout');
    setAccessToken(null);
    setUser(null);
    disconnectSocket();
  }

  async function updateProfile(updates: { name?: string; email?: string }) {
    const res = await api.patch('/auth/me', updates);
    setUser(res.data.data.user);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithGoogle, verifyTwoFactor, refreshUser, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
