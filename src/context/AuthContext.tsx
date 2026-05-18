import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export interface AuthUser {
  email: string;
}

interface AuthContextData {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

const STORAGE_KEY = 'xls_fusion_token';

function parseToken(token: string): AuthUser | null {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join('')
    );
    const data = JSON.parse(json);
    if (data?.email) {
      return { email: String(data.email) };
    }
  } catch {
    return null;
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
  });
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (!token) return null;
    return parseToken(token);
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setToken(stored);
        setUser(parseToken(stored));

        try {
          const response = await fetch('/api/me', {
            headers: { Authorization: `Bearer ${stored}` },
          });

          if (!response.ok) {
            throw new Error('Token inválido');
          }

          const result = await response.json();
          if (result?.user) {
            setUser(result.user);
          } else {
            throw new Error('Usuário inválido');
          }
        } catch {
          syncToken(null);
        }
      }

      setLoading(false);
    };

    initializeAuth();
  }, []);

  const syncToken = (newToken: string | null) => {
    setToken(newToken);
    const parsed = newToken ? parseToken(newToken) : null;
    setUser(parsed);
    if (typeof window !== 'undefined') {
      if (newToken) {
        localStorage.setItem(STORAGE_KEY, newToken);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.error || 'Falha ao autenticar.');
    }

    if (!result?.token) {
      throw new Error('Token não retornado pelo servidor.');
    }

    syncToken(result.token);
  };

  const signup = async (email: string, password: string) => {
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.error || 'Falha ao criar conta.');
    }

    if (!result?.token) {
      throw new Error('Token não retornado pelo servidor.');
    }

    syncToken(result.token);
  };

  const logout = () => {
    syncToken(null);
  };

  const authFetch = async (input: RequestInfo, init?: RequestInit) => {
    const headers = new Headers(init?.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(input, {
      ...init,
      headers,
    });
  };

  const value = useMemo(
    () => ({ user, token, loading, login, signup, logout, authFetch }),
    [loading, user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
