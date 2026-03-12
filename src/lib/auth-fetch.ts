import { API_BASE } from "@/config/api";
import { getStoredToken } from "@/contexts/AuthContext";

/**
 * Wrapper around fetch that includes auth credentials.
 * Uses Bearer token (JWT) if available, otherwise falls back to cookies (SSO).
 */
export async function authFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });
}
