import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, ArrowRight } from 'lucide-react';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState('idle'); 
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    setStatus('loading');
    setError('');

    try {
      const res = await fetch(`http://localhost:5000/api/auth/reset-password/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        // Teleport back to dashboard/home after success
        setTimeout(() => navigate('/'), 3000);
      } else {
        setStatus('error');
        setError(data.message || "Failed to reset password");
      }
    } catch (err) {
      setStatus('error');
      setError("Server connection failed. Try again later.");
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white selection:bg-blue-500/30">
        <div className="bg-slate-900 border border-slate-700 p-12 rounded-[2.5rem] shadow-2xl max-w-lg w-full text-center animate-fade-in">
          <CheckCircle size={80} className="text-emerald-500 mx-auto mb-6" />
          <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-2">Password Updated!</h1>
          <p className="text-slate-400">Your credentials are secured. Redirecting to Arena...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans selection:bg-blue-500/30">
      <div className="bg-slate-900 border border-slate-700 p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full">
        <h2 className="text-4xl font-black mb-1 text-center uppercase tracking-tighter italic">New Password</h2>
        <p className="text-slate-400 text-center mb-8 text-xs font-bold uppercase tracking-widest">Secure your account</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-xs font-bold p-4 rounded-2xl mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Taller Fields (py-4) to match AuthModal */}
          <div className="bg-slate-950 border border-slate-700 rounded-2xl flex items-center px-5 py-4 focus-within:border-blue-500 transition-all relative">
            <Lock size={20} className="text-slate-500 mr-3" />
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="New Password"
              className="bg-transparent text-white w-full outline-none text-base font-medium"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-500 hover:text-white"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="bg-slate-950 border border-slate-700 rounded-2xl flex items-center px-5 py-4 focus-within:border-blue-500 transition-all">
            <Lock size={20} className="text-slate-500 mr-3" />
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Confirm New Password"
              className="bg-transparent text-white w-full outline-none text-base font-medium"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {/* Taller Button (py-4) */}
          <button 
            type="submit" 
            disabled={status === 'loading'}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 uppercase text-lg tracking-wider"
          >
            {status === 'loading' ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>Update Password <ArrowRight size={20} /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;