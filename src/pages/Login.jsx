import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import styles from './Login.module.css';

const API_STRING = "http://virsaa-prod.eba-7cc3yk92.us-east-1.elasticbeanstalk.com";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_STRING}/api/auth/login/`, {
        login: email,
        password: password,
      });

      console.log('Login response:', response.data);

      const { access, refresh, user } = response.data;

      // Check if user is admin
      if (!user.is_staff && !user.is_superuser) {
        setError('Access denied. Only admin users can log in.');
        toast.error('Access denied. Only admin users can log in.', {
          position: 'top-right',
          autoClose: 5000,
        });
        setIsLoading(false);
        return;
      }

      // Store tokens and authentication status with consistent keys
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      localStorage.setItem('userData', JSON.stringify(user));

      toast.success('Login successful!', {
        position: 'top-right',
        autoClose: 5000,
      });
      setIsLoading(false);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error.response?.data);
      let errorMessage = 'Invalid credentials. Please try again.';
      if (error.response?.data?.login?.[0] === 'Invalid credentials') {
        errorMessage = 'Invalid credentials. Please try again.';
        toast.error(errorMessage, {
          position: 'top-right',
          autoClose: 5000,
        });
      } else if (error.response?.status === 404 || error.response?.data?.detail === 'No User matches the given query.') {
        errorMessage = 'Email not found.';
        toast.error(errorMessage, {
          position: 'top-right',
          autoClose: 5000,
        });
      } else {
        errorMessage = error.response?.data?.error || 'An error occurred. Please try again.';
        toast.error(errorMessage, {
          position: 'top-right',
          autoClose: 5000,
        });
      }
      setError(errorMessage);
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