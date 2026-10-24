/**
 * Login — admin sign-in.
 * Design echoes the web app's loading screen: a deep maroon stage with a
 * glowing glass archway, the Virsaa wordmark and a glass sign-in card.
 *
 * Security notes:
 *   - Passwords are never logged or stored; the field is cleared on failure.
 *   - After 5 failed attempts the form locks for 30s (slows guessing from
 *     this browser — the backend must still rate-limit the login endpoint).
 *   - Non-admin accounts are rejected and their tokens are discarded.
 *   - Google reCAPTCHA v2, the same widget and key as Virsaa-Web; the backend
 *     verifies the token, and each token is single-use so it resets after
 *     every attempt.
 */
import React, { useEffect, useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaArrowRight, FaMoon, FaSun, FaCheckCircle } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getErrorMessage } from '../../api/client';
import { ENV } from '../../config/env';
import styles from './Login.module.css';

const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 30;

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState(''); // email or username
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedFor, setLockedFor] = useState(0);
  const passwordRef = useRef(null);
  const recaptchaRef = useRef(null);
  const [captchaDone, setCaptchaDone] = useState(false);

  // Where to go after signing in (only internal paths are allowed).
  const from = typeof location.state?.from === 'string' && location.state.from.startsWith('/') && !location.state.from.startsWith('//')
    ? location.state.from
    : '/dashboard';

  // Countdown while the form is locked.
  useEffect(() => {
    if (lockedFor <= 0) return undefined;
    const timer = window.setTimeout(() => setLockedFor((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [lockedFor]);

  if (isAuthenticated) return <Navigate to={from} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || lockedFor > 0) return;
    setError('');

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      setError('Enter your email or username.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      passwordRef.current?.focus();
      return;
    }
    if (!ENV.RECAPTCHA_SITE_KEY) {
      setError('reCAPTCHA is not configured. Set REACT_APP_RECAPTCHA_PUBLIC_KEY and rebuild.');
      return;
    }
    const captcha = recaptchaRef.current?.getValue();
    if (!captcha) {
      setError('Tick the reCAPTCHA box to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login({ identifier: trimmedIdentifier, password, captcha });
      setAttempts(0);
      toast.success(`Welcome back${user?.first_name ? `, ${user.first_name}` : ''}!`);
      navigate(from, { replace: true });
    } catch (err) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setPassword('');
      // Same error shapes the web app handles: { login: [...] }, { captcha: [...] },
      // { error: "..." } and { code: "email_not_verified" }.
      const data = err?.response?.data;
      const message =
        (data?.code === 'email_not_verified' && 'This account’s email isn’t verified yet. Verify it from the Virsaa website first.') ||
        data?.login?.[0] ||
        data?.captcha?.[0] ||
        (typeof data?.error === 'string' && data.error) ||
        getErrorMessage(err, 'Sign-in failed.');
      setError(message);
      if (nextAttempts >= MAX_ATTEMPTS) {
        setLockedFor(LOCK_SECONDS);
        setAttempts(0);
        setError(`Too many attempts. Try again in ${LOCK_SECONDS} seconds.`);
      }
      passwordRef.current?.focus();
    } finally {
      setSubmitting(false);
      recaptchaRef.current?.reset(); // tokens are single-use
      setCaptchaDone(false);
    }
  };

  const onPasswordKey = (event) => setCapsLock(Boolean(event.getModifierState?.('CapsLock')));

  return (
    <div className={styles.page}>
      {/* ---------- Brand stage ---------- */}
      <section className={styles.stage} aria-hidden="true">
        <div className={styles.aura} />
        <span className={`${styles.orb} ${styles.orbOne}`} />
        <span className={`${styles.orb} ${styles.orbTwo}`} />
        <div className={styles.doorway}>
          <div className={styles.glow} />
          <div className={styles.glass}>
            <span className={styles.mark}>ੴ</span>
          </div>
          <svg className={styles.outline} viewBox="0 0 200 260" preserveAspectRatio="none">
            <path d="M14 252 V118 C14 64 58 40 100 10 C142 40 186 64 186 118 V252 Z" />
          </svg>
        </div>
        <div className={styles.floor} />
        <div className={styles.wordmark}>
          <p className={styles.name}>Virsaa</p>
          <p className={styles.gurmukhi}>ਵਿਰਸਾ · Admin studio</p>
        </div>
        <p className={styles.tagline}>Upload, organise and share the heritage your members learn from.</p>
      </section>

      {/* ---------- Sign-in card ---------- */}
      <section className={styles.panel}>
        <button
          type="button"
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <FaMoon /> : <FaSun />}
        </button>

        <div className={styles.card}>
          <p className={styles.eyebrow}>Admin sign in</p>
          <h1 className={styles.title}>Sat Sri Akal 🙏</h1>
          <p className={styles.subtitle}>Sign in with your Virsaa staff account to manage content and members.</p>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label htmlFor="login-email">Email or username</label>
              <div className={styles.inputWrap}>
                <FaUser aria-hidden="true" />
                <input
                  id="login-email"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="you@virsaa.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={submitting}
                  maxLength={254}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="login-password">Password</label>
              <div className={styles.inputWrap}>
                <FaLock aria-hidden="true" />
                <input
                  ref={passwordRef}
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={onPasswordKey}
                  onKeyUp={onPasswordKey}
                  disabled={submitting}
                  maxLength={128}
                  required
                />
                <button
                  type="button"
                  className={styles.reveal}
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {capsLock && <small className={styles.warning}>Caps Lock is on.</small>}
            </div>

            {/* reCAPTCHA — Google draws it in a fixed 304×78 iframe we can't restyle,
                so it sits in a rounded "verification" frame that crops its square
                border and matches the inputs. key={theme} remounts it so it follows
                light/dark mode. */}
            <div className={styles.field}>
              <span className={styles.captchaLabel}>
                Verification
                {captchaDone && (
                  <span className={styles.captchaOk}>
                    <FaCheckCircle aria-hidden="true" /> Verified
                  </span>
                )}
              </span>
              {ENV.RECAPTCHA_SITE_KEY ? (
                <div className={`${styles.captchaFrame} ${theme === 'dark' ? styles.captchaFrameDark : ''}`}>
                  <ReCAPTCHA
                    key={theme}
                    ref={recaptchaRef}
                    sitekey={ENV.RECAPTCHA_SITE_KEY}
                    theme={theme === 'dark' ? 'dark' : 'light'}
                    onChange={(value) => {
                      setCaptchaDone(Boolean(value));
                      setError('');
                    }}
                    onExpired={() => {
                      setCaptchaDone(false);
                      setError('The reCAPTCHA expired. Tick the box again.');
                    }}
                    onErrored={() => {
                      setCaptchaDone(false);
                      setError('reCAPTCHA could not load. Check your connection and reload.');
                    }}
                  />
                </div>
              ) : (
                <small className={styles.warning}>Missing REACT_APP_RECAPTCHA_PUBLIC_KEY</small>
              )}
            </div>

            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}

            <button type="submit" className={styles.submit} disabled={submitting || lockedFor > 0}>
              {lockedFor > 0 ? (
                `Try again in ${lockedFor}s`
              ) : submitting ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" /> Signing in…
                </>
              ) : (
                <>
                  Sign in <FaArrowRight aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className={styles.footnote}>Only staff accounts can access this area. Activity may be logged.</p>
        </div>
      </section>
    </div>
  );
};

export default Login;
