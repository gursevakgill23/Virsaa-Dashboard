/**
 * Central place for every environment-driven setting.
 *
 * IMPORTANT: Create React App inlines every `REACT_APP_*` variable into the
 * public JavaScript bundle at build time. Anything in here is visible to
 * anyone who opens the site — never put secrets (DB passwords, AWS keys,
 * Django SECRET_KEY, etc.) in a REACT_APP_ variable.
 */

/** Removes a trailing slash so we can safely join `${base}/path`. */
const stripTrailingSlash = (value) => (value || '').trim().replace(/\/+$/, '');

/** Parses a positive integer env value, falling back to a default. */
const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const ENV = Object.freeze({
  /**
   * Base URL of the Django API.
   * Default "/backend" works with the Vercel rewrite in vercel.json (and the
   * dev proxy in src/setupProxy.js), which keeps the browser on HTTPS and
   * avoids "mixed content" errors when the backend itself is plain HTTP.
   */
  API_BASE_URL: stripTrailingSlash(process.env.REACT_APP_API_BASE_URL || '/backend'),

  /** Public web app URL — used for the "View site" link. */
  WEB_APP_URL: stripTrailingSlash(process.env.REACT_APP_WEB_APP_URL || 'https://virsaa-web.vercel.app'),

  /**
   * Google reCAPTCHA v2 *site* (public) key — the same one Virsaa-Web uses.
   * The login endpoint verifies the captcha token, exactly like the web app.
   * Every domain the dashboard runs on (localhost, the Vercel URL) must be
   * listed for this key in the reCAPTCHA admin console.
   */
  RECAPTCHA_SITE_KEY: (process.env.REACT_APP_RECAPTCHA_PUBLIC_KEY || '').trim(),

  /** Default request timeout for normal API calls (ms). */
  REQUEST_TIMEOUT_MS: toPositiveInt(process.env.REACT_APP_REQUEST_TIMEOUT_MS, 30000),

  /** Timeout for file uploads, which can be large (ms). */
  UPLOAD_TIMEOUT_MS: toPositiveInt(process.env.REACT_APP_UPLOAD_TIMEOUT_MS, 600000),

  /** Hard ceiling for any single uploaded file, in MB. */
  MAX_UPLOAD_MB: toPositiveInt(process.env.REACT_APP_MAX_UPLOAD_MB, 300),

  /** Minutes of inactivity before an admin is signed out automatically. */
  IDLE_TIMEOUT_MINUTES: toPositiveInt(process.env.REACT_APP_IDLE_TIMEOUT_MINUTES, 30),

  IS_PRODUCTION: process.env.NODE_ENV === 'production',
});
