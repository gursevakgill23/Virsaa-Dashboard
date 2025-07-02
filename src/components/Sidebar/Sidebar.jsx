import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaTachometerAlt, FaUsers, FaBook, FaHeadphones, FaUser, FaGraduationCap, FaQuestionCircle, FaGamepad, FaPray, FaHistory } from 'react-icons/fa';
import styles from './Sidebar.module.css';

const Sidebar = ({ isSidebarOpen, closeSidebar }) => {
  return (
    <>
      <div className={`${styles.sidebar} ${!isSidebarOpen ? styles.collapsed : ''}`}>
        <div className={styles.logo}>
          <h2>Virsaa Dashboard</h2>
        </div>
        <nav className={styles.nav}>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
          >
            <FaTachometerAlt className={styles.icon} />
            <span>Dashboard</span>
          </NavLink>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Users</h3>
            <NavLink
              to="/users/all"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              <FaUsers className={styles.icon} />
              <span>All Users</span>
            </NavLink>
            <NavLink
              to="/users/basic"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              <FaUsers className={styles.icon} />
              <span>Basic Plan Users</span>
            </NavLink>
            <NavLink
              to="/users/premium"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              <FaUsers className={styles.icon} />
              <span>Premium Users</span>
            </NavLink>
          </div>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Uploads</h3>
            <NavLink
              to="/uploads/ebooks"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              <FaBook className={styles.icon} />
              <span>Ebooks</span>
            </NavLink>
            <NavLink
              to="/uploads/audiobooks"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              <FaHeadphones className={styles.icon} />
              <span>Audiobooks</span>
            </NavLink>
            <NavLink
              to="/uploads/authors"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              <FaUser className={styles.icon} />
              <span>Authors</span>
            </NavLink>
            <NavLink
              to="/uploads/learning-material"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              <FaGraduationCap className={styles.icon} />
              <span>Learning Material</span>
            </NavLink>
            <NavLink
              to="/uploads/quizzes"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              <FaQuestionCircle className={styles.icon} />
              <span>Quizzes</span>
            </NavLink>
            <NavLink
              to="/uploads/games"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              <FaGamepad className={styles.icon} />
              <span>Games</span>
            </NavLink>
            <NavLink
              to="/uploads/gurbani"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              <FaPray className={styles.icon} />
              <span>Gurbani</span>
            </NavLink>
            <NavLink
              to="/uploads/sikh-history"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              <FaHistory className={styles.icon} />
              <span>Sikh History</span>
            </NavLink>
          </div>
        </nav>
      </div>
      {isSidebarOpen && <div className={styles.overlay} onClick={closeSidebar}></div>}
    </>
  );
};

export default Sidebar;