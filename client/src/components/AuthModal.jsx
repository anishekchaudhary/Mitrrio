import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, ArrowRight, ChevronLeft, Loader2 } from 'lucide-react';

const AuthModal = ({ isOpen, onClose, onLogin, guestData = {}, initialMode = 'signin' }) => {
  const [view, setView] = useState(initialMode === 'login' ? 'signin' : initialMode);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    setView(initialMode === 'login' ? 'signin' : initialMode);
    setMessage({ text: '', type: '' });
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    let endpoint = view === 'signup' ? '/register' : '/login';
    if (view === 'forgot') endpoint = '/forgot-password';

    // FIX: Ensure guestData is safe
    const safeGuestData = guestData || {}; 

    const payload = view === 'signup' 
      ? { 
          ...formData, 
          guestData: safeGuestData,
          elo: safeGuestData.elo,
          xp: safeGuestData.xp,
          gamesPlayed: safeGuestData.gamesPlayed
        } 
      : { email: formData.email, password: formData.password };

    try {
      const res = await fetch(`http://localhost:5000/api/auth${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      // --- FIX STARTS HERE ---
      if (view === 'forgot') {
        setMessage({ text: 'Link sent! Check your email.', type: 'success' });
      } 
      else if (view === 'signup') {
        // SUCCESSFUL REGISTRATION:
        // Do NOT call onLogin() because we need email verification first.
        // Just show the success message from the backend.
        setMessage({ 
            text: data.message || 'Signup successful! Please verify your email.', 
            type: 'success' 
        });
        
        // Optional: clear form or switch to login view after a delay
        // setTimeout(() => setView('signin'), 3000); 
      } 
      else {
        // LOGIN SUCCESS:
        // Only call onLogin if we actually have user data
        if (data.user && typeof onLogin === 'function') {
           onLogin(data.user, data.token);
           onClose();
        }
      }
      // --- FIX ENDS HERE ---

    } catch (err) {
      console.error("[Auth] Request Failed:", err);
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-slate-900 border border-slate-700 w-full max-w-md p-8 rounded-2xl shadow-2xl animate-fade-in-up">
        
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={24} /></button>
        <h2 className="text-3xl font-black text-white text-center mb-1 uppercase italic tracking-tighter">
          {view === 'signup' ? "Sign Up" : view === 'forgot' ? "Recover" : "Sign In"}
        </h2>
        <p className="text-slate-400 text-center text-xs mb-6 uppercase tracking-wider">Join the arena</p>

        {message.text && (
            <div className={`p-3 rounded-xl mb-4 text-center text-xs font-bold border ${message.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-emerald-500/10 border-emerald-500 text-emerald-400'}`}>
                {message.text}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {view === 'signup' && (
            <div className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 flex items-center">
              <User size={18} className="text-slate-500 mr-3" />
              <input 
                type="text" 
                placeholder="Username" 
                maxLength={20} // <--- ADD THIS
                className="bg-transparent text-white w-full outline-none font-medium" 
                value={formData.username} 
                onChange={(e) => setFormData(prev => ({...prev, username: e.target.value}))} 
                required 
              />
            </div>
          )}
          <div className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 flex items-center">
            <Mail size={18} className="text-slate-500 mr-3" />
            <input 
                type="email" 
                placeholder="Email" 
                className="bg-transparent text-white w-full outline-none font-medium" 
                value={formData.email} 
                onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))} 
                required 
            />
          </div>
          {view !== 'forgot' && (
            <div className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 flex items-center">
              <Lock size={18} className="text-slate-500 mr-3" />
              <input 
                type="password" 
                placeholder="Password" 
                className="bg-transparent text-white w-full outline-none font-medium" 
                value={formData.password} 
                onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))} 
                required 
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl shadow-lg mt-2 uppercase italic tracking-wider flex justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" /> : (view === 'signup' ? "Create Account" : view === 'forgot' ? "Send Link" : "Sign In")}
          </button>
        </form>

        <div className="mt-4 text-center">
          {view === 'signin' && <button onClick={() => setView('forgot')} className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest block w-full mb-2">Forgot Password?</button>}
          {view !== 'forgot' && <button onClick={() => setView(view === 'signup' ? 'signin' : 'signup')} className="text-xs text-blue-400 font-bold hover:underline">{view === 'signup' ? "Have an account? Sign In" : "New? Sign Up"}</button>}
          {view === 'forgot' && <button onClick={() => setView('signin')} className="flex items-center gap-1 text-slate-500 hover:text-white mx-auto font-bold text-xs uppercase"><ChevronLeft size={14} /> Back</button>}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;