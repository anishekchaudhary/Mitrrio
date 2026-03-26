import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import GamePage from './pages/GamePage';
import VerifyEmail from './pages/VerifyEmail';
import ResetPassword from './pages/ResetPassword';
import AdminDashboard from './pages/AdminDashboard'; // <-- NEW

function App() {
  // Simple guard to check if user is admin based on localStorage
  const ProtectedAdminRoute = ({ children }) => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return <Navigate to="/" />;
    try {
      const user = JSON.parse(userStr);
      if (user && user.isAdmin) return children;
    } catch (e) { return <Navigate to="/" />; }
    return <Navigate to="/" />;
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/game/:id" element={<GamePage />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        
        {/* NEW ADMIN ROUTE */}
        <Route 
          path="/admin" 
          element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;