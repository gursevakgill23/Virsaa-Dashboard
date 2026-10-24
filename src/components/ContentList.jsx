/**
 * ContentList — one section's items: search, filters, "load more", and each
 * row's Edit / Delete buttons. Delete asks for a second click to confirm.
 * The list data itself comes from useContentList (in UploadPage).
 */
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FaSyncAlt, FaSearch, FaCrown, FaPen, FaTrashAlt, FaEyeSlash, FaClock, FaCheck, FaTimes } from 'react-icons/fa';
import { api, getErrorMessage, safeUrl } from '../api/client';
import { getFieldOptions } from '../utils/contentForm';
import useChoices, { refreshChoices } from '../hooks/useChoices';
import pageStyles from '../styles/Page.module.css';
import styles from './ContentList.module.css';

/** Little status labels from the flags every section uses. */
const badgesFor = (item) => {
  const badges = [];
  if (item.is_published === false) badges.push({ label: 'Hidden', icon: FaEyeSlash, tone: 'muted' });
  if (item.is_active === false) badges.push({ label: 'Inactive', icon: FaEyeSlash, tone: 'muted' });
  if (item.is_approved === false) badges.push({ label: 'Waiting', icon: FaClock, tone: 'warn' });
  if (item.is_premium || item.access === 'premium') badges.push({ label: 'Premium', icon: FaCrown, tone: 'gold' });
  if (item.is_featured) badges.push({ label: 'Featured', tone: 'gold' });
  return badges;
};

const ContentList = ({ contentType, list, search, onSearch, filters, onFilter, selectedId, onEdit, onDeleted }) => {
  const { choices } = useChoices();
  const [confirmId, setConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const Icon = contentType.icon;

  const handleDelete = async (item) => {
    setDeletingId(item.id);
    try {
      await api.delete(`${contentType.endpoint}${item.id}/`);
      toast.success(`${contentType.singular} deleted.`);
      if (contentType.refreshChoices) refreshChoices();
      onDeleted(item.id);
    } catch (err) {
      toast.error(getErrorMessage(err, `Could not delete this ${contentType.singular.toLowerCase()}.`));
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  const activeFilters = Object.values(filters).filter((v) => v !== '' && v !== undefined).length;

  return (
    <section className={`${pageStyles.card} ${pageStyles.fadeIn}`} aria-labelledby="list-heading">
      <div className={pageStyles.cardHeader}>
        <div>
          <h2 id="list-heading" className={pageStyles.cardTitle}>
            {contentType.label}
          </h2>
          <p className={pageStyles.cardMeta}>
            {list.loading ? 'Loading…' : `${list.count.toLocaleString()} ${search || activeFilters ? 'found' : 'in total'}`}
          </p>
        </div>
        <button
          type="button"
          className={`${pageStyles.button} ${pageStyles.buttonGhost} ${pageStyles.buttonSmall}`}
          onClick={list.reload}
          disabled={list.loading}
          aria-label="Refresh list"
          title="Refresh"
        >
          <FaSyncAlt aria-hidden="true" />
        </button>
      </div>

      {/* ---------- Search and filters ---------- */}
      <div className={styles.search}>
        <FaSearch aria-hidden="true" />
        <input type="search" placeholder={`Search ${contentType.label.toLowerCase()}…`} value={search} onChange={(e) => onSearch(e.target.value)} aria-label={`Search ${contentType.label}`} maxLength={100} />
      </div>

      {contentType.filters?.length > 0 && (
        <div className={styles.filters}>
          {contentType.filters.map((f) =>
            f.type === 'number' ? (
              <input
                key={f.name}
                type="number"
                className={styles.filter}
                value={filters[f.name] ?? ''}
                placeholder={f.label}
                onChange={(e) => onFilter(f.name, e.target.value)}
                aria-label={f.label}
              />
            ) : (
              <select key={f.name} className={styles.filter} value={filters[f.name] ?? ''} onChange={(e) => onFilter(f.name, e.target.value)} aria-label={f.label}>
                <option value="">{f.label}: all</option>
                {getFieldOptions(f, {}, choices).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )
          )}
        </div>
      )}

      {list.error && (
        <div className={pageStyles.errorBox} role="alert">
          {list.error}
        </div>
      )}

      {/* ---------- Loading skeleton ---------- */}
      {list.loading && (
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

      {!list.loading && !list.error && list.items.length === 0 && (
        <div className={pageStyles.empty}>
          <p className={pageStyles.emptyTitle}>{search || activeFilters ? 'Nothing matches' : 'Nothing here yet'}</p>
          <p>{search || activeFilters ? 'Try a different search or filter.' : `Your first ${contentType.singular.toLowerCase()} will appear here.`}</p>
        </div>
      )}

      {/* ---------- Rows ---------- */}
      {!list.loading && list.items.length > 0 && (
        <ul className={styles.list}>
          {list.items.map((item) => {
            const row = contentType.row(item);
            const thumb = safeUrl(row.image);
            const confirming = confirmId === item.id;
            return (
              <li key={item.id} className={`${styles.row} ${selectedId === item.id ? styles.rowActive : ''}`}>
                <button type="button" className={styles.rowMain} onClick={() => onEdit(item.id)} aria-label={`Edit ${row.title || 'item'}`}>
                  {thumb ? (
                    <img src={thumb} alt="" className={styles.thumb} loading="lazy" referrerPolicy="no-referrer" />
                  ) : (
                    <span className={`${styles.thumb} ${styles.thumbIcon}`}>
                      <Icon aria-hidden="true" />
                    </span>
                  )}
                  <span className={styles.text}>
                    <strong>{row.title || 'Untitled'}</strong>
                    {row.subtitle && <small>{row.subtitle}</small>}
                    <span className={styles.badges}>
                      {badgesFor(item).map(({ label, icon: BadgeIcon, tone }) => (
                        <span key={label} className={`${styles.badge} ${styles[`badge_${tone}`]}`}>
                          {BadgeIcon && <BadgeIcon aria-hidden="true" />} {label}
                        </span>
                      ))}
                    </span>
                  </span>
                </button>

                <div className={styles.rowActions}>
                  {confirming ? (
                    <>
                      <span className={styles.confirmText}>Delete?</span>
                      <button type="button" className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => handleDelete(item)} disabled={deletingId === item.id} aria-label="Yes, delete">
                        <FaCheck />
                      </button>
                      <button type="button" className={styles.iconBtn} onClick={() => setConfirmId(null)} aria-label="Don’t delete">
                        <FaTimes />
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className={styles.iconBtn} onClick={() => onEdit(item.id)} aria-label={`Edit ${row.title}`} title="Edit">
                        <FaPen />
                      </button>
                      <button type="button" className={styles.iconBtn} onClick={() => setConfirmId(item.id)} aria-label={`Delete ${row.title}`} title="Delete">
                        <FaTrashAlt />
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!list.loading && list.hasMore && (
        <button type="button" className={`${pageStyles.button} ${pageStyles.buttonGhost} ${styles.more}`} onClick={list.loadMore} disabled={list.loadingMore}>
          {list.loadingMore ? 'Loading…' : `Load more (${(list.count - list.items.length).toLocaleString()} left)`}
        </button>
      )}
    </section>
  );
};

export default ContentList;
