/**
 * Users — members list for All / Basic / Premium, with search, sort and
 * CSV export. The filter comes from the URL: /users/all | basic | premium.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { FaUsers, FaSearch, FaSyncAlt, FaDownload, FaCrown, FaShieldAlt } from 'react-icons/fa';
import { api, getErrorMessage, toList } from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import Avatar from '../../components/ui/Avatar';
import pageStyles from '../../styles/Page.module.css';
import styles from './Users.module.css';

const FILTERS = {
  all: { title: 'All members', subtitle: 'Everyone with a Virsaa account.' },
  basic: { title: 'Basic plan', subtitle: 'Members on the free Basic plan.' },
  premium: { title: 'Premium members', subtitle: 'Members with an active Premium subscription.' },
};

const fullName = (u) => [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || '—';

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
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const requestId = useRef(0);

  const filter = FILTERS[filterType] ? filterType : null;

  const load = useCallback(async () => {
    if (!filter) return;
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/api/auth/users/${filter}/`);
      if (id === requestId.current) setUsers(toList(data));
    } catch (err) {
      if (id === requestId.current) {
        setUsers([]);
        setError(getErrorMessage(err, 'Could not load members.'));
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setQuery('');
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? users.filter((u) => `${fullName(u)} ${u.username || ''} ${u.email || ''}`.toLowerCase().includes(q))
      : users.slice();
    list.sort((a, b) => {
      if (sort === 'name') return fullName(a).localeCompare(fullName(b));
      const diff = new Date(b.joined_date || 0) - new Date(a.joined_date || 0);
      return sort === 'oldest' ? -diff : diff;
    });
    return list;
  }, [users, query, sort]);

  /** Downloads the currently visible rows as a CSV file (built locally). */
  const exportCsv = () => {
    const header = ['Name', 'Username', 'Email', 'Membership', 'Joined', 'Staff', 'Superuser'];
    const rows = visible.map((u) => [
      fullName(u),
      u.username,
      u.email,
      u.membership_level,
      u.joined_date ? new Date(u.joined_date).toISOString().slice(0, 10) : '',
      u.is_staff ? 'yes' : 'no',
      u.is_superuser ? 'yes' : 'no',
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `virsaa-members-${filter}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!filter) return <Navigate to="/users/all" replace />;

  return (
    <>
      <PageHeader
        eyebrow="Members"
        icon={FaUsers}
        title={FILTERS[filter].title}
        subtitle={FILTERS[filter].subtitle}
        actions={
          <>
            <button type="button" className={`${pageStyles.button} ${pageStyles.buttonGhost}`} onClick={load} disabled={loading}>
              <FaSyncAlt aria-hidden="true" /> Refresh
            </button>
            <button
              type="button"
              className={`${pageStyles.button} ${pageStyles.buttonGradient}`}
              onClick={exportCsv}
              disabled={loading || visible.length === 0}
            >
              <FaDownload aria-hidden="true" /> Export CSV
            </button>
          </>
        }
      />

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
          <label className={styles.sort}>
            <span>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
            </select>
          </label>
          <span className={styles.count}>{loading ? 'Loading…' : `${visible.length.toLocaleString()} of ${users.length.toLocaleString()}`}</span>
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
                    Interests
                  </th>
                  <th scope="col">Role</th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  [0, 1, 2, 3, 4].map((i) => (
                    <tr key={`s${i}`} aria-hidden="true">
                      <td colSpan={5}>
                        <span className={pageStyles.skeleton} style={{ display: 'block', height: 18 }} />
                      </td>
                    </tr>
                  ))}

                {!loading && visible.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <div className={pageStyles.empty}>
                        <p className={pageStyles.emptyTitle}>{query ? 'No matching members' : 'No members yet'}</p>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading &&
                  visible.map((u) => {
                    const isPremium = String(u.membership_level || '').toLowerCase().includes('premium');
                    const interests = Array.isArray(u.preferred_content) ? u.preferred_content : [];
                    return (
                      <tr key={u.id ?? u.email}>
                        <td>
                          <div className={styles.member}>
                            <Avatar src={u.profile_photo} name={fullName(u)} size={38} />
                            <div className={styles.memberText}>
                              <strong>{fullName(u)}</strong>
                              <small>{u.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`${pageStyles.pill} ${isPremium ? pageStyles.pillGold : ''}`}>
                            {isPremium && <FaCrown aria-hidden="true" />} {u.membership_level || 'Basic'}
                          </span>
                        </td>
                        <td className={styles.hideSm}>{u.joined_date ? new Date(u.joined_date).toLocaleDateString() : '—'}</td>
                        <td className={styles.hideMd}>
                          <div className={styles.chips}>
                            {interests.slice(0, 3).map((item) => (
                              <span key={String(item)} className={styles.chip}>
                                {String(item)}
                              </span>
                            ))}
                            {interests.length > 3 && <span className={styles.chip}>+{interests.length - 3}</span>}
                            {interests.length === 0 && '—'}
                          </div>
                        </td>
                        <td>
                          {u.is_superuser ? (
                            <span className={`${pageStyles.pill} ${pageStyles.pillGold}`}>
                              <FaShieldAlt aria-hidden="true" /> Superuser
                            </span>
                          ) : u.is_staff ? (
                            <span className={pageStyles.pill}>
                              <FaShieldAlt aria-hidden="true" /> Staff
                            </span>
                          ) : (
                            <span className={styles.muted}>Member</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
};

export default Users;
