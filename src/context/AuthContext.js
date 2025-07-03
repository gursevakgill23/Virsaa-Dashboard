import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Cookies from 'js-cookie';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const token = Cookies.get('accessToken');
    const isAuth = Cookies.get('isAuthenticated') === 'true';
    console.log('AuthContext init - accessToken:', token, 'isAuthenticated:', isAuth);
    return isAuth && !!token;
  });
  const [accessToken, setAccessToken] = useState(() => {
    const token = Cookies.get('accessToken');
    return token || null;
  });
  const [userData, setUserData] = useState(() => {
    const savedUser = Cookies.get('userData');
    console.log('AuthContext init - userData:', savedUser);
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const navigate = useNavigate();
  const apiString = 'http://virsaa-prod.eba-7cc3yk92.us-east-1.elasticbeanstalk.com';

  useEffect(() => {
    console.log('AuthContext state updated:', { isLoggedIn, accessToken, userData });
  }, [isLoggedIn, accessToken, userData]);

  const login = async (loginData) => {
    try {
      const response = await fetch(`${apiString}/api/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();
      console.log('AuthContext login response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (!data.user.is_staff && !data.user.is_superuser) {
        throw new Error('Access denied. Only admin users can log in.');
      }

      setAccessToken(data.access);
      setUserData(data.user);
      setIsLoggedIn(true);
      Cookies.set('accessToken', data.access, { expires: 1, secure: true, sameSite: 'Strict' });
      Cookies.set('refreshToken', data.refresh, { expires: 7, secure: true, sameSite: 'Strict' });
      Cookies.set('userData', JSON.stringify(data.user), { expires: 7, secure: true, sameSite: 'Strict' });
      Cookies.set('isAuthenticated', 'true', { expires: 7, secure: true, sameSite: 'Strict' });
      console.log('AuthContext login successful:', { access: data.access, user: data.user });
      toast.success('Logged in successfully!', {
        position: 'top-center',
        autoClose: 2000,
      });
      console.log('AuthContext navigating to /dashboard');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('AuthContext login error:', error);
      toast.error(error.message || 'Login failed. Please check your credentials.', {
        position: 'top-center',
        autoClose: 3000,
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      const refreshToken = Cookies.get('refreshToken');
      if (refreshToken) {
        const response = await fetch(`${apiString}/api/auth/logout/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        console.log('AuthContext logout response:', response.status);
      }
      setIsLoggedIn(false);
      setAccessToken(null);
      setUserData(null);
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
      Cookies.remove('userData');
      Cookies.remove('isAuthenticated');
      console.log('AuthContext logout successful');
      toast.success('Logged out successfully!', {
        position: 'top-center',
        autoClose: 2000,
      });
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('AuthContext logout error:', error);
      toast.error('Logout failed. Please try again.', {
        position: 'top-center',
        autoClose: 3000,
      });
    }
  };

  const refreshToken = async () => {
    try {
      const refresh = Cookies.get('refreshToken');
      console.log('AuthContext refreshToken - refresh:', refresh);
      if (!refresh) throw new Error('No refresh token available');
      const response = await fetch(`${apiString}/api/auth/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh }),
      });

      const data = await response.json();
      console.log('AuthContext refreshToken response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Token refresh failed');
      }

      setAccessToken(data.access);
      Cookies.set('accessToken', data.access, { expires: 1, secure: true, sameSite: 'Strict' });
      console.log('AuthContext refreshToken successful:', data.access);
      return data.access;
    } catch (error) {
      console.error('AuthContext refreshToken error:', error);
      await logout();
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, accessToken, userData, login, logout, refreshToken, setAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};