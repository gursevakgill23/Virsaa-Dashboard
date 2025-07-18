import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Cookies from 'js-cookie';
import Sidebar from './components/Sidebar/Sidebar';
import Navbar from './components/Navbar/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users/Users';
import Ebooks from './pages/Uploads/Ebooks';
import Audiobooks from './pages/Uploads/Audiobooks';
import Authors from './pages/Uploads/Authors';
import LearningMaterial from './pages/Uploads/LearningMaterial';
import Quizzes from './pages/Uploads/Quizzes';
import Games from './pages/Uploads/Games';
import Gurbani from './pages/Uploads/Gurbani';
import SikhHistory from './pages/Uploads/SikhHistory';

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <div>Error: {this.state.error.message}</div>;
    }
    return this.props.children;
  }
}

const PrivateRoute = ({ children }) => {
  const { isLoggedIn, userData } = useAuth();
  const isAuthenticated = Cookies.get('isAuthenticated') === 'true' && isLoggedIn && (userData?.is_staff || userData?.is_superuser);
  console.log('PrivateRoute check:', { isAuthenticated, isLoggedIn, userData });
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const App = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setIsSidebarOpen(!mobile);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <ThemeProvider>
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <Router>
        <ErrorBoundary>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="*"
                element={
                  <PrivateRoute>
                    <div style={{ display: 'flex' }}>
                      <Sidebar isSidebarOpen={isSidebarOpen} closeSidebar={closeSidebar} />
                      <div style={{ flex: 1, marginLeft: isSidebarOpen && !isMobile ? '250px' : '0', transition: 'margin-left 0.3s ease' }}>
                        <Navbar toggleSidebar={toggleSidebar} />
                        <Routes>
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/users/:filterType" element={<Users />} />
                          <Route path="/uploads/ebooks" element={<Ebooks />} />
                          <Route path="/uploads/audiobooks" element={<Audiobooks />} />
                          <Route path="/uploads/authors" element={<Authors />} />
                          <Route path="/uploads/learning-material" element={<LearningMaterial />} />
                          <Route path="/uploads/quizzes" element={<Quizzes />} />
                          <Route path="/uploads/games" element={<Games />} />
                          <Route path="/uploads/gurbani" element={<Gurbani />} />
                          <Route path="/uploads/sikh-history" element={<SikhHistory />} />
                          <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                      </div>
                    </div>
                  </PrivateRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </ErrorBoundary>
      </Router>
    </ThemeProvider>
  );
};

export default App;