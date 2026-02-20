import React, { useState } from 'react';
import { Play, Eye } from 'lucide-react';

const GamePanel = ({ nickname, setNickname, color, setColor, onPlay, onSpectate }) => {
  const [showPresets, setShowPresets] = useState(false);

  // 10 Default High-Contrast Game Colors
  const defaultColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#f97316', '#a855f7', '#ffffff'
  ];

  return (
    <div className="flex flex-col items-center justify-center w-full pointer-events-auto p-4">
      
      <h1 className="text-9xl font-black text-white tracking-tighter mb-8 drop-shadow-[0_0_35px_rgba(255,255,255,0.15)] italic select-none text-center">
        Mitrrio
      </h1>

      <div className="bg-slate-900/80 backdrop-blur-xl border-2 border-slate-700 p-8 rounded-3xl shadow-2xl w-full max-w-lg relative z-20 transform hover:scale-[1.005] transition-transform duration-500">
        
        <div className="flex items-center gap-6 mb-8">
          {/* Color Selector with Presets Only */}
          <div className="relative shrink-0 flex flex-col items-center gap-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] select-none">
              Skin Color
            </label>
            
            <div className="relative">
              <button 
                onClick={() => setShowPresets(!showPresets)}
                className="w-16 h-16 rounded-full border-[4px] border-slate-600 shadow-inner transition-all hover:border-white hover:scale-105 active:scale-95 overflow-hidden"
                style={{ backgroundColor: color }}
              />

              {/* Color Presets Popup */}
              {showPresets && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setShowPresets(false)}
                  ></div>
                  <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 bg-slate-950 border-2 border-slate-700 p-4 rounded-2xl shadow-2xl z-40 w-44 animate-fade-in-up">
                    <div className="grid grid-cols-5 gap-3">
                      {defaultColors.map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            setColor(c);
                            setShowPresets(false);
                          }}
                          className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-125 hover:shadow-[0_0_10px_rgba(255,255,255,0.2)] ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Name Input */}
          <div className="flex-1 self-end mb-1">
            <div className="bg-slate-950 border-2 border-slate-700 rounded-2xl p-3 flex flex-col relative focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
              <label className="text-xs font-bold text-slate-500 uppercase mb-0.5 tracking-wider px-1">Nickname</label>
              <input 
                type="text" 
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="bg-transparent text-2xl font-bold text-white outline-none placeholder-slate-700 px-1 w-full"
                placeholder="Enter Name"
              />
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