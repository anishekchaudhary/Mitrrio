import React from 'react';
import { User, Shield, LogOut, Zap } from 'lucide-react';

const ProfileWidget = ({ user, onLogout, onNavigate }) => {
  if (!user) return <div className="text-white">Loading Profile...</div>;

  // Calculate Level based on Elo (e.g., 1000 Elo -> Lvl 10)
  const level = Math.floor((user.elo || 1000) / 100);
  
  // Calculate Rank Tier Name
  const getRankTitle = (elo) => {
    if (elo < 1200) return "Rookie";
    if (elo < 1500) return "Soldier";
    if (elo < 1800) return "Veteran";
    if (elo < 2100) return "Master";
    return "Legend";
  };

  return (
    <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-700 pointer-events-auto h-full flex flex-col justify-center shadow-xl">
      <div className="flex gap-4 mb-6">
        {/* Avatar Area */}
        <div className="relative">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center shrink-0 border-2 border-slate-700 shadow-inner">
            <User size={32} className="text-slate-400" />
          </div>
          {/* Level Badge */}
          <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-lg border-2 border-slate-900 shadow-md">
            {level}
          </div>
        </div>
        
        {/* Info Area */}
        <div className="flex-1 flex flex-col justify-center overflow-hidden">
          <h2 className="text-xl font-bold text-white truncate leading-tight">
            {user.username || user.name || "Guest"} 
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="text-yellow-400 text-[10px] font-black bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20 flex items-center gap-1 uppercase tracking-wider">
               <Shield size={10} /> {getRankTitle(user.elo || 1000)}
            </div>
            <div className="text-slate-400 text-[10px] font-bold">
              {user.elo || 1000} MMR
            </div>
          </div>
        </div>
      </div>

      {/* XP Bar */}
      <div className="mb-6">
          <div className="flex justify-between text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">
            <span className="flex items-center gap-1"><Zap size={10} className="text-blue-400"/> Progress</span>
            <span className="text-white">{user.xp || 0}%</span>
          </div>
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
              style={{ width: `${user.xp || 0}%` }}
            ></div>
          </div>
      </div>

      {/* Auth Actions */}
      {user.isLoggedIn ? (
          <button onClick={onLogout} className="w-full bg-red-500/5 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/30 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm uppercase tracking-wide group">
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform"/> Logout
          </button>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => onNavigate('login')} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl border border-slate-600 transition-all text-sm uppercase tracking-wide">
            Sign In
          </button>
          <button onClick={() => onNavigate('signup')} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-900/20 transition-all text-sm uppercase tracking-wide">
            Sign Up
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileWidget;