import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import Cookies from 'js-cookie';
import styles from './Login.module.css';

const API_STRING = "http://virsaa-prod.eba-7cc3yk92.us-east-1.elasticbeanstalk.com";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Clear any stale cookies on component mount
    if (!Cookies.get('isAuthenticated')) {
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
      Cookies.remove('userData');
      Cookies.remove('isAuthenticated');
    }
  }, []);

  const handleLogin = async (e) => {
  e.preventDefault();
  setError('');
  setIsLoading(true);

  try {
    const payload = {
      login: email.trim(),
      password: password,
      captcha: 'bypass-for-admin', // Bypass for admin
      remember_me: false
    };

    console.log('Sending login payload:', payload);

    const response = await axios.post(
      `${API_STRING}/api/auth/login/`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        validateStatus: (status) => status < 500, // Don't throw for 400 errors
      }
    );

    console.log('Login response:', response);

    if (response.status === 400) {
      const errorMsg = response.data?.login?.[0] || 
                      response.data?.error || 
                      'Invalid credentials';
      throw new Error(errorMsg);
    }

    if (!response.data) {
      throw new Error('No response data received');
    }

    const { access, refresh, user } = response.data;

    if (!user?.is_staff && !user?.is_superuser) {
      throw new Error('Access denied. Admin privileges required.');
    }

    // Store tokens and user data
    Cookies.set('accessToken', access, { 
      expires: 1, 
      secure: true, 
      sameSite: 'Strict' 
    });
    Cookies.set('refreshToken', refresh, { 
      expires: 7, 
      secure: true, 
      sameSite: 'Strict' 
    });
    Cookies.set('userData', JSON.stringify(user), { 
      expires: 7, 
      secure: true, 
      sameSite: 'Strict' 
    });
    Cookies.set('isAuthenticated', 'true', { 
      expires: 7, 
      secure: true, 
      sameSite: 'Strict' 
    });

    toast.success('Login successful!');
    navigate('/dashboard', { replace: true });

  } catch (error) {
    console.error('Login error:', error);
    const errorMsg = error.response?.data?.login?.[0] || 
                    error.response?.data?.error || 
                    error.message || 
                    'Login failed';
    
    setError(errorMsg);
    toast.error(errorMsg);
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>Admin Login</h1>
        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@virsaa.com"
              disabled={isLoading}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter password"
              disabled={isLoading}
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.loginButton} disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;