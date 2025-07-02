import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import pageStyles from '../Page.module.css';
import styles from './Users.module.css';

const Users = () => {
  const { isLoggedIn, accessToken, userData, logout, setAccessToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const apiString = 'http://virsaa-prod.eba-7cc3yk92.us-east-1.elasticbeanstalk.com';
  const userImage = 'https://picsum.photos/40/40'; // CDN-hosted placeholder from Lorem Picsum
  const hasFetched = useRef(false); // Track fetch to prevent loop within same route

  // Function to handle image paths for production
  const useProductionImagePath = () => {
    return (imagePath) => {
      if (process.env.NODE_ENV === 'production') {
        if (typeof imagePath === 'string') {
          return imagePath.startsWith('/')
            ? imagePath
            : `/${imagePath.replace(/.*static\/media/, 'static/media')}`;
        } else {
          return imagePath.default || imagePath;
        }
      }
      return imagePath;
    };
  };
  const getImagePath = useProductionImagePath();

  // Token refresh function (memoized to prevent ESLint warning)
  const refreshAccessToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      const response = await fetch(`${apiString}/api/auth/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });
      const data = await response.json();
      if (response.ok) {
        setAccessToken(data.access);
        localStorage.setItem('accessToken', data.access);
        return data.access;
      } else {
        throw new Error(data.error || 'Token refresh failed');
      }
    } catch (err) {
      await logout();
      toast.error('Session expired. Please log in again.', {
        position: 'top-center',
        autoClose: 3000,
        theme: userData?.theme_preference === 'dark' ? 'dark' : 'light',
      });
      navigate('/login');
      return null;
    }
  }, [userData, logout, navigate, setAccessToken, apiString]);

  // Fetch users (memoized to prevent redefinition)
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    let filterType;
    if (location.pathname === '/users/all') {
      filterType = 'all';
    } else if (location.pathname === '/users/basic') {
      filterType = 'basic';
    } else if (location.pathname === '/users/premium') {
      filterType = 'premium';
    } else {
      filterType = 'all';
    }

    try {
      const response = await fetch(`${apiString}/api/auth/users/${filterType}/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();

      if (response.status === 401) {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          const retryResponse = await fetch(`${apiString}/api/auth/users/${filterType}/`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${newAccessToken}`,
              'Content-Type': 'application/json',
            },
          });
          const retryData = await retryResponse.json();
          if (retryResponse.ok) {
            setUsers(retryData);
            setLoading(false);
          } else {
            throw new Error(retryData.error || 'Retry failed after token refresh');
          }
        }
      } else if (response.status === 403) {
        toast.error('Access denied. Admin privileges required.', {
          position: 'top-center',
          autoClose: 3000,
          theme: userData?.theme_preference === 'dark' ? 'dark' : 'light',
        });
        navigate('/');
      } else if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users');
      } else {
        setUsers(data);
        setLoading(false);
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
      toast.error('Failed to load users. Please try again.', {
        position: 'top-center',
        autoClose: 3000,
        theme: userData?.theme_preference === 'dark' ? 'dark' : 'light',
      });
    }
  }, [accessToken, location.pathname, refreshAccessToken, userData, navigate]);

  // Handle auth check and fetch
  useEffect(() => {
    if (!isLoggedIn || !userData?.is_staff) {
      toast.error('Access denied. Admin privileges required.', {
        position: 'top-center',
        autoClose: 3000,
        theme: userData?.theme_preference === 'dark' ? 'dark' : 'light',
      });
      navigate('/login');
      return;
    }

    let isMounted = true;
    // Reset hasFetched when route changes to allow new fetch
    hasFetched.current = false;
    if (isMounted) {
      fetchUsers();
    }

    return () => {
      isMounted = false; // Prevent state updates on unmount
    };
  }, [isLoggedIn, userData, navigate, fetchUsers, accessToken, location.pathname]);

  return (
    <div className={`${pageStyles.page} ${styles.usersPage} ${userData?.theme_preference === 'dark' ? styles.dark : ''}`}>
      <h1 className={styles.usersTitle}>
        {location.pathname === '/users/all' ? 'All Users' : location.pathname === '/users/basic' ? 'Free Plan Users' : 'Membership Users'}
      </h1>

      {loading && (
        <div className={styles.usersLoading}>
          <div className={styles.usersSpinner}></div>
        </div>
      )}

      {error && (
        <div className={styles.usersError}>
          Error: {error}
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <div className={styles.usersEmpty}>
          No users found.
        </div>
      )}

      {!loading && !error && users.length > 0 && (
        <div className={styles.usersTableWrapper}>
          <table className={styles.usersTable}>
            <thead>
              <tr>
                <th>Avatar</th>
                <th>Name</th>
                <th>Email</th>
                <th>Membership</th>
                <th className={styles.hideOnMobile}>About</th>
                <th>Joined</th>
                <th className={styles.hideOnMobile}>Preferred Content</th>
                <th>Badges</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={styles.tableRow}>
                  <td>
                    <img
                      src={user.profile_photo ? getImagePath(user.profile_photo) : getImagePath(userImage)}
                      alt={`${user.username}'s profile`}
                      className={styles.userAvatar}
                    />
                  </td>
                  <td>
                    {user.first_name && user.last_name
                      ? `${user.first_name} ${user.last_name}`
                      : user.username}
                  </td>
                  <td>{user.email}</td>
                  <td>{user.membership_level}</td>
                  <td className={styles.hideOnMobile}>
                    {user.about_me ? `${user.about_me.substring(0, 50)}${user.about_me.length > 50 ? '...' : ''}` : '-'}
                  </td>
                  <td>{new Date(user.joined_date).toLocaleDateString()}</td>
                  <td className={styles.hideOnMobile}>
                    {user.preferred_content && user.preferred_content.length > 0
                      ? user.preferred_content.join(', ')
                      : '-'}
                  </td>
                  <td>
                    <div className={styles.userBadges}>
                      {user.is_superuser && (
                        <span className={`${styles.userBadge} ${styles.userBadgeSuperuser}`}>Superuser</span>
                      )}
                      {user.is_staff && !user.is_superuser && (
                        <span className={`${styles.userBadge} ${styles.userBadgeStaff}`}>Staff</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Users;