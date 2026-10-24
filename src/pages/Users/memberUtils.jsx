/**
 * Small helpers shared by the Members list and the account editor.
 */
import React from 'react';
import { FaShieldAlt, FaUserShield } from 'react-icons/fa';
import pageStyles from '../../styles/Page.module.css';
import styles from './Users.module.css';

export const fullName = (u) => [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || '—';
export const isPaid = (u) => Boolean(u.membership_level) && !/^free$/i.test(u.membership_level);
export const RoleBadge = ({ user }) => {
  if (user.is_superuser) {
    return (
      <span className={`${pageStyles.pill} ${pageStyles.pillGold}`}>
        <FaShieldAlt aria-hidden="true" /> Superuser
      </span>
    );
  }
  if (user.is_staff) {
    return (
      <span className={pageStyles.pill}>
        <FaUserShield aria-hidden="true" /> Staff
      </span>
    );
  }
  return <span className={styles.muted}>Member</span>;
};
