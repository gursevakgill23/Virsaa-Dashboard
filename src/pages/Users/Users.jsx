/**
 * Users — the Members pages: every account, page by page, with search,
 * filters, CSV export and an editor for each account (UserEditor.jsx).
 *
 *   /users/all      everyone
 *   /users/free     Free membership          (old link /users/basic)
 *   /users/paid     any paid plan            (old link /users/premium)
 *   /users/admins   staff and superusers
 *
 * Data: GET /api/dashboard/users/ (dashboard_api/users.py), searched and
 * filtered on the server, 25 at a time. If the server doesn't have that
 * section yet, the page falls back to the older read-only list
 * (/api/auth/users/<all|basic|premium>/) and says editing needs the update.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import {
  FaUsers, FaSearch, FaSyncAlt, FaDownload, FaCrown, FaPen, FaBan, FaExclamationTriangle,
} from 'react-icons/fa';
import { api, getErrorMessage, toCount, toList } from '../../api/client';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import PageHeader from '../../components/ui/PageHeader';
import Avatar from '../../components/ui/Avatar';
import UserEditor from './UserEditor';
import { RoleBadge, fullName, isPaid } from './memberUtils';
import pageStyles from '../../styles/Page.module.css';
import styles from './Users.module.css';

const PAGE_SIZE = 25;

const FILTERS = {
  all: { title: 'All members', subtitle: 'Everyone with a Virsaa account. Open one to change its membership, access or roles.', params: {}, legacy: 'all' },
  free: { title: 'Free members', subtitle: 'Accounts on the Free membership.', params: { plan: 'free' }, legacy: 'basic' },
  paid: { title: 'Paid members', subtitle: 'Accounts on a paid plan (Basic, Standard, Premium…).', params: { plan: 'paid' }, legacy: 'premium' },
  admins: { title: 'Admins', subtitle: 'Staff can use this dashboard; superusers can also manage other admins.', params: { role: 'staff' }, legacy: null },
};
const OLD_LINKS = { basic: 'free', premium: 'paid', staff: 'admins' };

const SORTS = [
  { value: '-joined_date', label: 'Newest first' },
  { value: 'joined_date', label: 'Oldest first' },
  { value: '-last_logined', label: 'Recently signed in' },
  { value: 'username', label: 'Username A–Z' },
];

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '—');

/**
 * Escapes a value for CSV and neutralises spreadsheet formula injection
 * (cells starting with = + - @ are prefixed with ').
 */
