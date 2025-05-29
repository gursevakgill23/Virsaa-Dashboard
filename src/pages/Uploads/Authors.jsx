import React, { useState } from 'react';
import { FaFileUpload, FaCode } from 'react-icons/fa';
import axios from 'axios';
import styles from '../Page.module.css';

const AuthorUpload = () => {
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
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (formData.rating < 0 || formData.rating > 5)
      newErrors.rating = 'Rating must be between 0 and 5';
    return newErrors;
  };

  // Validate JSON data
  const validateJson = () => {
    try {
      const parsed = JSON.parse(jsonData);
      if (!parsed.name) return { json: 'Name is required' };
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
        'http://localhost:8000/collections/authors/admin_create/',
        data,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      setSuccessMessage('Author uploaded successfully!');
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
      // Reset file input
      try {
        document.getElementById('image').value = '';
      } catch (err) {
        console.warn('Failed to reset file input:', err);
      }
    } catch (error) {
      console.error('Error uploading author:', error.response?.data);
      setErrors(error.response?.data || { error: 'Failed to upload author. Please try again.' });
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
      return;
    }

    try {
      setIsLoading(true);
      await axios.post(
        'http://localhost:8000/collections/authors/admin_create/',
        JSON.parse(jsonData),
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setSuccessMessage('Author uploaded successfully via JSON!');
      setJsonData('');
    } catch (error) {
      console.error('Error uploading JSON:', error.response?.data);
      setErrors(error.response?.data || { json: 'Failed to upload JSON. Please check the format and try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <h1>Upload Author</h1>
      <div className={styles.tabSection}>
        <div className={styles.tabContainer}>
          <div className={styles.tabButtons}>
            <button
              className={`${styles.tabButton} ${activeTab === 'form-data' ? styles.active : ''}`}
              onClick={() => setActiveTab('form-data')}
            >
              <FaFileUpload /> Form Data
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'json-data' ? styles.active : ''}`}
              onClick={() => setActiveTab('json-data')}
            >
              <FaCode /> JSON Data
            </button>
          </div>
          <select
            className={styles.tabDropdown}
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
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
                  />
                </div>
                {errors.error && <span className={styles.error}>{errors.error}</span>}
                {successMessage && <span className={styles.success}>{successMessage}</span>}
                <button type="submit" className={styles.submitButton} disabled={isLoading}>
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
                />
                {errors.json && <span className={styles.error}>{errors.json}</span>}
                {successMessage && <span className={styles.success}>{successMessage}</span>}
                <button
                  onClick={handleJsonSubmit}
                  className={styles.submitButton}
                  disabled={isLoading}
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