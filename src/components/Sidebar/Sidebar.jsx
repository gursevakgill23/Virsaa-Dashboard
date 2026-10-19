/**
 * Sidebar — glass navigation panel styled like the web app's side sheet.
 * Desktop (≥ 992px): always visible, docked on the left.
 * Mobile: slides in as a floating sheet with a blurred backdrop.
 */
import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { FaTimes, FaExternalLinkAlt } from 'react-icons/fa';
import { NAV_SECTIONS } from '../../config/navigation';
import { ENV } from '../../config/env';
import styles from './Sidebar.module.css';

const Sidebar = ({ isOpen, onClose }) => {
  // Close with the Escape key and lock page scroll while open on mobile.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const isMobile = window.matchMedia('(max-width: 991.98px)').matches;
    if (isMobile) document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop (mobile only via CSS) */}
      <div
        className={`${styles.backdrop} ${isOpen ? styles.backdropVisible : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`} aria-label="Main navigation">
        <div className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">
              ੴ
            </span>
            <div>
              <p className={styles.brandName}>Virsaa</p>
              <p className={styles.brandSub}>Admin studio</p>
            </div>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close menu">
            <FaTimes />
          </button>
        </div>

        <nav className={styles.nav}>
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className={styles.section}>
              <p className={styles.sectionTitle}>{section.title}</p>
              <ul className={styles.list}>
                {section.items.map(({ to, label, icon: Icon }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      onClick={() => window.matchMedia('(max-width: 991.98px)').matches && onClose()}
                      className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
                    >
                      <span className={styles.linkIcon}>
                        <Icon aria-hidden="true" />
                      </span>
                      <span className={styles.linkLabel}>{label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <a className={styles.siteCard} href={ENV.WEB_APP_URL} target="_blank" rel="noopener noreferrer">
          <span>
            <strong>View live site</strong>
            <small>See changes as members do</small>
          </span>
          <FaExternalLinkAlt aria-hidden="true" />
        </a>
      </aside>
    </>
  );
};

export default Sidebar;
