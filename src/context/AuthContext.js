/**
 * AuthContext — the single source of truth for "who is signed in".
 *
 * Responsibilities:
 *   - Restore a session from cookies on page load (only if still valid).
 *   - Admin-only login in two steps: password + reCAPTCHA, then the 6-digit
 *     code Django emails to every staff account (rejects non-staff accounts
 *     client-side as well; the backend enforces IsAdminUser on every
 *     admin endpoint).
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
  /* Login, in two steps                                                 */
  /*                                                                     */
  /*   1. login()       email/username + password + reCAPTCHA            */
  /*                    → /api/auth/login/                               */
  /*      Staff accounts always get { two_factor_required, challenge }   */
  /*      instead of tokens: the server has emailed a 6-digit code.      */
  /*   2. verifyCode()  { challenge, code } → /api/auth/login/verify/    */
  /*                    → { access, refresh, user }                      */
  /*      resendCode()  { challenge } → /api/auth/login/resend/          */
  /*                                                                     */
  /* The challenge ties the code to this sign-in. It is kept only in the */
  /* Login page's memory (never in cookies or storage), so a reload      */
  /* simply starts again.                                                */
  /* ------------------------------------------------------------------ */

  /** Saves the session from a finished sign-in, or refuses non-admin accounts. */
  const finishSignIn = useCallback(async (data) => {
    if (!data?.access || !data?.refresh) {
      throw new Error('The server did not return a session. Please try again.');
    }
    if (!isAdmin(data.user)) {
      // Never keep tokens for non-admin accounts; end the session on the server as well.
      api.post('/api/auth/logout/', { refresh_token: data.refresh }).catch(() => {});
      throw new Error('This account does not have admin access.');
    }
    tokenStorage.setSession({ access: data.access, refresh: data.refresh, user: data.user });
    setUser(tokenStorage.getUser());
    return data.user;
  }, []);

  /**
   * Step 1. Resolves to either
   *   { status: 'signed_in', user }
   *   { status: 'code', challenge, emailHint, expiresIn, resendIn, message }
   */
  const login = useCallback(
    async ({ identifier, password, captcha }) => {
      const payload = {
        login: String(identifier || '').trim(), // email or username, same as the web app
        password,
        captcha, // reCAPTCHA token from the login form (each token works once)
        remember_me: false,
      };
      const { data } = await api.post('/api/auth/login/', payload);

      if (data?.two_factor_required) {
        if (typeof data.challenge !== 'string' || !data.challenge) {
          throw new Error('The server asked for a sign-in code but sent no challenge. Please try again.');
        }
        return {
          status: 'code',
          challenge: data.challenge,
          emailHint: typeof data.email_hint === 'string' ? data.email_hint : '',
          expiresIn: Number(data.expires_in) || 600,
          resendIn: Number(data.resend_in) || 60,
          message: typeof data.message === 'string' ? data.message : '',
        };
      }
      return { status: 'signed_in', user: await finishSignIn(data) };
    },
    [finishSignIn]
  );

  /** Step 2: the 6-digit code from the email (spaces are fine). Resolves to the user. */
  const verifyCode = useCallback(
    async ({ challenge, code }) => {
      const { data } = await api.post('/api/auth/login/verify/', {
        challenge,
        code: String(code || '').replace(/\D/g, '').slice(0, 6),
      });
      return finishSignIn(data);
    },
    [finishSignIn]
  );

  /** Emails a new code for the same sign-in (the older code stops working). */
  const resendCode = useCallback(async ({ challenge }) => {
    const { data } = await api.post('/api/auth/login/resend/', { challenge });
    return {
      emailHint: typeof data?.email_hint === 'string' ? data.email_hint : '',
      expiresIn: Number(data?.expires_in) || 600,
      resendIn: Number(data?.resend_in) || 60,
      sendsLeft: Number.isFinite(Number(data?.sends_left)) ? Number(data.sends_left) : null,
      message: typeof data?.message === 'string' ? data.message : '',
    };
  }, []);

  /** Lets pages refresh the saved user (e.g. after editing your own name). */
  const updateSavedUser = useCallback((changes) => {
    const current = tokenStorage.getUser();
    if (!current) return;
    tokenStorage.setUser({ ...current, ...changes });
    setUser(tokenStorage.getUser());
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
    () => ({ user, isAuthenticated, login, verifyCode, resendCode, logout, updateSavedUser, getErrorMessage }),
    [user, isAuthenticated, login, verifyCode, resendCode, logout, updateSavedUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/** Hook for components: const { user, logout } = useAuth(); */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
};
