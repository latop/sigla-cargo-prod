import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { API_BASE } from "@/config/api";

export interface AuthClaim {
  type: string;
  value: string;
}

export interface AuthUser {
  isAuthenticated: boolean;
  name: string;
  email: string;
  nameIdentifier: string;
  gpid: string;
  claims: AuthClaim[];
  accessToken?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
}

const TOKEN_KEY = "auth_access_token";

const AuthContext = createContext<AuthContextValue | null>(null);

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // First check if we have a JWT token (email/password login)
      const token = getStoredToken();
      if (token) {
        // Validate token is not expired by decoding payload
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          const exp = payload.exp * 1000;
          if (Date.now() < exp) {
            const email = Array.isArray(payload.unique_name) ? payload.unique_name[0] : payload.unique_name;
            setUser({
              isAuthenticated: true,
              name: email,
              email,
              nameIdentifier: email,
              gpid: "",
              claims: [],
              accessToken: token,
            });
            setLoading(false);
            return;
          } else {
            sessionStorage.removeItem(TOKEN_KEY);
          }
        } catch {
          sessionStorage.removeItem(TOKEN_KEY);
        }
      }

      // Fallback: check SSO cookie session
      const res = await fetch(`${API_BASE}/Auth/me`, {
        method: "GET",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.isAuthenticated) {
          const gpid = data.claims?.find((c: AuthClaim) => c.type === "GPID")?.value ?? "";
          const email = data.claims?.find((c: AuthClaim) => c.type === "Email")?.value ?? data.email;
          setUser({ ...data, gpid, email });
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
      // If /Auth/me fails but we don't have a token, user is simply not authenticated
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<{ success: boolean; message: string }> => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/Login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userLogin: credentials.email,
          password: credentials.password,
          domain: "application",
        }),
      });
      const data = await res.json();
      if (data.authenticated) {
        sessionStorage.setItem(TOKEN_KEY, data.accessToken);
        setUser({
          isAuthenticated: true,
          name: data.userName,
          email: data.userName,
          nameIdentifier: data.userName,
          gpid: "",
          claims: [],
          accessToken: data.accessToken,
        });
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || "Authentication Failed" };
      }
    } catch (err) {
      return { success: false, message: "Network error" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Only call SSO logout if we were using cookie auth
      if (!getStoredToken()) {
        await fetch(`${API_BASE}/Auth/logout`, {
          method: "POST",
          credentials: "include",
        });
      }
    } catch {
      // ignore
    } finally {
      sessionStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider value={{ user, loading, error, checkAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
