import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar/Sidebar';
import Navbar from './components/Navbar/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AllUsers from './pages/Users/Users';
import BasicPlanUsers from './pages/Users/Users';
import PremiumUsers from './pages/Users/Users';
import Ebooks from './pages/Uploads/Ebooks';
import Audiobooks from './pages/Uploads/Audiobooks';
import Authors from './pages/Uploads/Authors';
import LearningMaterial from './pages/Uploads/LearningMaterial';
import Quizzes from './pages/Uploads/Quizzes';
import Games from './pages/Uploads/Games';
import Gurbani from './pages/Uploads/Gurbani';
import SikhHistory from './pages/Uploads/SikhHistory';

const PrivateRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  return isAuthenticated ? children : <Navigate to="/login" />;
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
      setIsSidebarOpen(!mobile); // Close sidebar on mobile, open on larger screens
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <ThemeProvider>
      <Router>
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
                      <Route path="/users/all" element={<AllUsers />} />
                      <Route path="/users/basic" element={<BasicPlanUsers />} />
                      <Route path="/users/premium" element={<PremiumUsers />} />
                      <Route path="/uploads/ebooks" element={<Ebooks />} />
                      <Route path="/uploads/audiobooks" element={<Audiobooks />} />
                      <Route path="/uploads/authors" element={<Authors />} />
                      <Route path="/uploads/learning-material" element={<LearningMaterial />} />
                      <Route path="/uploads/quizzes" element={<Quizzes />} />
                      <Route path="/uploads/games" element={<Games />} />
                      <Route path="/uploads/gurbani" element={<Gurbani />} />
                      <Route path="/uploads/sikh-history" element={<SikhHistory />} />
                      <Route path="*" element={<Navigate to="/dashboard" />} />
                    </Routes>
                  </div>
                </div>
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;