/**
 * UserEditor — a side panel for one account: membership, name, username,
 * email, switched on / off, email verified, staff and superuser, plus
 * "sign out everywhere", "turn off sign-in codes" and delete.
 *
 * Talks to dashboard_api/users.py:
 *   GET    /api/dashboard/users/<id>/                 the full account (with its subscription)
 *   PATCH  /api/dashboard/users/<id>/                 only the fields that changed
 *   POST   /api/dashboard/users/<id>/sign-out/
 *   POST   /api/dashboard/users/<id>/two-factor-off/
 *   DELETE /api/dashboard/users/<id>/
 *
 * The panel shows the same rules the server enforces (the server is the one
 * that decides; this only explains them before you try):
 *   - staff may change members; only superusers may change other admins,
 *     give or take away staff / superuser, change an email or delete
 *   - nobody changes their own access or email here
 * Risky changes (making a superuser, taking away staff, switching an
 * account off, a new email) ask for a second click before saving.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  FaTimes, FaSave, FaCrown, FaSignOutAlt, FaKey, FaTrashAlt, FaLock, FaExclamationTriangle, FaEnvelope, FaCalendarAlt,
} from 'react-icons/fa';
import { api, getErrorMessage, getFieldErrors } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import useChoices from '../../hooks/useChoices';
import Avatar from '../../components/ui/Avatar';
import { RoleBadge, fullName, isPaid } from './memberUtils';
import formStyles from '../../components/forms/Form.module.css';
import pageStyles from '../../styles/Page.module.css';
import styles from './Users.module.css';

const ENDPOINT = '/api/dashboard/users/';
const DEFAULT_LEVELS = ['Free', 'Basic', 'Standard', 'Premium'];
const OTHER = '__other__';
const TEXT_FIELDS = ['first_name', 'last_name', 'username', 'email', 'membership_level'];
const FLAG_FIELDS = ['is_active', 'is_email_verified', 'is_staff', 'is_superuser'];

const valuesOf = (u) => ({
  first_name: u.first_name || '',
  last_name: u.last_name || '',
  username: u.username || '',
  email: u.email || '',
  membership_level: u.membership_level || 'Free',
  is_active: u.is_active !== false,
  is_email_verified: Boolean(u.is_email_verified),
  is_staff: Boolean(u.is_staff),
  is_superuser: Boolean(u.is_superuser),
});

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : 'Never');

/** A yes/no switch in the dashboard's style, with a reason when it can't be changed. */
const Switch = ({ id, label, help, checked, onChange, lockedReason }) => (
  <div className={styles.switchBlock}>
    <label className={`${formStyles.switchRow} ${lockedReason ? styles.switchLocked : ''}`} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className={formStyles.switchInput}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={Boolean(lockedReason)}
      />
      <span className={formStyles.switch} aria-hidden="true" />
      <span className={styles.switchText}>
        <span className={formStyles.switchLabel}>{label}</span>
        {help && <small>{help}</small>}
      </span>
    </label>
    {lockedReason && lockedReason.trim() && (
      <small className={styles.lockedReason}>
        <FaLock aria-hidden="true" /> {lockedReason}
      </small>
    )}
  </div>
);