const csvCell = (value) => {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const Users = () => {
  const { filterType } = useParams();
  const filter = FILTERS[filterType] ? filterType : null;

  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [legacy, setLegacy] = useState(false); // the server has no /api/dashboard/users/ yet

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(''); // '' | active | off | unverified
  const [sort, setSort] = useState('-joined_date');
  const [editingId, setEditingId] = useState(null);
  const search = useDebouncedValue(query.trim(), 350);
  const requestId = useRef(0);

  const paramsFor = useCallback(
    (pageNumber) => {
      const params = { ...FILTERS[filter].params, page: pageNumber, page_size: PAGE_SIZE, ordering: sort };
      if (search) params.search = search;
      if (status === 'active') params.is_active = 'true';
      if (status === 'off') params.is_active = 'false';
      if (status === 'unverified') params.is_email_verified = 'false';
      return params;
    },
    [filter, search, sort, status]
  );

  /** Older backend: the whole list at once, searched and sorted here. */
  const loadLegacy = useCallback(async () => {
    const which = FILTERS[filter].legacy;
    if (!which) return { list: [], total: 0 };
    const { data } = await api.get(`/api/auth/users/${which}/`);
    const q = search.toLowerCase();
    const list = toList(data)
      .filter((u) => !q || `${fullName(u)} ${u.username || ''} ${u.email || ''}`.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.joined_date || 0) - new Date(a.joined_date || 0));
    return { list, total: list.length };
  }, [filter, search]);

  const load = useCallback(
    async (pageNumber = 1) => {
      if (!filter) return;
      const id = ++requestId.current;
      if (pageNumber === 1) setLoading(true);
      else setLoadingMore(true);
      setError('');
      try {
        const { data } = await api.get('/api/dashboard/users/', { params: paramsFor(pageNumber) });
        if (id !== requestId.current) return;
        const list = toList(data);
        setRows((current) => (pageNumber === 1 ? list : [...current, ...list.filter((u) => !current.some((c) => c.id === u.id))]));
        setCount(toCount(data));
        setHasMore(Boolean(data?.next));
        setPage(pageNumber);
        setLegacy(false);
      } catch (err) {
        if (id !== requestId.current) return;
        if (err?.response?.status === 404 && pageNumber === 1) {
          try {
            const { list, total } = await loadLegacy();
            if (id !== requestId.current) return;
            setRows(list);
            setCount(total);
            setHasMore(false);
            setLegacy(true);
            return;
          } catch (legacyErr) {
            if (id === requestId.current) setError(getErrorMessage(legacyErr, 'Could not load members.'));
          }
        } else {
          setError(getErrorMessage(err, 'Could not load members.'));
        }
        if (pageNumber === 1) setRows([]);
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [filter, paramsFor, loadLegacy]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  // A different page of the menu starts with a clean search and a closed editor.
  useEffect(() => {
    setQuery('');
    setStatus('');
    setEditingId(null);
  }, [filterType]);

  /** The editor saved or deleted an account: update the row in place. */
  const onSaved = (updated) => setRows((current) => current.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
  const onDeleted = (id) => {
    setRows((current) => current.filter((u) => u.id !== id));
    setCount((n) => Math.max(0, n - 1));
    setEditingId(null);
  };

  /** Downloads the loaded rows as a CSV file (built in the browser). */
  const exportCsv = () => {
    const header = ['Name', 'Username', 'Email', 'Membership', 'Joined', 'Last sign-in', 'Active', 'Email verified', 'Staff', 'Superuser'];
    const yesNo = (v) => (v ? 'yes' : 'no');
    const lines = rows.map((u) => [
      fullName(u), u.username, u.email, u.membership_level,
      u.joined_date ? new Date(u.joined_date).toISOString().slice(0, 10) : '',
      u.last_logined ? new Date(u.last_logined).toISOString().slice(0, 10) : '',
      yesNo(u.is_active !== false), yesNo(u.is_email_verified), yesNo(u.is_staff), yesNo(u.is_superuser),
    ]);
    const csv = [header, ...lines].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `virsaa-members-${filter}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!filter) return <Navigate to={`/users/${OLD_LINKS[filterType] || 'all'}`} replace />;

  const editing = rows.find((u) => u.id === editingId) || null;

  return (
    <>
      <PageHeader
        eyebrow="Members"
        icon={FaUsers}
        title={FILTERS[filter].title}
        subtitle={FILTERS[filter].subtitle}
        actions={
          <>
            <button type="button" className={`${pageStyles.button} ${pageStyles.buttonGhost}`} onClick={() => load(1)} disabled={loading}>
              <FaSyncAlt aria-hidden="true" /> Refresh
            </button>
            <button
              type="button"
              className={`${pageStyles.button} ${pageStyles.buttonGradient}`}
              onClick={exportCsv}
              disabled={loading || rows.length === 0}
              title={hasMore ? 'Exports the members loaded so far' : undefined}
            >
              <FaDownload aria-hidden="true" /> Export CSV
            </button>
          </>
        }
      />

      {legacy && (
        <div className={styles.notice} role="status">
          <FaExclamationTriangle aria-hidden="true" />
          <span>
            Read-only list: the server doesn’t have the Members section of <code>dashboard_api</code> yet
            (<code>/api/dashboard/users/</code>). Deploy the updated backend to edit accounts.
          </span>
        </div>
      )}

      <section className={`${pageStyles.card} ${pageStyles.fadeIn}`}>
        <div className={styles.toolbar}>
          <div className={styles.search}>
            <FaSearch aria-hidden="true" />
            <input
              type="search"
              placeholder="Search by name, username or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search members"
              maxLength={100}
            />
          </div>
          {!legacy && (
            <>
              <label className={styles.sort}>
                <span>Show</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Account status">
                  <option value="">Any status</option>
                  <option value="active">Switched on</option>
                  <option value="off">Switched off</option>
                  <option value="unverified">Email not verified</option>
                </select>
              </label>
              <label className={styles.sort}>
                <span>Sort</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <span className={styles.count}>
            {loading ? 'Loading…' : `${rows.length.toLocaleString()} of ${count.toLocaleString()}`}
          </span>
        </div>

        {error && (
          <div className={pageStyles.errorBox} role="alert">
            {error}
          </div>
        )}

        {!error && (
          <div className={pageStyles.tableWrap}>
            <table className={pageStyles.table}>
              <thead>
                <tr>
                  <th scope="col">Member</th>
                  <th scope="col">Plan</th>
                  <th scope="col" className={styles.hideSm}>
                    Joined
                  </th>
                  <th scope="col" className={styles.hideMd}>
                    Last sign-in
                  </th>
                  <th scope="col">Role</th>
                  <th scope="col" className={styles.actionsCol}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  [0, 1, 2, 3, 4].map((i) => (
                    <tr key={`s${i}`} aria-hidden="true">
                      <td colSpan={6}>
                        <span className={pageStyles.skeleton} style={{ display: 'block', height: 18 }} />
                      </td>
                    </tr>
                  ))}

                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className={pageStyles.empty}>
                        <p className={pageStyles.emptyTitle}>{query || status ? 'No matching members' : 'No members here yet'}</p>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading &&
                  rows.map((u) => (
                    <tr
                      key={u.id ?? u.email}
                      className={`${!legacy ? styles.clickable : ''} ${u.id === editingId ? styles.selected : ''}`}
                      onClick={legacy ? undefined : () => setEditingId(u.id)}
                    >
                      <td>
                        <div className={styles.member}>
                          <Avatar src={u.profile_photo} name={fullName(u)} size={38} />
                          <div className={styles.memberText}>
                            <strong>
                              {fullName(u)} {u.is_you && <span className={styles.you}>You</span>}
                            </strong>
                            <small>{u.email}</small>
                            <span className={styles.flags}>
                              {u.is_active === false && (
                                <span className={styles.flagOff}>
                                  <FaBan aria-hidden="true" /> Switched off
                                </span>
                              )}
                              {u.is_email_verified === false && <span className={styles.flagWarn}>Email not verified</span>}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`${pageStyles.pill} ${isPaid(u) ? pageStyles.pillGold : ''}`}>
                          {isPaid(u) && <FaCrown aria-hidden="true" />} {u.membership_level || 'Free'}
                        </span>
                      </td>
                      <td className={styles.hideSm}>{formatDate(u.joined_date)}</td>
                      <td className={styles.hideMd}>{formatDate(u.last_logined)}</td>
                      <td>
                        <RoleBadge user={u} />
                      </td>
                      <td className={styles.actionsCol}>
                        {!legacy && (
                          <button
                            type="button"
                            className={styles.editButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(u.id);
                            }}
                            aria-label={`Edit ${fullName(u)}`}
                          >
                            <FaPen aria-hidden="true" /> <span className={styles.hideSm}>Edit</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {hasMore && !loading && (
          <div className={styles.more}>
            <button
              type="button"
              className={`${pageStyles.button} ${pageStyles.buttonGhost}`}
              onClick={() => load(page + 1)}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading…' : `Load more (${(count - rows.length).toLocaleString()} left)`}
            </button>
          </div>
        )}
      </section>

      {editing && (
        <UserEditor
          key={editing.id}
          summary={editing}
          onClose={() => setEditingId(null)}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      )}
    </>
  );
};

export default Users;
