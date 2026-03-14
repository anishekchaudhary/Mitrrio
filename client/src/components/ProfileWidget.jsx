import React, { useState } from 'react';
import { User, Shield, LogOut, Zap, Trophy, Gamepad2, Settings } from 'lucide-react';

const ProfileWidget = ({ user, onLogout, onNavigate }) => {
  const [showSettings, setShowSettings] = useState(false);

  if (!user) return <div className="text-white p-6">Loading Profile...</div>;

  // --- 1. EXPONENTIAL LEVEL CALCULATION ---
  const totalXp = user.xp || 0;
  const currentLevel = Math.floor(Math.sqrt(totalXp / 100)) + 1;
  
  const xpForCurrentLevel = 100 * Math.pow(currentLevel - 1, 2);
  const xpForNextLevel = 100 * Math.pow(currentLevel, 2);
  
  const xpProgress = totalXp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = Math.min(100, Math.max(0, (xpProgress / xpNeeded) * 100));

  // --- 2. RANK CALCULATION ---
  const getRankTitle = (elo) => {
    if (elo < 1200) return "Rookie";
    if (elo < 1400) return "Scout";
    if (elo < 1600) return "Guardian";
    if (elo < 1800) return "Elite";
    if (elo < 2000) return "Master";
    return "Legend";
  };

  // --- 3. TRUNCATE USERNAME (Max 20 chars) ---
  const displayName = user.username || user.name || "Guest";
  const truncatedName = displayName.length > 20 
    ? displayName.substring(0, 20) + "..." 
    : displayName;

  return (
    <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-700 pointer-events-auto h-full flex flex-col justify-center shadow-xl font-sans relative">
      
      {/* SETTINGS GEAR (Top Right) */}
      {user.isLoggedIn && (
        <div className="absolute top-4 right-4 z-20">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="text-slate-500 hover:text-white transition-colors p-1"
          >
            <Settings size={18} />
          </button>

          {/* DROPDOWN MENU */}
          {showSettings && (
            <div className="absolute right-0 mt-2 w-32 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <button 
                onClick={onLogout}
                className="w-full text-left px-4 py-3 text-xs font-bold text-red-400 hover:bg-slate-700 flex items-center gap-2"
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex gap-4 mb-6 pr-8"> {/* Added padding-right to avoid overlap with gear */}
        <div className="relative">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center shrink-0 border-2 border-slate-700 shadow-inner">
            <User size={32} className="text-slate-400" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-lg border-2 border-slate-900 shadow-md">
            {currentLevel}
          </div>
        </div>
        
        <div className="flex-1 flex flex-col justify-center overflow-hidden">
          {/* DISPLAY TRUNCATED NAME */}
          <h2 className="text-xl font-bold text-white truncate leading-tight" title={displayName}>
            {truncatedName}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="text-yellow-400 text-[10px] font-black bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20 flex items-center gap-1 uppercase tracking-wider">
               <Shield size={10} /> {getRankTitle(user.elo || 1000)}
            </div>
          </div>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">MMR</span>
           <span className="text-xl font-black text-white flex items-center gap-1">
             <Trophy size={14} className="text-yellow-500"/> {user.elo || 1000}
           </span>
        </div>
        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Games</span>
           <span className="text-xl font-black text-white flex items-center gap-1">
             <Gamepad2 size={16} className="text-emerald-500"/> {user.gamesPlayed || 0}
           </span>
        </div>
      </div>

      {/* XP BAR SECTION */}
      <div className="mb-6">
          <div className="flex justify-between text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">
            <span className="flex items-center gap-1 text-blue-400"><Zap size={10}/> Level {currentLevel}</span>
            <span className="text-slate-400">{Math.floor(xpProgress)} / {xpNeeded} XP</span>
          </div>
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 shadow-inner relative group">
            <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-[8px] font-black text-white drop-shadow-md">{progressPercent.toFixed(1)}%</span>
            </div>
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
      </div>

      {/* AUTH ACTIONS (Only show Sign In/Up if NOT logged in) */}
      {!user.isLoggedIn && (
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