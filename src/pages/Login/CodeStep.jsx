/**
 * CodeStep — the second step of signing in: the 6-digit code Django emails
 * to every staff account after the right password (auth_api/two_factor.py).
 *
 *   - One real <input> (autocomplete="one-time-code", so phones and password
 *     managers can fill it, and pasting "123 456" works) drawn as six boxes.
 *   - Sends the code as soon as six digits are in.
 *   - "Send a new code" waits for the server's resend_in (60 s) and stops
 *     when the server says too many codes were sent.
 *   - A code that expired, was replaced or got 5 wrong tries can't be fixed
 *     here, so the page goes back to the password step with the reason.
 *
 * The challenge (which ties the code to this sign-in) only lives in React
 * state: nothing about this step is stored in the browser.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaArrowLeft, FaArrowRight, FaEnvelopeOpenText, FaRedoAlt } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../api/client';
import styles from './Login.module.css';

const LENGTH = 6;

/** "9:05" from seconds. */
const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** The message the API put in a two-step error: { code: [msg], error: msg, reason }. */
const problemOf = (err) => {
  const data = err?.response?.data || {};
  const message =
    (Array.isArray(data.code) && data.code[0]) ||
    (typeof data.error === 'string' && data.error) ||
    (Array.isArray(data.login) && data.login[0]) ||
    (typeof data.detail === 'string' && data.detail) ||
    (err?.isAxiosError ? '' : err?.message) ||
    getErrorMessage(err, 'That didn’t work. Please try again.');
  return { reason: data.reason || '', message, data };
};

const CodeStep = ({ pending, onVerified, onRestart }) => {
  const { verifyCode, resendCode } = useAuth();
  const inputRef = useRef(null);
  const lastSent = useRef('');

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(pending.message || '');
  const [emailHint, setEmailHint] = useState(pending.emailHint);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [expiresAt, setExpiresAt] = useState(() => Date.now() + pending.expiresIn * 1000);
  const [resendAt, setResendAt] = useState(() => Date.now() + pending.resendIn * 1000);
  const [now, setNow] = useState(() => Date.now());

  // One clock for both countdowns.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const secondsLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const resendWait = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const expired = secondsLeft === 0;

  const submit = useCallback(
    async (value) => {
      if (submitting || value.length !== LENGTH) return;
      lastSent.current = value;
      setSubmitting(true);
      setError('');
      try {
        const user = await verifyCode({ challenge: pending.challenge, code: value });
        onVerified(user);
      } catch (err) {
        const { reason, message } = problemOf(err);
        if (reason === 'expired' || reason === 'locked' || !err?.isAxiosError) {
          // Nothing more can be done with this challenge (or the account isn't an admin).
          onRestart(message);
          return;
        }
        setError(message);
        setCode('');
        lastSent.current = '';
        setSubmitting(false);
        window.requestAnimationFrame(() => inputRef.current?.focus());
      }
    },
    [submitting, verifyCode, pending.challenge, onVerified, onRestart]
  );

  // Send as soon as all six digits are in (once per value).
  useEffect(() => {
    if (code.length === LENGTH && code !== lastSent.current && !expired) submit(code);
  }, [code, expired, submit]);

  const onChange = (event) => {
    setError('');
    setCode(event.target.value.replace(/\D/g, '').slice(0, LENGTH));
  };

  const resend = async () => {
    if (resending || resendWait > 0 || !canResend) return;
    setResending(true);
    setError('');
    setInfo('');
    try {
      const result = await resendCode({ challenge: pending.challenge });
      setEmailHint(result.emailHint || emailHint);
      setExpiresAt(Date.now() + result.expiresIn * 1000);
      setResendAt(Date.now() + result.resendIn * 1000);
      setInfo(result.message || `We sent a new code to ${result.emailHint || 'your email'}.`);
      if (result.sendsLeft === 0) setCanResend(false);
      setCode('');
      lastSent.current = '';
      inputRef.current?.focus();
    } catch (err) {
      const { reason, message, data } = problemOf(err);
      if (reason === 'expired') {
        onRestart(message);
        return;
      }
      if (reason === 'wait' && Number(data.resend_in) > 0) setResendAt(Date.now() + Number(data.resend_in) * 1000);
      if (reason === 'too_many_codes') setCanResend(false);
      setError(message);
    } finally {
      setResending(false);
    }
  };

  const digits = code.split('');

  return (
    <div className={styles.codeStep}>
      <div className={styles.codeIcon} aria-hidden="true">
        <FaEnvelopeOpenText />
      </div>
      <p className={styles.eyebrow}>Step 2 of 2</p>
      <h1 className={styles.title}>Check your email</h1>
      <p className={styles.subtitle}>
        We emailed a 6-digit sign-in code to <strong className={styles.hint}>{emailHint || 'your email address'}</strong>.
        It can take a minute to arrive; check your spam folder too.
      </p>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          if (code.length !== LENGTH) {
            setError('Enter all 6 digits from the email.');
            return;
          }
          lastSent.current = '';
          submit(code);
        }}
        noValidate
      >
        <div className={styles.field}>
          <label htmlFor="login-code">Sign-in code</label>
          <div className={`${styles.codeBoxes} ${error ? styles.codeBoxesError : ''}`}>
            <input
              ref={inputRef}
              id="login-code"
              className={styles.codeInput}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={LENGTH + 2}
              value={code}
              onChange={onChange}
              onPaste={(event) => {
                event.preventDefault();
                setError('');
                setCode((event.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, LENGTH));
              }}
              disabled={submitting || expired}
              aria-describedby="login-code-help"
              aria-invalid={Boolean(error)}
              autoFocus
            />
            {Array.from({ length: LENGTH }, (_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={`${styles.codeBox} ${digits[i] ? styles.codeBoxFilled : ''} ${
                  i === Math.min(digits.length, LENGTH - 1) && !submitting ? styles.codeBoxActive : ''
                } ${i === 2 ? styles.codeBoxGap : ''}`}
              >
                {digits[i] || ''}
              </span>
            ))}
          </div>
          <small id="login-code-help" className={styles.codeMeta}>
            {expired ? 'This code has expired.' : `The code works for ${clock(secondsLeft)} more.`}
          </small>
        </div>

        {info && !error && (
          <p className={styles.info} role="status">
            {info}
          </p>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {expired ? (
          <button type="button" className={styles.submit} onClick={() => onRestart('That code expired. Sign in again for a new one.')}>
            <FaRedoAlt aria-hidden="true" /> Start again
          </button>
        ) : (
          <button type="submit" className={styles.submit} disabled={submitting || code.length !== LENGTH}>
            {submitting ? (
              <>
                <span className={styles.spinner} aria-hidden="true" /> Checking…
              </>
            ) : (
              <>
                Verify and sign in <FaArrowRight aria-hidden="true" />
              </>
            )}
          </button>
        )}

        <div className={styles.codeActions}>
          <button type="button" className={styles.linkButton} onClick={() => onRestart('')} disabled={submitting}>
            <FaArrowLeft aria-hidden="true" /> Use a different account
          </button>
          {!expired && (
            <button
              type="button"
              className={styles.linkButton}
              onClick={resend}
              disabled={submitting || resending || resendWait > 0 || !canResend}
            >
              {!canResend ? 'No more codes for this sign-in' : resendWait > 0 ? `Send a new code in ${resendWait}s` : resending ? 'Sending…' : 'Send a new code'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default CodeStep;
