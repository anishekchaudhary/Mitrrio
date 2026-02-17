import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import GamePage from './pages/GamePage';
import VerifyEmail from './pages/VerifyEmail';
import ResetPassword from './pages/ResetPassword';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main Dashboard & Game Routes */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/game/:roomId" element={<GamePage />} />

        {/* Authentication Flow Routes */}
        {/* Users arrive here from the verification email */}
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        
        {/* Users arrive here from the password reset email */}
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        
        {/* Optional: Add a 404 Catch-all */}
        <Route path="*" element={<div className="bg-slate-950 h-screen flex items-center justify-center text-white">404 - Arena Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;