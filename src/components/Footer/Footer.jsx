/**
 * Footer — closes every signed-in page, in the same language as the web app:
 *
 *   1. Heritage band   a deep maroon glass card with the ੴ archway (the same
 *                      doorway as the login page), the Virsaa wordmark, a short
 *                      mission line and the day-to-day shortcuts.
 *   2. Site map        every section of the dashboard, built from
 *                      config/navigation.js, so a new upload page shows up here
 *                      as soon as it is added to contentTypes.js.
 *   3. Bottom bar      who is signed in (and their role), the Fateh, the build
 *                      version (REACT_APP_VERSION, optional) and "Back to top".
 *
 * Only internal routes and the configured live-site URL are linked; the
 * external link opens with rel="noopener noreferrer".
 */
import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowUp, FaBookOpen, FaCalendarCheck, FaExternalLinkAlt, FaShieldAlt, FaUserShield, FaUsers,
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { NAV_SECTIONS } from '../../config/navigation';
import { ENV } from '../../config/env';
import styles from './Footer.module.css';

const VERSION = (process.env.REACT_APP_VERSION || '').trim();

/** The everyday jobs, one click away. */
const SHORTCUTS = [
  { to: '/uploads/ebooks', label: 'Add an ebook', icon: FaBookOpen },
  { to: '/uploads/events?is_approved=false', label: 'Review events', icon: FaCalendarCheck },
  { to: '/users/all', label: 'Members', icon: FaUsers },
];

const Footer = () => {
  const { user } = useAuth();
  const year = new Date().getFullYear();
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Admin';
  const role = user?.is_superuser ? 'Superuser' : 'Staff';
  const RoleIcon = user?.is_superuser ? FaShieldAlt : FaUserShield;
  const sections = NAV_SECTIONS.filter((section) => section.title !== 'Overview');

  const backToTop = () => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    document.getElementById('main-content')?.focus({ preventScroll: true });
  };

  return (
    <footer className={styles.footer} aria-labelledby="footer-title">
      {/* ---------- 1. Heritage band ---------- */}
      <div className={styles.band}>
        <span className={styles.bandGlow} aria-hidden="true" />
        <div className={styles.brand}>
          <div className={styles.arch} aria-hidden="true">
            <span>ੴ</span>
          </div>
          <div>
            <h2 id="footer-title" className={styles.wordmark}>
              Virsaa <span className={styles.gurmukhi}>ਵਿਰਸਾ</span>
            </h2>
            <p className={styles.mission}>
              Keeping Punjabi and Sikh heritage alive: every book, sakhi and lesson you upload here reaches
              members on the website.
            </p>
          </div>
        </div>

        <nav className={styles.shortcuts} aria-label="Shortcuts">
          {SHORTCUTS.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={styles.shortcut}>
              <Icon aria-hidden="true" /> {label}
            </Link>
          ))}
          <a href={ENV.WEB_APP_URL} target="_blank" rel="noopener noreferrer" className={`${styles.shortcut} ${styles.shortcutLive}`}>
            View live site <FaExternalLinkAlt aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </nav>
      </div>

      {/* ---------- 2. Site map ---------- */}
      <nav className={styles.map} aria-label="All dashboard pages">
        {sections.map((section) => (
          <div key={section.title} className={styles.column}>
            <h3 className={styles.columnTitle}>{section.title}</h3>
            <ul>
              {section.items.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className={styles.mapLink}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* ---------- 3. Bottom bar ---------- */}
      <div className={styles.bottom}>
        <p className={styles.copy}>
          © {year} Virsaa · Admin studio{VERSION && <span className={styles.version}>v{VERSION}</span>}
        </p>
        <p className={styles.fateh} lang="pa">
          ਵਾਹਿਗੁਰੂ ਜੀ ਕਾ ਖ਼ਾਲਸਾ, ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫ਼ਤਹਿ
        </p>
        <div className={styles.session}>
          <span className={styles.signedIn}>
            <RoleIcon aria-hidden="true" />
            <span>
              Signed in as <strong>{name}</strong> · {role}
            </span>
          </span>
          <button type="button" className={styles.top} onClick={backToTop}>
            <FaArrowUp aria-hidden="true" /> Back to top
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
