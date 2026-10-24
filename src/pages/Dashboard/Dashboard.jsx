/**
 * Dashboard — overview from GET /api/dashboard/ (how many of everything,
 * how many are hidden, what is waiting for a look, member counts) and the
 * newest accounts from /api/dashboard/users/. Requests run in parallel; one
 * failing never blanks the page.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaUsers, FaCrown, FaBook, FaHeadphones, FaArrowRight, FaSyncAlt, FaPlus, FaClock, FaInbox } from 'react-icons/fa';
import { api, getErrorMessage, toCount, toList } from '../../api/client';
import { CONTENT_TYPES } from '../../config/contentTypes';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import Avatar from '../../components/ui/Avatar';
import pageStyles from '../../styles/Page.module.css';
import styles from './Dashboard.module.css';

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatNumber = (value) => (typeof value === 'number' ? value.toLocaleString() : '—');

/** Total items for a section from the summary (arcade and calendar are shaped differently). */
const totalFor = (type, summary) => {
  const entry = summary?.[type.summaryKey];
  if (!entry) return null;
  if (type.key === 'arcade') return Object.values(entry).reduce((sum, game) => sum + (game?.items || 0), 0);
  if (type.key === 'gurpurabs') return entry.this_year ?? null;
  return typeof entry.total === 'number' ? entry.total : null;
};

