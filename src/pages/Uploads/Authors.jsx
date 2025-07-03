import React, { useState, useEffect } from 'react';
import { FaFileUpload, FaCode } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import styles from '../Page.module.css';

const API_STRING = "http://virsaa-prod.eba-7cc3yk92.us-east-1.elasticbeanstalk.com";

const AuthorUpload = () => {
  const { accessToken, setAccessToken } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('form-data');
  const [formData, setFormData] = useState({
    name: '',
    image: null,
    rating: 0.0,
    born: '',
    died: '',
    genre: '',
    notable_works: '',
    biography: '',
    awards: ''
  });
  const [jsonData, setJsonData] = useState('');
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = Cookies.get('isAuthenticated') === 'true';

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setErrors({ auth: 'You must be logged in to access this page.' });
      toast.error('You must be logged in to access this page.', {
        position: 'top-right',
        autoClose: 5000,
      });
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, accessToken, navigate]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
    setErrors(prevErrors => ({ ...prevErrors, [name]: '' }));
  };

  // Validate form data
  const validateForm = () => {
    const newErrors = {};
    if (!isAuthenticated) newErrors.auth = 'You must be logged in to upload authors.';
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (formData.rating < 0 || formData.rating > 5)
      newErrors.rating = 'Rating must be between 0 and 5';
    return newErrors;
  };

  // Validate JSON data
  const validateJson = () => {
    const newErrors = {};
    try {
      const parsed = JSON.parse(jsonData);
      if (!isAuthenticated) newErrors.json = 'You must be logged in to upload authors.';
      if (!parsed.name) newErrors.json = 'Name is required';
      if (parsed.rating < 0 || parsed.rating > 5)
        newErrors.json = 'Rating must be between 0 and 5';
      return newErrors;
    } catch (error) {
      newErrors.json = 'Invalid JSON format';
      return newErrors;
    }
  };

  // Handle form submission
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      Object.values(validationErrors).forEach(error => {
        toast.error(error, {
          position: 'top-right',
          autoClose: 5000,
        });
      });
      return;
    }

    const data = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key] !== null && formData[key] !== '') {
        data.append(key, formData[key]);
      }
    });

    try {
      setIsLoading(true);
      let response = await axios.post(
        `${API_STRING}/collections/authors/admin_create/`,
        data,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.status === 401) {
        const refreshToken = Cookies.get('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        const refreshResponse = await axios.post(
          `${API_STRING}/api/auth/token/refresh/`,
          { refresh: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );
        const newAccessToken = refreshResponse.data.access;
        Cookies.set('accessToken', newAccessToken, { expires: 1, secure: true, sameSite: 'Strict' });
        setAccessToken(newAccessToken);

        response = await axios.post(
          `${API_STRING}/collections/authors/admin_create/`,
          data,
          {
            headers: {
              Authorization: `Bearer ${newAccessToken}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );
      }

      setSuccessMessage('Author uploaded successfully!');
      toast.success('Author uploaded successfully!', {
        position: 'top-right',
        autoClose: 5000,
      });
      setFormData({
        name: '',
        image: null,
        rating: 0.0,
        born: '',
        died: '',
        genre: '',
        notable_works: '',
        biography: '',
        awards: ''
      });
      document.getElementById('image').value = '';
    } catch (error) {
      console.error('Error uploading author:', error.response?.data);
      if (error.response?.status === 401) {
        setErrors({ error: 'Unauthorized. Please log in again.' });
        toast.error('Unauthorized. Please log in again.', {
          position: 'top-right',
          autoClose: 5000,
        });
        navigate('/login', { replace: true });
      } else {
        const errorMessage = error.response?.data?.error || 'Failed to upload author. Please try again.';
        setErrors({ error: errorMessage });
        toast.error(errorMessage, {
          position: 'top-right',
          autoClose: 5000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle JSON submission
  const handleJsonSubmit = async () => {
    setErrors({});
    setSuccessMessage('');
    const validationErrors = validateJson();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      Object.values(validationErrors).forEach(error => {
        toast.error(error, {
          position: 'top-right',
          autoClose: 5000,
        });
      });
      return;
    }

    try {
      setIsLoading(true);
      let response = await axios.post(
        `${API_STRING}/collections/authors/admin_create/`,
        JSON.parse(jsonData),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 401) {
        const refreshToken = Cookies.get('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        const refreshResponse = await axios.post(
          `${API_STRING}/api/auth/token/refresh/`,
          { refresh: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );
        const newAccessToken = refreshResponse.data.access;
        Cookies.set('accessToken', newAccessToken, { expires: 1, secure: true, sameSite: 'Strict' });
        setAccessToken(newAccessToken);

        response = await axios.post(
          `${API_STRING}/collections/authors/admin_create/`,
          JSON.parse(jsonData),
          {
            headers: {
              Authorization: `Bearer ${newAccessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }

      setSuccessMessage('Author uploaded successfully via JSON!');
      toast.success('Author uploaded successfully via JSON!', {
        position: 'top-right',
        autoClose: 5000,
      });
      setJsonData('');
    } catch (error) {
      console.error('Error uploading JSON:', error.response?.data);
      if (error.response?.status === 401) {
        setErrors({ error: 'Unauthorized. Please log in again.' });
        toast.error('Unauthorized. Please log in again.', {
          position: 'top-right',
          autoClose: 5000,
        });
        navigate('/login', { replace: true });
      } else {
        const errorMessage = error.response?.data?.error || 'Failed to upload JSON. Please check the format and try again.';
        setErrors({ json: errorMessage });
        toast.error(errorMessage, {
          position: 'top-right',
          autoClose: 5000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <h1>Upload Author</h1>
      {errors.auth && (
        <span className={styles.error}>{errors.auth}</span>
      )}
      <div className={styles.tabSection}>
        <div className={styles.tabContainer}>
          <div className={styles.tabButtons}>
            <button
              className={`${styles.tabButton} ${activeTab === 'form-data' ? styles.active : ''}`}
              onClick={() => setActiveTab('form-data')}
              disabled={!isAuthenticated}
            >
              <FaFileUpload /> Form Data
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'json-data' ? styles.active : ''}`}
              onClick={() => setActiveTab('json-data')}
              disabled={!isAuthenticated}
            >
              <FaCode /> JSON Data
            </button>
          </div>
          <select
            className={styles.tabDropdown}
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            disabled={!isAuthenticated}
          >
            <option value="form-data">Form Data</option>
            <option value="json-data">JSON Data</option>
          </select>
          <div className={styles.tabContent}>
            {activeTab === 'form-data' && (
              <form onSubmit={handleFormSubmit} className={styles.uploadForm}>
                <div className={styles.formGroup}>
                  <label>Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={styles.input}
                    required
                    disabled={!isAuthenticated}
                  />
                  {errors.name && <span className={styles.error}>{errors.name}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label>Image (PNG/JPG)</label>
                  <input
                    type="file"
                    name="image"
                    id="image"
                    onChange={handleInputChange}
                    className={styles.input}
                    accept="image/png,image/jpeg"
                    disabled={!isAuthenticated}
                  />
                  {errors.image && <span className={styles.error}>{errors.image}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label>Rating (0-5) *</label>
                  <input
                    type="number"
                    name="rating"
                    value={formData.rating}
                    onChange={handleInputChange}
                    className={styles.input}
                    min="0"
                    max="5"
                    step="0.1"
                    required
                    disabled={!isAuthenticated}
                  />
                  {errors.rating && <span className={styles.error}>{errors.rating}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label>Born</label>
                  <input
                    type="date"
                    name="born"
                    value={formData.born}
                    onChange={handleInputChange}
                    className={styles.input}
                    disabled={!isAuthenticated}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Died</label>
                  <input
                    type="date"
                    name="died"
                    value={formData.died}
                    onChange={handleInputChange}
                    className={styles.input}
                    disabled={!isAuthenticated}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Genre</label>
                  <input
                    type="text"
                    name="genre"
                    value={formData.genre}
                    onChange={handleInputChange}
                    className={styles.input}
                    disabled={!isAuthenticated}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Notable Works</label>
                  <textarea
                    name="notable_works"
                    value={formData.notable_works}
                    onChange={handleInputChange}
                    className={styles.input}
                    rows="4"
                    disabled={!isAuthenticated}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Biography</label>
                  <textarea
                    name="biography"
                    value={formData.biography}
                    onChange={handleInputChange}
                    className={styles.input}
                    rows="4"
                    disabled={!isAuthenticated}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Awards</label>
                  <textarea
                    name="awards"
                    value={formData.awards}
                    onChange={handleInputChange}
                    className={styles.input}
                    rows="4"
                    disabled={!isAuthenticated}
                  />
                </div>
                {errors.error && <span className={styles.error}>{errors.error}</span>}
                {successMessage && <span className={styles.success}>{successMessage}</span>}
                <button type="submit" className={styles.submitButton} disabled={isLoading || !isAuthenticated}>
                  {isLoading ? 'Uploading...' : 'Upload Author'}
                </button>
              </form>
            )}
            {activeTab === 'json-data' && (
              <div className={styles.jsonSection}>
                <textarea
                  value={jsonData}
                  onChange={(e) => setJsonData(e.target.value)}
                  className={styles.jsonInput}
                  rows="10"
                  placeholder='{"name": "Author Name", "rating": 4.5, "genre": "History", "notable_works": "Book1, Book2", "biography": "Bio text", "awards": "Award1"}'
                  disabled={!isAuthenticated}
                />
                {errors.json && <span className={styles.error}>{errors.json}</span>}
                {successMessage && <span className={styles.success}>{successMessage}</span>}
                <button
                  onClick={handleJsonSubmit}
                  className={styles.submitButton}
                  disabled={isLoading || !isAuthenticated}
                >
                  {isLoading ? 'Uploading...' : 'Upload JSON'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthorUpload;