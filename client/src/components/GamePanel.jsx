import React from 'react';
import { Play, Eye, CheckCircle, Swords } from 'lucide-react';

const GamePanel = ({ username, color, onPlay, onSpectate, inParty, isReady, isSpectator, isGameRunning }) => {
  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-8 rounded-3xl shadow-2xl w-full max-w-sm flex flex-col items-center pointer-events-auto transition-all duration-300">
      
      <div className="mb-8 text-center w-full pb-6 border-b border-slate-700/50">
        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-widest uppercase flex items-center justify-center gap-3 drop-shadow-lg">
          <Swords size={28} className="text-indigo-400" /> Tug-o-Luck
        </h1>
      </div>

      <div className="w-24 h-24 rounded-full mb-6 border-4 shadow-lg flex items-center justify-center bg-slate-800" style={{ borderColor: color }}>
         <span className="text-4xl font-black" style={{ color }}>{username?.charAt(0).toUpperCase()}</span>
      </div>
      <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-8">{username}</h2>

      <div className="w-full flex flex-col gap-4">
        <button 
          onClick={onPlay} 
          disabled={isGameRunning && !isReady && !isSpectator}
          title={isGameRunning && !isReady && !isSpectator ? "Game already running! Join as Spectator." : ""}
          className={`flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-black uppercase tracking-widest text-white transition-all duration-300 ${
             isReady && !isSpectator
               ? 'bg-green-600 hover:bg-green-500 shadow-[0_0_20px_rgba(22,163,74,0.4)] scale-[1.02]' 
               : isSpectator
               ? 'bg-slate-700 hover:bg-slate-600 border border-slate-500 shadow-lg'
               : isGameRunning
               ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
               : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg'
          }`}
        >
          {isReady && !isSpectator ? <CheckCircle size={20} /> : <Play size={20} />}
          {inParty 
            ? (isSpectator ? 'Join as Player' : (isReady ? 'Ready!' : 'Click to Ready')) 
            : 'Find Match'}
        </button>

        <button 
          onClick={onSpectate} 
          className={`flex items-center justify-center gap-2 w-full p-4 border rounded-2xl font-bold transition-all ${
             isSpectator 
               ? 'bg-cyan-900/40 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
               : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Eye size={20} className={isSpectator ? "text-cyan-400 animate-pulse" : "text-slate-400"} />
          {inParty ? (isSpectator ? "Spectating (Ready)" : "Spectate Instead") : "Spectate Game"}
        </button>
      </div>
    </div>
  );
};

export default GamePanel;