const UserEditor = ({ summary, onClose, onSaved, onDeleted }) => {
  const { user: me, updateSavedUser } = useAuth();
  const { choices } = useChoices();
  const panelRef = useRef(null);

  const [account, setAccount] = useState(summary);
  const [initial, setInitial] = useState(() => valuesOf(summary));
  const [values, setValues] = useState(() => valuesOf(summary));
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [confirmAction, setConfirmAction] = useState('');
  const [deleteText, setDeleteText] = useState('');
  const [customLevel, setCustomLevel] = useState(false);

  /* ----------------------------------------------------------- who may change what */
  const amSuperuser = choices?.you ? choices.you.is_superuser === true : me?.is_superuser === true;
  const isSelf = account.is_you === true || (me?.id != null && me.id === account.id);
  const targetIsAdmin = Boolean(account.is_staff || account.is_superuser);
  const readOnly = targetIsAdmin && !isSelf && !amSuperuser;
  const lockReason = {
    profile: readOnly ? 'Only a superuser can change another admin account.' : '',
    email: readOnly || !amSuperuser ? 'Only a superuser can change an email address.' : isSelf ? 'Change your own email in Django admin.' : '',
    access: readOnly ? 'Only a superuser can change another admin account.' : isSelf ? 'You can’t change your own access. Ask another superuser.' : '',
    roles: isSelf ? 'You can’t change your own roles. Ask another superuser.' : !amSuperuser ? 'Only a superuser can give or take away admin roles.' : '',
  };

  /* ----------------------------------------------------------- load the full account */
  useEffect(() => {
    let alive = true;
    api
      .get(`${ENDPOINT}${summary.id}/`)
      .then(({ data }) => {
        if (!alive || !data) return;
        setAccount(data);
        setInitial(valuesOf(data));
        setValues(valuesOf(data));
      })
      .catch((err) => alive && setFormError(getErrorMessage(err, 'Could not load this account.')))
      .finally(() => alive && setLoadingDetail(false));
    return () => {
      alive = false;
    };
  }, [summary.id]);

  /* ----------------------------------------------------------- focus + Escape */
  useEffect(() => {
    const previous = document.activeElement;
    panelRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  const changes = useMemo(() => {
    const out = {};
    TEXT_FIELDS.forEach((name) => {
      const value = String(values[name] ?? '').trim();
      if (value !== String(initial[name] ?? '').trim()) out[name] = value;
    });
    FLAG_FIELDS.forEach((name) => {
      if (values[name] !== initial[name]) out[name] = values[name];
    });
    return out;
  }, [values, initial]);
  const dirty = Object.keys(changes).length > 0;

  const requestClose = () => {
    if (dirty && !confirmClose) {
      setConfirmClose(true);
      return;
    }
    onClose();
  };

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* ----------------------------------------------------------- editing */
  const set = (name, value) => {
    setValues((current) => {
      const next = { ...current, [name]: value };
      // Superusers are always staff; taking away staff takes away superuser.
      if (name === 'is_superuser' && value) next.is_staff = true;
      if (name === 'is_staff' && !value) next.is_superuser = false;
      return next;
    });
    setErrors((current) => ({ ...current, [name]: undefined }));
    setConfirmSave(false);
    setConfirmClose(false);
  };

  const levels = useMemo(() => {
    const fromServer = Array.isArray(choices?.membership_levels) ? choices.membership_levels.map((o) => o.value) : DEFAULT_LEVELS;
    const list = [...new Set([...fromServer, initial.membership_level].filter(Boolean))];
    return list;
  }, [choices, initial.membership_level]);

  /** Plain-words list of the changes that need a second click. */
  const warnings = useMemo(() => {
    const list = [];
    const name = fullName(account);
    if (changes.is_superuser === true) list.push(`${name} becomes a superuser: full control, including other admins and Django admin.`);
    if (changes.is_superuser === false) list.push(`${name} stops being a superuser.`);
    if (changes.is_staff === true && !changes.is_superuser) list.push(`${name} can use this dashboard and change content.`);
    if (changes.is_staff === false) list.push(`${name} loses dashboard access and is signed out everywhere.`);
    if (changes.is_active === false) list.push(`${name} can’t sign in any more and is signed out everywhere.`);
    if ('email' in changes) list.push(`Emails (and admin sign-in codes) go to ${changes.email}; the account is signed out everywhere.`);
    return list;
  }, [changes, account]);

  const validate = () => {
    const found = {};
    if ('username' in changes && !changes.username) found.username = 'A username is needed.';
    if ('email' in changes && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(changes.email)) found.email = 'Enter a valid email address.';
    if ('membership_level' in changes && !/^[A-Za-z][A-Za-z0-9 +_-]{0,49}$/.test(changes.membership_level)) {
      found.membership_level = 'Use a plan name such as Free, Basic, Standard or Premium.';
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const save = async (event) => {
    event?.preventDefault();
    if (!dirty || saving || readOnly) return;
    setFormError('');
    if (!validate()) return;
    if (warnings.length && !confirmSave) {
      setConfirmSave(true);
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.patch(`${ENDPOINT}${account.id}/`, changes);
      setAccount(data);
      setInitial(valuesOf(data));
      setValues(valuesOf(data));
      setConfirmSave(false);
      setCustomLevel(false);
      onSaved(data);
      if (isSelf) updateSavedUser({ first_name: data.first_name, last_name: data.last_name, username: data.username });
      toast.success(`Saved ${fullName(data)}.`);
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      const known = Object.fromEntries(Object.entries(fieldErrors).filter(([k]) => [...TEXT_FIELDS, ...FLAG_FIELDS].includes(k)));
      setErrors(known);
      const other = Object.entries(fieldErrors).find(([k]) => !(k in known));
      setFormError(
        Object.keys(known).length
          ? other
            ? String(other[1])
            : 'Check the highlighted fields.'
          : getErrorMessage(err, 'Could not save this account.')
      );
      setConfirmSave(false);
    } finally {
      setSaving(false);
    }
  };

  /* ----------------------------------------------------------- one-off actions */
  const runAction = async (name, { confirmed = false } = {}) => {
    if (!confirmed && confirmAction !== name) {
      setConfirmAction(name);
      return;
    }
    setBusyAction(name);
    setConfirmAction('');
    try {
      if (name === 'sign-out') {
        const { data } = await api.post(`${ENDPOINT}${account.id}/sign-out/`);
        toast.success(data?.message || 'Signed out on every device.');
      } else if (name === 'two-factor-off') {
        const { data } = await api.post(`${ENDPOINT}${account.id}/two-factor-off/`);
        if (data?.id) {
          setAccount((current) => ({ ...current, two_factor: data.two_factor }));
          onSaved({ id: data.id, two_factor: data.two_factor });
        }
        toast.success(data?.message || 'Sign-in codes are off.');
      } else if (name === 'delete') {
        await api.delete(`${ENDPOINT}${account.id}/`);
        toast.success(`Deleted ${fullName(account)}.`);
        onDeleted(account.id);
        return;
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'That didn’t work. Please try again.'));
    } finally {
      setBusyAction('');
    }
  };

  const twoFactor = account.two_factor || {};
  const sub = account.subscription;
  const canDelete = amSuperuser && !isSelf;
  const deleteWord = account.username || 'delete';

  return (
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && requestClose()}>
      <aside
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-editor-title"
        tabIndex={-1}
      >
        {/* ---------- Header ---------- */}
        <header className={styles.panelHeader}>
          <Avatar src={account.profile_photo} name={fullName(account)} size={56} />
          <div className={styles.panelTitle}>
            <h2 id="user-editor-title">
              {fullName(account)} {isSelf && <span className={styles.you}>You</span>}
            </h2>
            <p>
              <FaEnvelope aria-hidden="true" /> {account.email || 'No email'}
            </p>
            <div className={styles.panelBadges}>
              <RoleBadge user={account} />
              <span className={`${pageStyles.pill} ${isPaid(account) ? pageStyles.pillGold : ''}`}>
                {isPaid(account) && <FaCrown aria-hidden="true" />} {account.membership_level || 'Free'}
              </span>
              {account.is_active === false && <span className={styles.flagOff}>Switched off</span>}
            </div>
          </div>
          <button type="button" className={styles.close} onClick={requestClose} aria-label="Close">
            <FaTimes aria-hidden="true" />
          </button>
        </header>

        <div className={styles.panelBody}>
          <dl className={styles.facts}>
            <div>
              <dt>
                <FaCalendarAlt aria-hidden="true" /> Joined
              </dt>
              <dd>{formatDateTime(account.joined_date)}</dd>
            </div>
            <div>
              <dt>Last sign-in</dt>
              <dd>{formatDateTime(account.last_logined)}</dd>
            </div>
          </dl>

          {readOnly && (
            <div className={styles.notice} role="status">
              <FaLock aria-hidden="true" />
              <span>This is an admin account. Only a superuser can change it.</span>
            </div>
          )}

          <form id="user-editor-form" onSubmit={save} noValidate>
            {/* ---------- Membership ---------- */}
            <fieldset className={styles.group} disabled={readOnly || saving}>
              <legend>Membership</legend>
              <div className={formStyles.field}>
                <label className={formStyles.label} htmlFor="user-membership">
                  Plan
                </label>
                {customLevel ? (
                  <div className={formStyles.inlineRow}>
                    <input
                      id="user-membership"
                      className={`${formStyles.input} ${errors.membership_level ? formStyles.inputError : ''}`}
                      value={values.membership_level}
                      onChange={(e) => set('membership_level', e.target.value)}
                      maxLength={50}
                      placeholder="Plan name"
                      autoFocus
                    />
                    <button type="button" className={formStyles.linkButton} onClick={() => setCustomLevel(false)}>
                      Pick from the list
                    </button>
                  </div>
                ) : (
                  <select
                    id="user-membership"
                    className={`${formStyles.input} ${errors.membership_level ? formStyles.inputError : ''}`}
                    value={levels.includes(values.membership_level) ? values.membership_level : OTHER}
                    onChange={(e) => (e.target.value === OTHER ? setCustomLevel(true) : set('membership_level', e.target.value))}
                  >
                    {levels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                    <option value={OTHER}>Other plan name…</option>
                  </select>
                )}
                {errors.membership_level && <small className={formStyles.error}>{errors.membership_level}</small>}
                <small className={formStyles.hint}>
                  {sub
                    ? `Subscription: ${sub.plan_name || 'plan'} (${sub.status || 'unknown'})${sub.current_period_end ? `, until ${new Date(sub.current_period_end).toLocaleDateString()}` : ''}. Payments can set the plan again when it renews or ends.`
                    : loadingDetail
                      ? 'Checking for a subscription…'
                      : 'No paid subscription. A plan set here stays until you or a payment changes it.'}
                </small>
              </div>
            </fieldset>

            {/* ---------- Profile ---------- */}
            <fieldset className={styles.group} disabled={saving}>
              <legend>Profile</legend>
              <div className={styles.twoCols}>
                {[
                  ['first_name', 'First name', 'given-name'],
                  ['last_name', 'Last name', 'family-name'],
                ].map(([name, label, auto]) => (
                  <div key={name} className={formStyles.field}>
                    <label className={formStyles.label} htmlFor={`user-${name}`}>
                      {label}
                    </label>
                    <input
                      id={`user-${name}`}
                      className={`${formStyles.input} ${errors[name] ? formStyles.inputError : ''}`}
                      value={values[name]}
                      onChange={(e) => set(name, e.target.value)}
                      maxLength={150}
                      autoComplete={auto}
                      disabled={Boolean(lockReason.profile)}
                    />
                    {errors[name] && <small className={formStyles.error}>{errors[name]}</small>}
                  </div>
                ))}
              </div>
              <div className={formStyles.field}>
                <label className={formStyles.label} htmlFor="user-username">
                  Username
                </label>
                <input
                  id="user-username"
                  className={`${formStyles.input} ${errors.username ? formStyles.inputError : ''}`}
                  value={values.username}
                  onChange={(e) => set('username', e.target.value)}
                  maxLength={150}
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={Boolean(lockReason.profile)}
                />
                {errors.username && <small className={formStyles.error}>{errors.username}</small>}
              </div>
              <div className={formStyles.field}>
                <label className={formStyles.label} htmlFor="user-email">
                  Email
                </label>
                <input
                  id="user-email"
                  type="email"
                  className={`${formStyles.input} ${errors.email ? formStyles.inputError : ''}`}
                  value={values.email}
                  onChange={(e) => set('email', e.target.value)}
                  maxLength={254}
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={Boolean(lockReason.email)}
                />
                {errors.email && <small className={formStyles.error}>{errors.email}</small>}
                {lockReason.email && !readOnly && (
                  <small className={styles.lockedReason}>
                    <FaLock aria-hidden="true" /> {lockReason.email}
                  </small>
                )}
              </div>
            </fieldset>

            {/* ---------- Access ---------- */}
            <fieldset className={styles.group} disabled={saving}>
              <legend>Access</legend>
              <Switch
                id="user-is_active"
                label="Account switched on"
                help="Off: they can’t sign in, and every device is signed out."
                checked={values.is_active}
                onChange={(v) => set('is_active', v)}
                lockedReason={lockReason.access}
              />
              <Switch
                id="user-is_email_verified"
                label="Email verified"
                help="Members can only sign in once their email is verified."
                checked={values.is_email_verified}
                onChange={(v) => set('is_email_verified', v)}
                lockedReason={readOnly ? lockReason.profile : ''}
              />
              {errors.is_active && <small className={formStyles.error}>{errors.is_active}</small>}
            </fieldset>

            {/* ---------- Roles ---------- */}
            <fieldset className={styles.group} disabled={saving}>
              <legend>Admin roles</legend>
              <Switch
                id="user-is_staff"
                label="Staff"
                help="Can sign in to this dashboard and change content and members."
                checked={values.is_staff}
                onChange={(v) => set('is_staff', v)}
                lockedReason={lockReason.roles}
              />
              <Switch
                id="user-is_superuser"
                label="Superuser"
                help="Everything staff can do, plus other admins and Django admin."
                checked={values.is_superuser}
                onChange={(v) => set('is_superuser', v)}
                lockedReason={lockReason.roles ? ' ' : ''}
              />
              {(errors.is_staff || errors.is_superuser) && (
                <small className={formStyles.error}>{errors.is_staff || errors.is_superuser}</small>
              )}
              {values.is_staff && !initial.is_staff && (
                <small className={formStyles.hint}>Admins always sign in with a code from their email.</small>
              )}
            </fieldset>
          </form>

          {/* ---------- Security ---------- */}
          <section className={styles.group} aria-labelledby="user-security">
            <h3 id="user-security" className={styles.groupTitle}>
              Security
            </h3>
            <div className={styles.actionRow}>
              <div>
                <strong>Sign-in codes</strong>
                <small>
                  {twoFactor.required
                    ? 'Always on: admin accounts need an emailed code every time.'
                    : twoFactor.switched_on
                      ? 'On: they sign in with a code from their email.'
                      : 'Off: their password is enough.'}
                </small>
              </div>
              {twoFactor.switched_on && !twoFactor.required && !isSelf && !readOnly && (
                <button
                  type="button"
                  className={`${pageStyles.button} ${pageStyles.buttonGhost} ${pageStyles.buttonSmall}`}
                  onClick={() => runAction('two-factor-off')}
                  disabled={Boolean(busyAction)}
                >
                  <FaKey aria-hidden="true" /> {confirmAction === 'two-factor-off' ? 'Yes, turn off' : 'Turn off'}
                </button>
              )}
            </div>
            <div className={styles.actionRow}>
              <div>
                <strong>Sessions</strong>
                <small>Signs this account out of the website and apps on every device.</small>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  className={`${pageStyles.button} ${pageStyles.buttonGhost} ${pageStyles.buttonSmall}`}
                  onClick={() => runAction('sign-out')}
                  disabled={Boolean(busyAction)}
                >
                  <FaSignOutAlt aria-hidden="true" /> {confirmAction === 'sign-out' ? 'Yes, sign out' : 'Sign out everywhere'}
                </button>
              )}
            </div>
          </section>

          {/* ---------- Delete ---------- */}
          {canDelete && (
            <section className={`${styles.group} ${styles.danger}`} aria-labelledby="user-delete">
              <h3 id="user-delete" className={styles.groupTitle}>
                Delete account
              </h3>
              <p className={styles.dangerText}>
                Deletes the account, its history, likes, scores and profile photo. This can’t be undone; to stop
                someone signing in, switch the account off instead.
              </p>
              <label className={formStyles.label} htmlFor="user-delete-confirm">
                Type <code>{deleteWord}</code> to confirm
              </label>
              <div className={formStyles.inlineRow}>
                <input
                  id="user-delete-confirm"
                  className={formStyles.input}
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  className={`${pageStyles.button} ${styles.dangerButton}`}
                  onClick={() => runAction('delete', { confirmed: true })}
                  disabled={deleteText.trim() !== deleteWord || Boolean(busyAction)}
                >
                  <FaTrashAlt aria-hidden="true" /> {busyAction === 'delete' ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </section>
          )}
        </div>

        {/* ---------- Footer ---------- */}
        <footer className={styles.panelFooter}>
          {formError && (
            <p className={styles.footerError} role="alert">
              {formError}
            </p>
          )}
          {confirmSave && warnings.length > 0 && (
            <div className={styles.confirmBox} role="alert">
              <FaExclamationTriangle aria-hidden="true" />
              <div>
                <strong>Please check before saving:</strong>
                <ul>
                  {warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {confirmClose && (
            <p className={styles.footerError} role="alert">
              You have unsaved changes. Close again to discard them.
            </p>
          )}
          <div className={styles.footerButtons}>
            <button type="button" className={`${pageStyles.button} ${pageStyles.buttonGhost}`} onClick={requestClose}>
              {confirmClose ? 'Discard changes' : 'Close'}
            </button>
            {!readOnly && (
              <button
                type="submit"
                form="user-editor-form"
                className={`${pageStyles.button} ${pageStyles.buttonGradient}`}
                disabled={!dirty || saving}
              >
                <FaSave aria-hidden="true" /> {saving ? 'Saving…' : confirmSave ? 'Yes, save changes' : 'Save changes'}
              </button>
            )}
          </div>
        </footer>
      </aside>
    </div>
  );
};

export default UserEditor;
