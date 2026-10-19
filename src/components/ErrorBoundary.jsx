/**
 * ErrorBoundary — catches render crashes so one broken page never blanks
 * the whole dashboard. Shows a friendly card instead of the raw error
 * (stack traces can leak implementation details in production).
 */
import React from 'react';
import styles from './ErrorBoundary.module.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Only log details during development.
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('Dashboard crashed:', error, info);
    }
  }

  handleReload = () => window.location.reload();

  handleHome = () => {
    this.setState({ hasError: false });
    window.location.assign('/dashboard');
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className={styles.wrap} role="alert">
        <div className={styles.card}>
          <h1 className={styles.title}>Something went wrong</h1>
          <p className={styles.text}>This page hit an unexpected error. Your data is safe — try reloading.</p>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={this.handleReload}>
              Reload page
            </button>
            <button type="button" className={styles.secondary} onClick={this.handleHome}>
              Go to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
