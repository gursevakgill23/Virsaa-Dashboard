/**
 * Entry point — loads the design tokens and global styles, then mounts <App />.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/themes.css';
import './styles/global.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
