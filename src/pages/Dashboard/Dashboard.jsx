/**
 * Dashboard — live overview built from real API data (no more placeholder
 * numbers). Every request runs in parallel with Promise.allSettled, so one
 * missing endpoint never breaks the rest of the page.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaUsers, FaCrown, FaBook, FaHeadphones, FaArrowRight, FaSyncAlt, FaPlus } from 'react-icons/fa';
import { api, toCount, toList } from '../../api/client';
import { CONTENT_TYPES } from '../../config/contentTypes';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import Avatar from '../../components/ui/Avatar';
import pageStyles from '../../styles/Page.module.css';
import styles from './Dashboard.module.css';

/** Greeting based on the admin's local time. */
const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatNumber = (value) => (typeof value === 'number' ? value.toLocaleString() : '—');

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: null, premium: null, basic: null, content: {} });
  const [recentUsers, setRecentUsers] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);

    const userRequests = ['all', 'premium', 'basic'].map((filter) => api.get(`/api/auth/users/${filter}/`));
    const contentRequests = CONTENT_TYPES.map((type) => api.get(type.endpoints.list, { params: { page_size: 1 } }));

    const [allUsers, premium, basic, ...contentResults] = await Promise.allSettled([...userRequests, ...contentRequests]);

    const countOf = (result) => (result.status === 'fulfilled' ? toCount(result.value.data) : null);

    const content = {};
    CONTENT_TYPES.forEach((type, index) => {
      content[type.key] = countOf(contentResults[index]);
    });

    setStats({ users: countOf(allUsers), premium: countOf(premium), basic: countOf(basic), content });

    if (allUsers.status === 'fulfilled') {
      const list = toList(allUsers.value.data)
        .slice()
        .sort((a, b) => new Date(b?.joined_date || 0) - new Date(a?.joined_date || 0))
        .slice(0, 6);
      setRecentUsers(list);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const premiumShare =
    stats.users && typeof stats.premium === 'number' ? Math.round((stats.premium / stats.users) * 100) : null;

  /** Content types sorted by size for the library breakdown bars. */
  const breakdown = useMemo(() => {
    const rows = CONTENT_TYPES.map((type) => ({ type, count: stats.content[type.key] }));
    const max = Math.max(1, ...rows.map((r) => r.count || 0));
    return rows.map((r) => ({ ...r, percent: r.count ? Math.max(4, (r.count / max) * 100) : 0 }));
  }, [stats.content]);

  const totalContent = breakdown.reduce((sum, row) => sum + (row.count || 0), 0);
  const firstName = user?.first_name || user?.username || 'Admin';

  const tiles = [
    { label: 'Members', value: stats.users, icon: FaUsers, to: '/users/all' },
    { label: 'Premium members', value: stats.premium, icon: FaCrown, to: '/users/premium', note: premiumShare !== null ? `${premiumShare}% of members` : '' },
    { label: 'Ebooks', value: stats.content.ebooks, icon: FaBook, to: '/uploads/ebooks' },
    { label: 'Audiobooks', value: stats.content.audiobooks, icon: FaHeadphones, to: '/uploads/audiobooks' },
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

      {/* ---------- Stat tiles ---------- */}
      <div className={styles.tiles}>
        {tiles.map(({ label, value, icon: Icon, to, note }, index) => (
          <Link key={label} to={to} className={`${styles.tile} ${index === 0 ? styles.tileHero : ''} ${pageStyles.fadeIn}`}>
            <span className={styles.tileIcon}>
              <Icon aria-hidden="true" />
            </span>
            <span className={styles.tileLabel}>{label}</span>
            {loading ? (
              <span className={`${pageStyles.skeleton} ${styles.tileSkeleton}`} />
            ) : (
              <span className={styles.tileValue}>{formatNumber(value)}</span>
            )}
            {note && !loading && <span className={styles.tileNote}>{note}</span>}
          </Link>
        ))}
      </div>

      <div className={styles.columns}>
        {/* ---------- Library breakdown ---------- */}
        <section className={`${pageStyles.card} ${pageStyles.fadeIn}`} aria-labelledby="library-heading">
          <div className={pageStyles.cardHeader}>
            <div>
              <h2 id="library-heading" className={pageStyles.cardTitle}>
                Content library
              </h2>
              <p className={pageStyles.cardMeta}>{loading ? 'Counting…' : `${totalContent.toLocaleString()} items across ${CONTENT_TYPES.length} collections`}</p>
            </div>
          </div>
          <ul className={styles.bars}>
            {breakdown.map(({ type, count, percent }) => {
              const Icon = type.icon;
              return (
                <li key={type.key}>
                  <Link to={`/uploads/${type.slug}`} className={styles.barRow}>
                    <span className={styles.barIcon}>
                      <Icon aria-hidden="true" />
                    </span>
                    <span className={styles.barLabel}>{type.label}</span>
                    <span className={styles.barTrack} aria-hidden="true">
                      <span className={styles.barFill} style={{ width: loading ? '0%' : `${percent}%` }} />
                    </span>
                    <span className={styles.barValue}>{loading ? '…' : count === null ? 'n/a' : count.toLocaleString()}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className={styles.footnote}>“n/a” means the list endpoint isn’t available on the backend yet.</p>
        </section>

        <div className={styles.sideColumn}>
          {/* ---------- Membership split ---------- */}
          <section className={`${pageStyles.card} ${pageStyles.fadeIn}`} aria-labelledby="plan-heading">
            <h2 id="plan-heading" className={pageStyles.cardTitle}>
              Membership plans
            </h2>
            <div className={styles.donutWrap}>
              <div
                className={styles.donut}
                style={{ '--premium': `${premiumShare ?? 0}%` }}
                role="img"
                aria-label={premiumShare !== null ? `${premiumShare}% of members are Premium` : 'Membership data unavailable'}
              >
                <span>
                  <strong>{premiumShare !== null ? `${premiumShare}%` : '—'}</strong>
                  <small>Premium</small>
                </span>
              </div>
              <ul className={styles.legend}>
                <li>
                  <span className={`${styles.dot} ${styles.dotPremium}`} /> Premium <strong>{formatNumber(stats.premium)}</strong>
                </li>
                <li>
                  <span className={`${styles.dot} ${styles.dotBasic}`} /> Basic <strong>{formatNumber(stats.basic)}</strong>
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
            {!loading && recentUsers.length === 0 && <p className={pageStyles.empty}>No members to show.</p>}
            <ul className={styles.members}>
              {recentUsers.map((member) => {
                const name = [member.first_name, member.last_name].filter(Boolean).join(' ') || member.username || 'Member';
                return (
                  <li key={member.id ?? member.email} className={styles.member}>
                    <Avatar src={member.profile_photo} name={name} size={38} />
                    <span className={styles.memberText}>
                      <strong>{name}</strong>
                      <small>{member.joined_date ? new Date(member.joined_date).toLocaleDateString() : member.email}</small>
                    </span>
                    {String(member.membership_level || '').toLowerCase().includes('premium') && (
                      <span className={`${pageStyles.pill} ${pageStyles.pillGold}`}>
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

      {/* ---------- Quick upload ---------- */}
      <section className={`${styles.quick} ${pageStyles.fadeIn}`} aria-labelledby="quick-heading">
        <h2 id="quick-heading" className={styles.quickTitle}>
          Quick upload
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
