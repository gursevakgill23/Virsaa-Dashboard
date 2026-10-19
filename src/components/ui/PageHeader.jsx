/**
 * PageHeader — consistent title block used at the top of every page.
 */
import React from 'react';
import styles from '../../styles/Page.module.css';

const PageHeader = ({ eyebrow, icon: Icon, title, subtitle, actions }) => (
  <header className={`${styles.header} ${styles.fadeIn}`}>
    <div>
      {eyebrow && (
        <p className={styles.eyebrow}>
          {Icon && <Icon aria-hidden="true" />} {eyebrow}
        </p>
      )}
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
    {actions && <div className={styles.headerActions}>{actions}</div>}
  </header>
);

export default PageHeader;