/** A short note under the count: hidden / waiting / this year… */
const noteFor = (type, summary) => {
  const entry = summary?.[type.summaryKey];
  if (!entry) return '';
  if (type.key === 'gurpurabs') return `this year · ${entry.custom ?? 0} added here`;
  if (type.key === 'events') return [entry.upcoming != null && `${entry.upcoming} upcoming`, entry.hidden && `${entry.hidden} waiting`].filter(Boolean).join(' · ');
  if (type.key === 'arcade') {
    const builtin = Object.values(entry).filter((g) => g?.uses_builtin).length;
    return builtin ? `${builtin} games on built-in content` : '';
  }
  return entry.hidden ? `${entry.hidden} hidden` : '';
};

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState('');
  const [members, setMembers] = useState({ all: null, premium: null, basic: null, newest: [] });

  const load = useCallback(async () => {
    setLoading(true);
    setSummaryError('');
    // The summary has member counts (users: {...}) and users/ the newest accounts.
    const [overview, newest] = await Promise.allSettled([
      api.get('/api/dashboard/'),
      api.get('/api/dashboard/users/', { params: { ordering: '-joined_date', page_size: 6 } }),
    ]);

    const data = overview.status === 'fulfilled' ? overview.value.data || {} : null;
    if (data) setSummary(data);
    else setSummaryError(getErrorMessage(overview.reason, 'Could not load the overview.'));

    if (data?.users && newest.status === 'fulfilled') {
      setMembers({
        all: data.users.total ?? null,
        premium: data.users.paid ?? null,
        basic: data.users.free ?? null,
        newest: toList(newest.value.data).slice(0, 6),
      });
      setLoading(false);
      return;
    }

    // An older backend without the Members section: count the full lists instead.
    const [all, premium, basic] = await Promise.allSettled([
      api.get('/api/auth/users/all/'),
      api.get('/api/auth/users/premium/'),
      api.get('/api/auth/users/basic/'),
    ]);
    const countOf = (r) => (r.status === 'fulfilled' ? toCount(r.value.data) : null);
    setMembers({
      all: countOf(all),
      premium: countOf(premium),
      basic: countOf(basic),
      newest:
        all.status === 'fulfilled'
          ? toList(all.value.data)
              .slice()
              .sort((a, b) => new Date(b?.joined_date || 0) - new Date(a?.joined_date || 0))
              .slice(0, 6)
          : [],
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const premiumShare = members.all && typeof members.premium === 'number' ? Math.round((members.premium / members.all) * 100) : null;

  const breakdown = useMemo(() => {
    const rows = CONTENT_TYPES.map((type) => ({ type, count: totalFor(type, summary), note: noteFor(type, summary) }));
    const max = Math.max(1, ...rows.map((r) => r.count || 0));
    return rows.map((r) => ({ ...r, percent: r.count ? Math.max(4, (r.count / max) * 100) : 0 }));
  }, [summary]);

  const waitingEvents = summary?.waiting?.events ?? 0;
  const waitingBooks = summary?.waiting?.shared_books;
  const firstName = user?.first_name || user?.username || 'Admin';

  const tiles = [
    { label: 'Members', value: members.all, icon: FaUsers, to: '/users/all', note: summary?.users?.unverified ? `${summary.users.unverified} not verified` : '' },
    { label: 'Paid members', value: members.premium, icon: FaCrown, to: '/users/paid', note: premiumShare !== null ? `${premiumShare}% of members` : '' },
    { label: 'Ebooks', value: summary?.ebooks?.total, icon: FaBook, to: '/uploads/ebooks' },
    { label: 'Audiobooks', value: summary?.audiobooks?.total, icon: FaHeadphones, to: '/uploads/audiobooks', note: summary?.audiobooks?.hidden ? `${summary.audiobooks.hidden} hidden` : '' },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={`${greeting()}, ${firstName}`}
        subtitle="Here’s what’s happening across Virsaa today."
        actions={
          <button type="button" className={`${pageStyles.button} ${pageStyles.buttonGhost}`} onClick={load} disabled={loading}>
            <FaSyncAlt aria-hidden="true" /> Refresh
          </button>
        }
      />

      {summaryError && (
        <div className={pageStyles.errorBox} role="alert" style={{ marginBottom: 20 }}>
          {summaryError}
        </div>
      )}

      {/* ---------- Waiting for a look ---------- */}
      {!loading && (waitingEvents > 0 || waitingBooks > 0) && (
        <section className={`${styles.waiting} ${pageStyles.fadeIn}`} aria-label="Waiting for review">
          <span className={styles.waitingIcon}>
            <FaInbox aria-hidden="true" />
          </span>
          <div className={styles.waitingText}>
            <strong>Waiting for you</strong>
            <span>
              {[waitingEvents > 0 && `${waitingEvents} event${waitingEvents === 1 ? '' : 's'} to approve`, waitingBooks > 0 && `${waitingBooks} shared book${waitingBooks === 1 ? '' : 's'} to review`]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>
          {waitingEvents > 0 && (
            <Link to="/uploads/events?is_approved=false" className={`${pageStyles.button} ${pageStyles.buttonSmall}`}>
              <FaClock aria-hidden="true" /> Review events
            </Link>
          )}
        </section>
      )}

      {/* ---------- Stat tiles ---------- */}
      <div className={styles.tiles}>
        {tiles.map(({ label, value, icon: Icon, to, note }, index) => (
          <Link key={label} to={to} className={`${styles.tile} ${index === 0 ? styles.tileHero : ''} ${pageStyles.fadeIn}`}>
            <span className={styles.tileIcon}>
              <Icon aria-hidden="true" />
            </span>
            <span className={styles.tileLabel}>{label}</span>
            {loading ? <span className={`${pageStyles.skeleton} ${styles.tileSkeleton}`} /> : <span className={styles.tileValue}>{formatNumber(value)}</span>}
            {note && !loading && <span className={styles.tileNote}>{note}</span>}
          </Link>
        ))}
      </div>

      <div className={styles.columns}>
        {/* ---------- Every section ---------- */}
        <section className={`${pageStyles.card} ${pageStyles.fadeIn}`} aria-labelledby="library-heading">
          <div className={pageStyles.cardHeader}>
            <div>
              <h2 id="library-heading" className={pageStyles.cardTitle}>
                Content
              </h2>
              <p className={pageStyles.cardMeta}>Everything on the website, including hidden items</p>
            </div>
          </div>
          <ul className={styles.bars}>
            {breakdown.map(({ type, count, note, percent }) => {
              const Icon = type.icon;
              return (
                <li key={type.key}>
                  <Link to={`/uploads/${type.slug}`} className={styles.barRow}>
                    <span className={styles.barIcon}>
                      <Icon aria-hidden="true" />
                    </span>
                    <span className={styles.barLabel}>
                      {type.label}
                      {note && !loading && <small>{note}</small>}
                    </span>
                    <span className={styles.barTrack} aria-hidden="true">
                      <span className={styles.barFill} style={{ width: loading ? '0%' : `${percent}%` }} />
                    </span>
                    <span className={styles.barValue}>{loading ? '…' : formatNumber(count)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <div className={styles.sideColumn}>
          {/* ---------- Membership split ---------- */}
          <section className={`${pageStyles.card} ${pageStyles.fadeIn}`} aria-labelledby="plan-heading">
            <h2 id="plan-heading" className={pageStyles.cardTitle}>
              Membership plans
            </h2>
            <div className={styles.donutWrap}>
              <div className={styles.donut} style={{ '--premium': `${premiumShare ?? 0}%` }} role="img" aria-label={premiumShare !== null ? `${premiumShare}% of members are on a paid plan` : 'Membership data unavailable'}>
                <span>
                  <strong>{premiumShare !== null ? `${premiumShare}%` : '—'}</strong>
                  <small>Paid</small>
                </span>
              </div>
              <ul className={styles.legend}>
                <li>
                  <span className={`${styles.dot} ${styles.dotPremium}`} /> Paid plans <strong>{formatNumber(members.premium)}</strong>
                </li>
                <li>
                  <span className={`${styles.dot} ${styles.dotBasic}`} /> Free <strong>{formatNumber(members.basic)}</strong>
                </li>
              </ul>
            </div>
          </section>

          {/* ---------- Newest members ---------- */}
          <section className={`${pageStyles.card} ${pageStyles.fadeIn}`} aria-labelledby="members-heading">
            <div className={pageStyles.cardHeader}>
              <h2 id="members-heading" className={pageStyles.cardTitle}>
                Newest members
              </h2>
              <Link to="/users/all" className={styles.seeAll}>
                See all <FaArrowRight aria-hidden="true" />
              </Link>
            </div>
            {!loading && members.newest.length === 0 && <p className={pageStyles.empty}>No members to show.</p>}
            <ul className={styles.members}>
              {members.newest.map((m) => {
                const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.username || 'Member';
                return (
                  <li key={m.id ?? m.email} className={styles.member}>
                    <Avatar src={m.profile_photo} name={name} size={38} />
                    <span className={styles.memberText}>
                      <strong>{name}</strong>
                      <small>{m.joined_date ? new Date(m.joined_date).toLocaleDateString() : m.email}</small>
                    </span>
                    {m.membership_level && !/^free$/i.test(m.membership_level) && (
                      <span className={`${pageStyles.pill} ${pageStyles.pillGold}`} title={m.membership_level}>
                        <FaCrown aria-hidden="true" />
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>

      {/* ---------- Quick add ---------- */}
      <section className={`${styles.quick} ${pageStyles.fadeIn}`} aria-labelledby="quick-heading">
        <h2 id="quick-heading" className={styles.quickTitle}>
          Quick add
        </h2>
        <div className={styles.quickGrid}>
          {CONTENT_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <Link key={type.key} to={`/uploads/${type.slug}`} className={styles.quickTile}>
                <span className={styles.quickIcon}>
                  <Icon aria-hidden="true" />
                </span>
                <span>{type.label}</span>
                <FaPlus className={styles.quickPlus} aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
};

export default Dashboard;
