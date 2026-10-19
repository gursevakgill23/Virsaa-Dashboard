/**
 * Shared Axios client for every request to the Virsaa Django API.
 *
 * What it handles so pages don't have to:
 *   1. Base URL + timeout from env config.
 *   2. Attaches `Authorization: Bearer <access>` to every request.
 *   3. On a 401, refreshes the access token ONCE (even if 10 requests fail at
 *      the same moment) and replays the queued requests.
 *   4. If the refresh fails, clears the session and notifies the app so it
 *      can send the admin back to the login screen.
 *   5. Turns Django REST Framework error payloads into readable messages.
 */
import axios from 'axios';
import { ENV } from '../config/env';
import { tokenStorage } from './tokenStorage';

/** Paths that must never trigger the refresh-and-retry flow. */
const AUTH_PATHS = ['/api/auth/login/', '/api/auth/token/refresh/', '/api/auth/logout/'];

export const api = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: ENV.REQUEST_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
  // Cookies are not needed for JWT auth; keeping this false avoids sending
  // any browser cookies to the API domain.
  withCredentials: false,
});

/* ---------------------------------------------------------------------------
 * Session-expired broadcast
 * ------------------------------------------------------------------------- */
const sessionListeners = new Set();

/** Lets AuthContext react when the API decides the session is over. */
export const onSessionExpired = (listener) => {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
};

const notifySessionExpired = () => {
  tokenStorage.clear();
  sessionListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      /* a broken listener must not break the others */
    }
  });
};

/* ---------------------------------------------------------------------------
 * Request interceptor — attach the access token
 * ------------------------------------------------------------------------- */
api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  const isAuthCall = AUTH_PATHS.some((path) => (config.url || '').includes(path));
  if (token && !isAuthCall) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ---------------------------------------------------------------------------
 * Single-flight token refresh
 * ------------------------------------------------------------------------- */
let refreshPromise = null;

/**
 * Exchanges the refresh token for a new access token. Concurrent callers all
 * await the same in-flight promise, so only one refresh request is sent.
 */
export const refreshAccessToken = () => {
  if (refreshPromise) return refreshPromise;

  const refresh = tokenStorage.getRefreshToken();
  if (!refresh) return Promise.reject(new Error('No refresh token'));

  refreshPromise = axios
    .post(
      `${ENV.API_BASE_URL}/api/auth/token/refresh/`,
      { refresh },
      { timeout: ENV.REQUEST_TIMEOUT_MS, headers: { 'Content-Type': 'application/json' } }
    )
    .then(({ data }) => {
      if (!data?.access) throw new Error('Refresh response had no access token');
      tokenStorage.setAccessToken(data.access);
      // SimpleJWT with ROTATE_REFRESH_TOKENS returns a new refresh token too.
      if (data.refresh) {
        tokenStorage.setSession({ access: data.access, refresh: data.refresh, user: tokenStorage.getUser() });
      }
      return data.access;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

/* ---------------------------------------------------------------------------
 * Response interceptor — refresh on 401 and replay once
 * ------------------------------------------------------------------------- */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthCall = AUTH_PATHS.some((path) => (original?.url || '').includes(path));

    if (status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      try {
        const newAccess = await refreshAccessToken();
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (refreshError) {
        notifySessionExpired();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

/**
 * Converts any Axios / DRF error into a single human-readable sentence.
 * DRF returns errors in several shapes:
 *   { detail: "..." } | { error: "..." } | { field: ["msg", ...] } | ["msg"]
 */
export const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (!error) return fallback;
  if (error.code === 'ECONNABORTED') return 'The request timed out. Check your connection and try again.';
  if (!error.response) {
    return error.message === 'Network Error'
      ? 'Cannot reach the Virsaa server. Check the API URL and your connection.'
      : error.message || fallback;
  }

  const { status, data } = error.response;
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to do that.';
  if (status === 404) return 'That endpoint was not found on the server.';
  if (status === 413) return 'The file is too large for the server to accept.';
  if (status >= 500) return 'The server had a problem. Please try again in a moment.';

  if (typeof data === 'string' && data.length < 200) return data;
  if (Array.isArray(data) && data.length) return String(data[0]);
  if (data && typeof data === 'object') {
    if (typeof data.detail === 'string') return data.detail;
    if (typeof data.error === 'string') return data.error;
    if (typeof data.message === 'string') return data.message;
    const [field, messages] = Object.entries(data)[0] || [];
    if (field) {
      const text = Array.isArray(messages) ? messages[0] : messages;
      const label = field === 'non_field_errors' ? '' : `${field.replace(/_/g, ' ')}: `;
      return `${label}${typeof text === 'string' ? text : JSON.stringify(text)}`;
    }
  }
  return fallback;
};

/**
 * Pulls field-level errors out of a DRF 400 response so forms can show them
 * under the matching input: { title: "This field is required." }.
 */
export const getFieldErrors = (error) => {
  const data = error?.response?.data;
  if (error?.response?.status !== 400 || !data || typeof data !== 'object' || Array.isArray(data)) return {};
  return Object.fromEntries(
    Object.entries(data).map(([field, messages]) => [
      field,
      Array.isArray(messages) ? String(messages[0]) : String(messages),
    ])
  );
};

/** Normalises list endpoints that return either `[...]` or `{ results: [...] }`. */
export const toList = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
};

/** Reads a total count from paginated (`count`) or plain list responses. */
export const toCount = (data) => {
  if (data && typeof data.count === 'number') return data.count;
  return toList(data).length;
};

/**
 * Only allows http(s) or same-site relative URLs to be rendered as links or
 * image sources. Blocks `javascript:` and `data:` URLs coming from the API.
 */
export const safeUrl = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch {
    return '';
  }
};
