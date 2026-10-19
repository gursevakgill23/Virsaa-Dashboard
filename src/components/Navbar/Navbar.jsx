/**
 * Navbar — sticky glass top bar.
 *   - Menu button (mobile) opens the sidebar.
 *   - Quick search jumps to any dashboard page (press "/" to focus).
 *   - Theme toggle and an account menu with sign-out.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaMoon, FaSearch, FaSignOutAlt, FaSun, FaChevronRight, FaShieldAlt } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { NAV_ITEMS } from '../../config/navigation';
import Avatar from '../ui/Avatar';
import styles from './Navbar.module.css';

const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Admin';
  const role = user?.is_superuser ? 'Superuser' : 'Staff';

  /** Pages whose label or section matches the search text. */
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NAV_ITEMS.slice(0, 6);
    return NAV_ITEMS.filter((item) => `${item.label} ${item.section}`.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  const goTo = (item) => {
    navigate(item.to);
    setQuery('');
    setSearchOpen(false);
    inputRef.current?.blur();
  };

  const onSearchKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault();
      goTo(results[activeIndex]);
    } else if (event.key === 'Escape') {
      setSearchOpen(false);
      inputRef.current?.blur();
    }
  };

  // Close popovers when clicking outside them.
  useEffect(() => {
    const onClick = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) setSearchOpen(false);
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // "/" focuses the search box (unless already typing in a field).
  useEffect(() => {
    const onKey = (event) => {
      const tag = document.activeElement?.tagName;
      if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => setActiveIndex(0), [query]);

  return (
    <header className={styles.navbar}>
      <button type="button" className={`${styles.iconButton} ${styles.menuButton}`} onClick={onMenuClick} aria-label="Open menu">
        <FaBars />
      </button>

      {/* ---------- Quick search ---------- */}
      <div className={styles.search} ref={searchRef}>
        <FaSearch className={styles.searchIcon} aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          className={styles.searchInput}
          placeholder="Jump to a page…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={onSearchKeyDown}
          role="combobox"
          aria-label="Search dashboard pages"
          aria-autocomplete="list"
          aria-expanded={searchOpen}
          aria-controls="nav-search-results"
          autoComplete="off"
          maxLength={60}
        />
        <kbd className={styles.kbd} aria-hidden="true">
          /
        </kbd>

        {searchOpen && (
          <ul id="nav-search-results" className={styles.results} role="listbox">
            {results.length === 0 && <li className={styles.noResults}>No pages match “{query}”.</li>}
            {results.map((item, index) => {
              const Icon = item.icon;
              return (
                <li key={item.to} role="option" aria-selected={index === activeIndex}>
                  <button
                    type="button"
                    className={`${styles.result} ${index === activeIndex ? styles.resultActive : ''}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => goTo(item)}
                  >
                    <span className={styles.resultIcon}>
                      <Icon aria-hidden="true" />
                    </span>
                    <span className={styles.resultText}>
                      <strong>{item.label}</strong>
                      <small>{item.section}</small>
                    </span>
                    <FaChevronRight className={styles.resultArrow} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ---------- Right side ---------- */}
      <div className={styles.right}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          title={theme === 'light' ? 'Dark mode' : 'Light mode'}
        >
          {theme === 'light' ? <FaMoon /> : <FaSun />}
        </button>

        <div className={styles.account} ref={menuRef}>
          <button
            type="button"
            className={styles.profileButton}
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <Avatar src={user?.profile_photo} name={displayName} size={36} />
            <span className={styles.profileName}>{displayName}</span>
          </button>

          {menuOpen && (
            <div className={styles.menu} role="menu">
              <div className={styles.menuHeader}>
                <Avatar src={user?.profile_photo} name={displayName} size={48} />
                <div className={styles.menuWho}>
                  <strong>{displayName}</strong>
                  <small>{user?.email}</small>
                  <span className={styles.roleChip}>
                    <FaShieldAlt aria-hidden="true" /> {role}
                  </span>
                </div>
              </div>
              <button type="button" role="menuitem" className={styles.logout} onClick={() => logout()}>
                <FaSignOutAlt aria-hidden="true" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
