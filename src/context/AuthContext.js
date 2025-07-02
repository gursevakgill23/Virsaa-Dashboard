import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const token = localStorage.getItem('accessToken');
    console.log('AuthContext init - accessToken:', token);
    return !!token;
  });
  const [accessToken, setAccessToken] = useState(() => {
    const token = localStorage.getItem('accessToken');
    console.log('AuthContext init - accessToken:', token);
    return token || null;
  });
  const [userData, setUserData] = useState(() => {
    const savedUser = localStorage.getItem('userData');
    console.log('AuthContext init - userData:', savedUser);
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const navigate = useNavigate();
  const apiString = 'http://virsaa-prod.eba-7cc3yk92.us-east-1.elasticbeanstalk.com';

  // Log state changes
  useEffect(() => {
    console.log('AuthContext state updated:', { isLoggedIn, accessToken, userData });
  }, [isLoggedIn, accessToken, userData]);

  // Login function
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

      setAccessToken(data.access);
      setUserData(data.user);
      setIsLoggedIn(true);
      localStorage.setItem('accessToken', data.access);
      localStorage.setItem('refreshToken', data.refresh);
      localStorage.setItem('userData', JSON.stringify(data.user));
      console.log('AuthContext login successful:', { access: data.access, user: data.user });
      toast.success('Logged in successfully!', {
        position: 'top-center',
        autoClose: 2000,
      });
      navigate('/dashboard'); // Changed to match Login.jsx
    } catch (error) {
      console.error('AuthContext login error:', error);
      toast.error('Login failed. Please check your credentials.', {
        position: 'top-center',
        autoClose: 3000,
      });
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
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
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userData');
      console.log('AuthContext logout successful');
      toast.success('Logged out successfully!', {
        position: 'top-center',
        autoClose: 2000,
      });
      navigate('/login');
    } catch (error) {
      console.error('AuthContext logout error:', error);
      toast.error('Logout failed. Please try again.', {
        position: 'top-center',
        autoClose: 3000,
      });
    }
  };

  // Refresh token function
  const refreshToken = async () => {
    try {
      const refresh = localStorage.getItem('refreshToken');
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
      localStorage.setItem('accessToken', data.access);
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