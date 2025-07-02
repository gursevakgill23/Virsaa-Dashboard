import React, { useState, useEffect } from 'react';
import { FaFileUpload, FaCode } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import styles from '../Page.module.css';

const API_STRING = "http://virsaa-prod.eba-7cc3yk92.us-east-1.elasticbeanstalk.com";

const EbookUpload = () => {
  const [activeTab, setActiveTab] = useState('form-data');
  const [authors, setAuthors] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    rating: 0.0,
    cover_image: null,
    pdf_file: null,
    pages: '',
    description: ''
  });
  const [jsonData, setJsonData] = useState('');
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is authenticated
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const accessToken = localStorage.getItem('access_token');

  // Fetch authors for dropdown
  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setErrors({ auth: 'You must be logged in to access this page.' });
      toast.error('You must be logged in to access this page.', {
        position: 'top-right',
        autoClose: 5000,
      });
      return;
    }

    const fetchAuthors = async () => {
      try {
        const response = await axios.get(`${API_STRING}/collections/authors/`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        // Ensure response.data is an array
        if (Array.isArray(response.data)) {
          setAuthors(response.data);
        } else {
          throw new Error('Invalid authors data format');
        }
      } catch (error) {
        console.error('Error fetching authors:', error.response?.data || error.message);
        setErrors({ error: 'Failed to load authors. Please try again.' });
        toast.error('Failed to load authors. Please try again.', {
          position: 'top-right',
          autoClose: 5000,
        });
      }
    };
    fetchAuthors();
  }, [isAuthenticated, accessToken, setAuthors]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
    // Clear field-specific error
    setErrors(prevErrors => ({ ...prevErrors, [name]: '' }));
  };

  // Validate form data
  const validateForm = () => {
    const newErrors = {};
    if (!isAuthenticated) newErrors.auth = 'You must be logged in to upload ebooks.';
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.author) newErrors.author = 'Author is required';
    if (!formData.pages || isNaN(formData.pages) || Number(formData.pages) <= 0)
      newErrors.pages = 'Pages must be a positive number';
    if (formData.rating < 0 || formData.rating > 5)
      newErrors.rating = 'Rating must be between 0 and 5';
    if (!formData.cover_image) newErrors.cover_image = 'Cover image is required';
    if (!formData.pdf_file) newErrors.pdf_file = 'PDF file is required';
    return newErrors;
  };

  // Validate JSON data
  const validateJson = () => {
    try {
      const parsed = JSON.parse(jsonData);
      if (!isAuthenticated) return { json: 'You must be logged in to upload ebooks.' };
      if (!parsed.title) return { json: 'Title is required' };
      if (!parsed.author) return { json: 'Author ID is required' };
      if (!parsed.pages || isNaN(Number(parsed.pages)) || Number(parsed.pages) <= 0)
        return { json: 'Pages must be a positive number' };
      if (parsed.rating < 0 || parsed.rating > 5)
        return { json: 'Rating must be between 0 and 5' };
      return {};
    } catch (error) {
      return { json: 'Invalid JSON format' };
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
      await axios.post(
        `${API_STRING}/collections/ebooks/admin_create/`,
        data,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      setSuccessMessage('Ebook uploaded successfully!');
      toast.success('Ebook uploaded successfully!', {
        position: 'top-right',
        autoClose: 5000,
      });
      setFormData({
        title: '',
        author: '',
        rating: 0.0,
        cover_image: null,
        pdf_file: null,
        pages: '',
        description: ''
      });
      // Reset file inputs
      try {
        document.getElementById('cover_image').value = '';
        document.getElementById('pdf_file').value = '';
      } catch (err) {
        console.warn('Failed to reset file inputs:', err);
      }
    } catch (error) {
      console.error('Error uploading ebook:', error.response?.data);
      if (error.response?.status === 401) {
        setErrors({ error: 'Unauthorized. Please log in again.' });
        toast.error('Unauthorized. Please log in again.', {
          position: 'top-right',
          autoClose: 5000,
        });
      } else {
        const errorMessage = error.response?.data?.error || 'Failed to upload ebook. Please try again.';
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
      await axios.post(
        `${API_STRING}/collections/ebooks/admin_create/`,
        JSON.parse(jsonData),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setSuccessMessage('Ebook uploaded successfully via JSON!');
      toast.success('Ebook uploaded successfully via JSON!', {
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
      <h1>Upload Ebook</h1>
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
                  <label>Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className={styles.input}
                    required
                    disabled={!isAuthenticated}
                  />
                  {errors.title && <span className={styles.error}>{errors.title}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label>Author</label>
                  <select
                    name="author"
                    value={formData.author}
                    onChange={handleInputChange}
                    className={styles.input}
                    disabled={!isAuthenticated}
                  >
                    <option value="">Select Author</option>
                    {authors.map(author => (
                      <option key={author.id} value={author.id}>{author.name}</option>
                    ))}
                  </select>
                  {errors.author && <span className={styles.error}>{errors.author}</span>}
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
                  <label>Cover Image (PNG/JPG)</label>
                  <input
                    type="file"
                    name="cover_image"
                    id="cover_image"
                    onChange={handleInputChange}
                    className={styles.input}
                    accept="image/png,image/jpeg"
                    disabled={!isAuthenticated}
                  />
                  {errors.cover_image && <span className={styles.error}>{errors.cover_image}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label>PDF File</label>
                  <input
                    type="file"
                    name="pdf_file"
                    id="pdf_file"
                    onChange={handleInputChange}
                    className={styles.input}
                    accept="application/pdf"
                    disabled={!isAuthenticated}
                  />
                  {errors.pdf_file && <span className={styles.error}>{errors.pdf_file}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label>Pages *</label>
                  <input
                    type="number"
                    name="pages"
                    value={formData.pages}
                    onChange={handleInputChange}
                    className={styles.input}
                    min="1"
                    required
                    disabled={!isAuthenticated}
                  />
                  {errors.pages && <span className={styles.error}>{errors.pages}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className={styles.input}
                    rows="4"
                    disabled={!isAuthenticated}
                  />
                </div>
                {errors.error && <span className={styles.error}>{errors.error}</span>}
                {successMessage && <span className={styles.success}>{successMessage}</span>}
                <button type="submit" className={styles.submitButton} disabled={isLoading || !isAuthenticated}>
                  {isLoading ? 'Uploading...' : 'Upload Ebook'}
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
                  placeholder='{"title": "Book Title", "author": 1, "rating": 4.5, "pages": 200, "description": "Book description"}'
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

export default EbookUpload;