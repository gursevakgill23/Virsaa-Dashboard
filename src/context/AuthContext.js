/**
 * AuthContext — the single source of truth for "who is signed in".
 *
 * Responsibilities:
 *   - Restore a session from cookies on page load (only if still valid).
 *   - Admin-only login (rejects non-staff accounts client-side as well; the
 *     backend must still enforce IsAdminUser on every admin endpoint).
 *   - Logout (blacklists the refresh token on the server, then clears cookies).
 *   - Auto sign-out after inactivity and when the API reports an expired session.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { api, getErrorMessage, onSessionExpired } from '../api/client';
import { isTokenExpired, tokenStorage } from '../api/tokenStorage';
import { ENV } from '../config/env';

const AuthContext = createContext(null);

/** A user may use the dashboard only if Django marks them staff or superuser. */
const isAdmin = (user) => Boolean(user && (user.is_staff === true || user.is_superuser === true));

/**
 * Reads the session saved in cookies. A session counts as valid only when
 * the refresh token is still unexpired and the saved user is an admin.
 */
const readInitialSession = () => {
  const refresh = tokenStorage.getRefreshToken();
  const user = tokenStorage.getUser();
  if (!refresh || isTokenExpired(refresh, 0) || !isAdmin(user)) {
    tokenStorage.clear();
    return { user: null };
  }
  return { user };
};

/** Browser events that count as "the admin is still here". */
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => readInitialSession().user);
  const idleTimer = useRef(null);

  const isAuthenticated = isAdmin(user);

  /** Clears local state and cookies (no network call). */
  const clearSession = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  /* ------------------------------------------------------------------ */
  /* Login                                                               */
  /* ------------------------------------------------------------------ */
  const login = useCallback(async ({ identifier, password, captcha }) => {
    const payload = {
      login: String(identifier || '').trim(), // email or username, same as the web app
      password,
      captcha, // reCAPTCHA token from the login form (each token works once)
      remember_me: false,
    };

    const { data } = await api.post('/api/auth/login/', payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!data?.access || !data?.refresh) {
      throw new Error('The server did not return a session. Please try again.');
    }
    if (!isAdmin(data.user)) {
      // Do not keep tokens for non-admin users at all.
      throw new Error('This account does not have admin access.');
    }

    tokenStorage.setSession({ access: data.access, refresh: data.refresh, user: data.user });
    setUser(tokenStorage.getUser());
    return data.user;
  }, []);

  /* ------------------------------------------------------------------ */
  /* Logout                                                              */
  /* ------------------------------------------------------------------ */
  const logout = useCallback(
    async ({ silent = false, reason } = {}) => {
      const refresh = tokenStorage.getRefreshToken();
      if (refresh) {
        try {
          // Blacklist the refresh token so it cannot be reused if it leaked.
          await api.post(
            '/api/auth/logout/',
            { refresh_token: refresh },
            { headers: { Authorization: `Bearer ${tokenStorage.getAccessToken() || ''}` } }
          );
        } catch {
          /* Server-side logout failing must never trap the admin in a session. */
        }
      }
      clearSession();
      if (!silent) toast.success(reason || 'Signed out. Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh!');
      navigate('/login', { replace: true });
    },
    [clearSession, navigate]
  );

  /* ------------------------------------------------------------------ */
  /* React to the API client deciding the session is dead               */
  /* ------------------------------------------------------------------ */
  useEffect(
    () =>
      onSessionExpired(() => {
        setUser(null);
        toast.error('Your session has expired. Please sign in again.', { toastId: 'session-expired' });
        navigate('/login', { replace: true });
      }),
    [navigate]
  );

  /* ------------------------------------------------------------------ */
  /* Inactivity auto sign-out                                            */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const timeoutMs = ENV.IDLE_TIMEOUT_MINUTES * 60 * 1000;

    const resetTimer = () => {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => {
        logout({ reason: 'Signed out after a period of inactivity.' });
      }, timeoutMs);
    };

    resetTimer();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
    return () => {
      window.clearTimeout(idleTimer.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [isAuthenticated, logout]);

  /* ------------------------------------------------------------------ */
  /* Keep tabs in sync: signing out in one tab signs out the others     */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const interval = window.setInterval(() => {
      if (!tokenStorage.getRefreshToken()) {
        setUser(null);
        navigate('/login', { replace: true });
      }
    }, 5000);
    return () => window.clearInterval(interval);
  }, [isAuthenticated, navigate]);

  const value = useMemo(
    () => ({ user, isAuthenticated, login, logout, getErrorMessage }),
    [user, isAuthenticated, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/** Hook for components: const { user, logout } = useAuth(); */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
};
