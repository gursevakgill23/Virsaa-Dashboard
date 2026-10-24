/**
 * App — providers and routes.
 *
 *   /login                  public sign-in page
 *   /dashboard              overview (protected)
 *   /users/:filterType      all | free | paid | admins (protected; view and edit accounts)
 *   /uploads/:type          any content type from config/contentTypes.js (protected)
 *
 * Pages are lazy-loaded so the login screen downloads as little code as
 * possible before the admin is authenticated.
 */
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/Layout/AdminLayout';
import PageLoader from './components/ui/PageLoader';

const Login = lazy(() => import('./pages/Login/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const Users = lazy(() => import('./pages/Users/Users'));
const UploadPage = lazy(() => import('./pages/Uploads/UploadPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

const App = () => (
  <ThemeProvider>
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/users" element={<Navigate to="/users/all" replace />} />
                <Route path="/users/:filterType" element={<Users />} />
                <Route path="/uploads/:type" element={<UploadPage />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>

    <ToastContainer
      position="top-center"
      autoClose={4000}
      newestOnTop
      closeOnClick
      pauseOnHover
      pauseOnFocusLoss
      draggable
      limit={4}
      theme="dark"
    />
  </ThemeProvider>
);

export default App;
