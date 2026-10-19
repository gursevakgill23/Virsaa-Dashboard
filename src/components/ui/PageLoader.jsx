/**
 * PageLoader — shown while a lazy-loaded page downloads.
 */
import React from 'react';
import styles from './PageLoader.module.css';

const PageLoader = () => (
  <div className={styles.wrap} role="status" aria-live="polite">
    <span className={styles.mark} aria-hidden="true">
      ੴ
    </span>
    <span className="sr-only">Loading…</span>
  </div>
);

export default PageLoader;
