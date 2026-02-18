import React from 'react';
import { Play, Eye } from 'lucide-react';

const GamePanel = ({ username, color, onPlay, onSpectate }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full pointer-events-auto p-4">
      
      <h1 className="text-9xl font-black text-white tracking-tighter mb-8 drop-shadow-[0_0_35px_rgba(255,255,255,0.15)] italic select-none text-center">
        Mitrrio
      </h1>

      <div className="bg-slate-900/80 backdrop-blur-xl border-2 border-slate-700 p-8 rounded-3xl shadow-2xl w-full max-w-lg relative z-20 transform transition-transform duration-500">
        
        <div className="flex items-center gap-6 mb-8">
          {/* Color Display (Read Only) */}
          <div className="relative shrink-0 flex flex-col items-center gap-2">
            <div 
              className="w-16 h-16 rounded-full border-[4px] border-slate-600 shadow-inner transition-all overflow-hidden"
              style={{ backgroundColor: color }}
            />
            <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] select-none">
              Color
            </label>
          </div>

          {/* Name Display (Read Only) */}
          <div className="flex-1 self-end mb-3">
            <div className="bg-slate-950 border-2 border-slate-700 rounded-2xl p-3 flex flex-col relative transition-all">
              <label className="text-xs font-bold text-slate-500 uppercase mb-0.5 tracking-wider px-1">
                Identity
              </label>
              <div className="text-3xl font-bold text-white px-1 truncate">
                {username}
              </div>
            </div>
          </div>
        </div>

        {/* Main Buttons */}
        <div className="space-y-4">
          <button 
            onClick={onPlay}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white text-2xl font-black py-4 rounded-2xl shadow-lg shadow-blue-600/20 transform active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-wide group"
          >
            <Play fill="currentColor" size={28} className="group-hover:scale-110 transition-transform" /> Play
          </button>

          <button 
            onClick={onSpectate}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-2xl font-black py-4 rounded-2xl border-2 border-slate-600 transform active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-wide group"
          >
            <Eye size={28} className="group-hover:scale-110 transition-transform" /> Spectate
          </button>
        </div>
      </div>
    </div>
  );
};

export default GamePanel;