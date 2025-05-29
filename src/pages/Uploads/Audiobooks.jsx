import React, { useState, useEffect } from 'react';
import { FaFileUpload, FaCode } from 'react-icons/fa';
import axios from 'axios';
import styles from '../Page.module.css';

const AudiobookUpload = () => {
  const [activeTab, setActiveTab] = useState('form-data');
  const [authors, setAuthors] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    rating: 0.0,
    cover: null,
    mp3_file: null,
    duration: '',
    format: 'MP3',
    genre: '',
    description: ''
  });
  const [jsonData, setJsonData] = useState('');
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch authors for dropdown
  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        const response = await axios.get('http://localhost:8000/collections/authors/');
        setAuthors(response.data);
      } catch (error) {
        console.error('Error fetching authors:', error);
        setErrors({ error: 'Failed to load authors. Please try again.' });
      }
    };
    fetchAuthors();
  }, []);

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
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.duration.trim()) newErrors.duration = 'Duration is required';
    if (formData.rating < 0 || formData.rating > 5)
      newErrors.rating = 'Rating must be between 0 and 5';
    if (formData.duration && !/^\d+:\d{2}:\d{2}$/.test(formData.duration))
      newErrors.duration = 'Duration must be in HH:MM:SS format';
    return newErrors;
  };

  // Validate JSON data
  const validateJson = () => {
    try {
      const parsed = JSON.parse(jsonData);
      if (!parsed.title) return { json: 'Title is required' };
      if (!parsed.duration) return { json: 'Duration is required' };
      if (parsed.rating < 0 || parsed.rating > 5)
        return { json: 'Rating must be between 0 and 5' };
      if (parsed.duration && !/^\d+:\d{2}:\d{2}$/.test(parsed.duration))
        return { json: 'Duration must be in HH:MM:SS format' };
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
        'http://localhost:8000/collections/audiobooks/admin_create/',
        data,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      setSuccessMessage('Audiobook uploaded successfully!');
      setFormData({
        title: '',
        author: '',
        rating: 0.0,
        cover: null,
        mp3_file: null,
        duration: '',
        format: 'MP3',
        genre: '',
        description: ''
      });
      // Reset file inputs
      try {
        document.getElementById('cover').value = '';
        document.getElementById('mp3_file').value = '';
      } catch (err) {
        console.warn('Failed to reset file inputs:', err);
      }
    } catch (error) {
      console.error('Error uploading audiobook:', error.response?.data);
      setErrors(error.response?.data || { error: 'Failed to upload audiobook. Please try again.' });
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
        'http://localhost:8000/collections/audiobooks/admin_create/',
        JSON.parse(jsonData),
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setSuccessMessage('Audiobook uploaded successfully via JSON!');
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
      <h1>Upload Audiobook</h1>
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
                  <label>Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className={styles.input}
                    required
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
                  />
                  {errors.rating && <span className={styles.error}>{errors.rating}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label>Cover Image (PNG/JPG)</label>
                  <input
                    type="file"
                    name="cover"
                    id="cover"
                    onChange={handleInputChange}
                    className={styles.input}
                    accept="image/png,image/jpeg"
                  />
                  {errors.cover && <span className={styles.error}>{errors.cover}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label>MP3 File</label>
                  <input
                    type="file"
                    name="mp3_file"
                    id="mp3_file"
                    onChange={handleInputChange}
                    className={styles.input}
                    accept="audio/mpeg"
                  />
                  {errors.mp3_file && <span className={styles.error}>{errors.mp3_file}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label>Duration (HH:MM:SS) *</label>
                  <input
                    type="text"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="e.g., 2:30:15"
                    required
                  />
                  {errors.duration && <span className={styles.error}>{errors.duration}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label>Format</label>
                  <input
                    type="text"
                    name="format"
                    value={formData.format}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="e.g., MP3"
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
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className={styles.input}
                    rows="4"
                  />
                </div>
                {errors.error && <span className={styles.error}>{errors.error}</span>}
                {successMessage && <span className={styles.success}>{successMessage}</span>}
                <button type="submit" className={styles.submitButton} disabled={isLoading}>
                  {isLoading ? 'Uploading...' : 'Upload Audiobook'}
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
                  placeholder='{"title": "Audiobook Title", "author": 1, "rating": 4.5, "duration": "2:30:15", "format": "MP3", "genre": "Fiction", "description": "Audiobook description"}'
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

export default AudiobookUpload;