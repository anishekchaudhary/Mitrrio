import React from 'react';
import { User, Shield, LogOut } from 'lucide-react';

const ProfileWidget = ({ user, onLogout, onNavigate }) => {
  if (!user) return <div className="text-white">Loading Profile...</div>;

  return (
    <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-700 pointer-events-auto h-full flex flex-col justify-center">
      <div className="flex gap-4 mb-4">
        <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center shrink-0">
          <User size={32} className="text-slate-400" />
        </div>
        
        <div className="flex-1 flex flex-col justify-center">
          <h2 className="text-xl font-bold text-white truncate">
            {user.username || user.name || "Guest"} 
          </h2>
          <div className="text-yellow-400 text-xs font-bold bg-yellow-400/10 px-2 py-1 rounded w-fit mt-1 flex items-center gap-1">
              <Shield size={12} /> Lvl {Math.floor((user.elo || 1000) / 100)}
          </div>
        </div>
      </div>

      <div className="mb-6">
          <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
            <span>XP</span>
            <span>{user.xp}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: `${user.xp}%` }}></div>
          </div>
      </div>

      {user.isLoggedIn ? (
          <button onClick={onLogout} className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/50 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm uppercase tracking-wide">
            <LogOut size={16} /> Logout
          </button>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => onNavigate('login')} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl border border-slate-600 transition-all text-sm uppercase">
            Sign In
          </button>
          <button onClick={() => onNavigate('signup')} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all text-sm uppercase">
            Sign Up
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileWidget;