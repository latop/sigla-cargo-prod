import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { API_BASE } from "@/config/api";

export interface AuthUser {
  isAuthenticated: boolean;
  name: string;
  email: string;
  nameIdentifier: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/Auth/me`, {
        method: "GET",
        credentials: "include",
      });
      if (res.ok) {
        const data: AuthUser = await res.json();
        if (data.isAuthenticated) {
          setUser(data);
        } else {
          setUser(null);
        }
      } else if (res.status === 401) {
        setUser(null);
      } else {
        setError(`Auth check failed: ${res.status}`);
        setUser(null);
      }
    } catch (err) {
      setError("Network error checking authentication");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/Auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore network errors on logout
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider value={{ user, loading, error, checkAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
