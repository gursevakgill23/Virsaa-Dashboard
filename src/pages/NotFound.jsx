/**
 * NotFound — shown for unknown routes inside the dashboard.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import pageStyles from '../styles/Page.module.css';

const NotFound = () => (
  <div className={`${pageStyles.card} ${pageStyles.fadeIn}`} style={{ maxWidth: 520, margin: '8vh auto', textAlign: 'center' }}>
    <p className={pageStyles.eyebrow} style={{ justifyContent: 'center' }}>
      404
    </p>
    <h1 className={pageStyles.title}>Page not found</h1>
    <p className={pageStyles.subtitle} style={{ margin: '10px auto 22px' }}>
      That page doesn’t exist in the admin studio.
    </p>
    <Link to="/dashboard" className={`${pageStyles.button} ${pageStyles.buttonGradient}`}>
      Back to dashboard
    </Link>
  </div>
);

export default NotFound;
