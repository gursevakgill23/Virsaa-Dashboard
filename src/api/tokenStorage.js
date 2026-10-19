/**
 * Token & session storage.
 *
 * Tokens live in cookies so a page refresh keeps the admin signed in.
 * Cookies are:
 *   - SameSite=Strict  → never sent on cross-site requests (CSRF protection)
 *   - Secure on HTTPS  → never sent over plain HTTP in production
 *   - Short-lived      → access token expires with the JWT itself
 *
 * Note: cookies written from JavaScript cannot be HttpOnly. The strongest
 * setup is for Django to set the refresh token as an HttpOnly cookie itself;
 * this module is written so that switch only touches this file.
 */
import Cookies from 'js-cookie';

const KEYS = Object.freeze({
  ACCESS: 'va_access',
  REFRESH: 'va_refresh',
  USER: 'va_user',
});

/** Legacy cookie names from the old dashboard — cleared on sign-out. */
const LEGACY_KEYS = ['accessToken', 'refreshToken', 'userData', 'isAuthenticated'];

const baseCookieOptions = () => ({
  sameSite: 'Strict',
  secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
  path: '/',
});

/**
 * Decodes the payload of a JWT without verifying it. Used ONLY to read the
 * `exp` claim so the UI can tell when a token is stale; the server still
 * verifies every token on every request.
 */
export const decodeJwt = (token) => {
  try {
    const [, payload] = String(token).split('.');
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
};

/** True when the token is missing, malformed or past its `exp` (with skew). */
export const isTokenExpired = (token, skewSeconds = 30) => {
  const payload = decodeJwt(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
};

/** Converts a JWT's `exp` into a Date for js-cookie, with a fallback in days. */
const expiryFor = (token, fallbackDays) => {
  const payload = decodeJwt(token);
  if (payload && typeof payload.exp === 'number') return new Date(payload.exp * 1000);
  return fallbackDays;
};

/**
 * Keeps only the user fields the dashboard actually displays. Storing the
 * full user object would leak more personal data into a browser cookie.
 */
const pickSafeUser = (user) => {
  if (!user || typeof user !== 'object') return null;
  return {
    id: user.id ?? null,
    username: typeof user.username === 'string' ? user.username : '',
    email: typeof user.email === 'string' ? user.email : '',
    first_name: typeof user.first_name === 'string' ? user.first_name : '',
    last_name: typeof user.last_name === 'string' ? user.last_name : '',
    profile_photo: typeof user.profile_photo === 'string' ? user.profile_photo : '',
    is_staff: user.is_staff === true,
    is_superuser: user.is_superuser === true,
  };
};

export const tokenStorage = {
  getAccessToken: () => Cookies.get(KEYS.ACCESS) || null,
  getRefreshToken: () => Cookies.get(KEYS.REFRESH) || null,

  getUser: () => {
    const raw = Cookies.get(KEYS.USER);
    if (!raw) return null;
    try {
      return pickSafeUser(JSON.parse(raw));
    } catch {
      return null;
    }
  },

  setAccessToken: (token) => {
    if (!token) return;
    Cookies.set(KEYS.ACCESS, token, { ...baseCookieOptions(), expires: expiryFor(token, 1) });
  },

  /** Saves a full session returned by the login endpoint. */
  setSession: ({ access, refresh, user }) => {
    const options = baseCookieOptions();
    if (access) Cookies.set(KEYS.ACCESS, access, { ...options, expires: expiryFor(access, 1) });
    if (refresh) Cookies.set(KEYS.REFRESH, refresh, { ...options, expires: expiryFor(refresh, 7) });
    const safeUser = pickSafeUser(user);
    if (safeUser) {
      Cookies.set(KEYS.USER, JSON.stringify(safeUser), {
        ...options,
        expires: expiryFor(refresh, 7),
      });
    }
  },

  /** Removes every session cookie, including the old dashboard's names. */
  clear: () => {
    const options = { path: '/' };
    [...Object.values(KEYS), ...LEGACY_KEYS].forEach((key) => Cookies.remove(key, options));
    // Old dashboard pages also read these from localStorage.
    try {
      window.localStorage.removeItem('access_token');
      window.localStorage.removeItem('isAuthenticated');
    } catch {
      /* storage unavailable (private mode) — nothing to clear */
    }
  },
};
