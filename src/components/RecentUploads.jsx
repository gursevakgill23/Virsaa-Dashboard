/**
 * RecentUploads — lists the latest items of a content type, with search.
 * Reads the type's `list` endpoint and its `display` mapping
 * (title / subtitle / image field names) from config.
 */
import React, { useMemo, useState } from 'react';
import { FaSyncAlt, FaSearch, FaCrown } from 'react-icons/fa';
import { safeUrl } from '../api/client';
import pageStyles from '../styles/Page.module.css';
import styles from './RecentUploads.module.css';

/** Turns any API value into short display text. */
const asText = (value) => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'object') return value.name || value.title || '';
  return String(value);
};

const RecentUploads = ({ contentType, items, loading, error, onReload }) => {
  const [query, setQuery] = useState('');
  const { title, subtitle, image } = contentType.display;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? items.filter((item) => asText(item[title]).toLowerCase().includes(q)) : items;
    return list.slice(0, 50);
  }, [items, query, title]);

  return (
    <section className={`${pageStyles.card} ${pageStyles.fadeIn}`} aria-labelledby="recent-heading">
      <div className={pageStyles.cardHeader}>
        <div>
          <h2 id="recent-heading" className={pageStyles.cardTitle}>
            In the library
          </h2>
          <p className={pageStyles.cardMeta}>{loading ? 'Loading…' : `${items.length.toLocaleString()} total`}</p>
        </div>
        <button
          type="button"
          className={`${pageStyles.button} ${pageStyles.buttonGhost} ${pageStyles.buttonSmall}`}
          onClick={onReload}
          disabled={loading}
          aria-label="Refresh list"
        >
          <FaSyncAlt aria-hidden="true" />
        </button>
      </div>

      <div className={styles.search}>
        <FaSearch aria-hidden="true" />
        <input
          type="search"
          placeholder={`Search ${contentType.label.toLowerCase()}…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={`Search ${contentType.label}`}
          maxLength={100}
        />
      </div>

      {error && (
        <div className={pageStyles.errorBox} role="alert">
          {error}
        </div>
      )}

      {loading && (
        <ul className={styles.list} aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className={styles.row}>
              <span className={`${pageStyles.skeleton} ${styles.thumb}`} />
              <span className={styles.text}>
                <span className={pageStyles.skeleton} style={{ height: 12, width: '70%' }} />
                <span className={pageStyles.skeleton} style={{ height: 10, width: '40%', marginTop: 8 }} />
              </span>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className={pageStyles.empty}>
          <p className={pageStyles.emptyTitle}>{query ? 'No matches' : 'Nothing here yet'}</p>
          <p>{query ? 'Try a different search.' : `Your first ${contentType.singular.toLowerCase()} will appear here.`}</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <ul className={styles.list}>
          {filtered.map((item, index) => {
            const thumb = image ? safeUrl(item[image]) : '';
            const Icon = contentType.icon;
            return (
              <li key={item.id ?? index} className={styles.row}>
                {thumb ? (
                  <img src={thumb} alt="" className={styles.thumb} loading="lazy" referrerPolicy="no-referrer" />
                ) : (
                  <span className={`${styles.thumb} ${styles.thumbIcon}`}>
                    <Icon aria-hidden="true" />
                  </span>
                )}
                <span className={styles.text}>
                  <strong>{asText(item[title]) || 'Untitled'}</strong>
                  {subtitle && asText(item[subtitle]) && <small>{asText(item[subtitle])}</small>}
                </span>
                {item.is_premium && (
                  <span className={`${pageStyles.pill} ${pageStyles.pillGold}`}>
                    <FaCrown aria-hidden="true" /> Premium
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default RecentUploads;
