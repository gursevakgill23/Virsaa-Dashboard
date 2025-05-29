import React, { useState, useContext } from 'react';
import { FaSearch, FaUserCircle, FaSignOutAlt, FaSun, FaMoon, FaBars } from 'react-icons/fa';
import { ThemeContext } from '../../context/ThemeContext';
import styles from './Navbar.module.css';

const Navbar = ({ toggleSidebar }) => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    window.location.href = '/login';
  };

  return (
    <div className={styles.navbar}>
      <button onClick={toggleSidebar} className={styles.hamburger}>
        <FaBars />
      </button>
      <div className={styles.searchBar}>
        <FaSearch className={styles.searchIcon} />
        <input type="text" placeholder="Search..." className={styles.searchInput} />
      </div>
      <div className={styles.rightSection}>
        <button onClick={toggleTheme} className={styles.themeToggle}>
          {theme === 'light' ? <FaMoon /> : <FaSun />}
        </button>
        <div className={styles.profile}>
          <button onClick={() => setIsProfileOpen(!isProfileOpen)} className={styles.profileButton}>
            <FaUserCircle className={styles.profileIcon} />
            <span>Admin</span>
          </button>
          {isProfileOpen && (
            <div className={styles.profileDropdown}>
              <button onClick={handleLogout} className={styles.dropdownItem}>
                <FaSignOutAlt className={styles.dropdownIcon} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;