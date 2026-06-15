import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export interface AuthUser {
  email: string;
  name?: string;
  avatarUrl?: string;
}

interface AuthContextData {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  updateUser: (updatedFields: Partial<AuthUser>) => void;
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

  const lastActivityRef = useRef<number>(Date.now());

  const syncToken = useCallback((newToken: string | null, customUser?: AuthUser | null) => {
    setToken(newToken);
    if (customUser !== undefined) {
      setUser(customUser);
    } else {
      const parsed = newToken ? parseToken(newToken) : null;
      setUser(parsed);
    }
    if (typeof window !== 'undefined') {
      if (newToken) {
        localStorage.setItem(STORAGE_KEY, newToken);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const logout = useCallback(() => {
    syncToken(null);
  }, [syncToken]);

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
  }, [syncToken]);

  useEffect(() => {
    if (!token) return;

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('mousedown', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('scroll', updateActivity);
    window.addEventListener('click', updateActivity);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('mousedown', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('click', updateActivity);
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const interval = setInterval(async () => {
      const now = Date.now();
      const idleTime = now - lastActivityRef.current;

      const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutos
      if (idleTime > INACTIVITY_LIMIT) {
        console.warn('Usuário inativo por mais de 30 minutos. Desconectando...');
        logout();
        return;
      }

      try {
        const payload = parseToken(token);
        if (payload) {
          const jwtPayload = JSON.parse(atob(token.split('.')[1]));
          const expirationTimeMs = jwtPayload.exp * 1000;
          const timeLeft = expirationTimeMs - now;

          const REFRESH_THRESHOLD = 15 * 60 * 1000; // 15 minutos restantes
          const ACTIVE_RECENTLY = idleTime < 1 * 60 * 1000; // ativo no último 1 minuto

          if (timeLeft < REFRESH_THRESHOLD && ACTIVE_RECENTLY) {
            console.log('Renovando token por atividade do usuário...');
            const response = await fetch('/api/refresh', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
              const data = await response.json();
              if (data.token) {
                syncToken(data.token);
              }
            }
          }
        }
      } catch (err) {
        console.error('Falha ao validar ou renovar token:', err);
      }
    }, 60 * 1000); // Roda a cada 60 segundos

    return () => clearInterval(interval);
  }, [token, logout, syncToken]);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      let errorMessage = 'Falha ao autenticar.';
      try {
        const result = await response.json();
        errorMessage = result?.error || errorMessage;
      } catch {
        errorMessage = `Erro do servidor (${response.status}): ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error('Resposta inválida do servidor.');
    }
    if (!result?.token) {
      throw new Error('Token não retornado pelo servidor.');
    }

    syncToken(result.token, result.user);
  };

  const signup = async (email: string, password: string, name?: string) => {
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      let errorMessage = 'Falha ao criar conta.';
      try {
        const result = await response.json();
        errorMessage = result?.error || errorMessage;
      } catch {
        errorMessage = `Erro do servidor (${response.status}): ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error('Resposta inválida do servidor.');
    }

    if (!result?.token) {
      throw new Error('Token não retornado pelo servidor.');
    }
    syncToken(result.token, result.user);
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

  const updateUser = useCallback((updatedFields: Partial<AuthUser>) => {
    setUser((prev) => prev ? { ...prev, ...updatedFields } : null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, signup, logout, authFetch, updateUser }),
    [loading, user, token, updateUser]
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

