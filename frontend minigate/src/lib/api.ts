import axios from "axios";

// ── Token storage helpers ────────────────────────────────────────────────────

const TOKEN_KEY = "mg_tokens";
const USER_KEY  = "auth_user";

export function getTokens(): { access: string; refresh: string } | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setTokens(tokens: { access: string; refresh: string }) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ── Axios instance ───────────────────────────────────────────────────────────
// All requests go to /api/* — Vite proxy forwards them to Django :8000.
// In production, point VITE_API_BASE to https://api.minigate.in

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

// ── Request interceptor — inject JWT ────────────────────────────────────────

api.interceptors.request.use((config) => {
  const tokens = getTokens();
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }
  return config;
});

// ── Response interceptor — auto-refresh on 401 ──────────────────────────────

let _refreshing = false;
let _queue: Array<(newAccess: string) => void> = [];

function drainQueue(newAccess: string) {
  _queue.forEach((cb) => cb(newAccess));
  _queue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean };

    // Only retry once on 401
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;

    const tokens = getTokens();
    if (!tokens?.refresh) {
      clearTokens();
      window.location.href = "/login";
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (_refreshing) {
      return new Promise((resolve, reject) => {
        _queue.push((newAccess) => {
          original.headers.Authorization = `Bearer ${newAccess}`;
          resolve(api(original));
        });
      });
    }

    _refreshing = true;
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_BASE ?? "/api"}/accounts/token/refresh/`,
        { refresh: tokens.refresh }
      );
      const newAccess: string = data.access;
      setTokens({ ...tokens, access: newAccess });
      drainQueue(newAccess);
      original.headers.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch {
      clearTokens();
      window.location.href = "/login";
      return Promise.reject(error);
    } finally {
      _refreshing = false;
    }
  }
);

export default api;
