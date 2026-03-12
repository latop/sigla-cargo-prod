import { API_BASE } from "@/config/api";

/**
 * Wrapper around fetch that always sends credentials (cookies).
 * Use this for all authenticated API calls.
 */
export async function authFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}
