import React, { useState, useMemo } from 'react';
import { Users, Copy, X, ArrowRight, DoorOpen, AlertCircle, Play, CheckCircle } from 'lucide-react';

const PartyWidget = ({ 
  partyState, partyCode, setPartyState, onJoinPrivate, 
  onCreateParty, onLeaveParty, memberCount, maxSize, error,
  // NEW PROPS
  members = [], 
  currentUser, 
  onToggleReady 
}) => {
  const [inputCode, setInputCode] = useState("");

  const copyToClipboard = () => {
    navigator.clipboard.writeText(partyCode);
  };

  // Calculate Ready State
  const readyCount = useMemo(() => members.filter(m => m.isReady).length, [members]);
  const isMeReady = useMemo(() => {
    const me = members.find(m => m.id === (currentUser.id || currentUser._id));
    return me ? me.isReady : false;
  }, [members, currentUser]);

  // Check if everyone is ready (visual cue only for now)
  const allReady = memberCount > 0 && readyCount === memberCount;

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 p-8 rounded-2xl shadow-2xl h-full flex flex-col justify-center font-sans pointer-events-auto">
      
      {/* 1. MENU VIEW & 2. JOINING VIEW (Keep unchanged) */}
      {partyState === 'menu' && ( /* ... existing code ... */ 
         /* (Copy previous content for menu view) */
         <>
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-cyan-500/20 p-4 rounded-xl text-cyan-400">
              <Users size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Party Mode</h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Party with Friends</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button onClick={onCreateParty} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-black py-4 rounded-xl shadow-lg shadow-cyan-900/20 text-lg uppercase italic transition-transform active:scale-95">
              Create
            </button>
            <button onClick={() => setPartyState('joining')} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-900/20 text-lg uppercase italic transition-transform active:scale-95">
              Join
            </button>
          </div>
        </>
      )}

      {partyState === 'joining' && ( /* ... existing code ... */ 
        /* (Copy previous content for joining view) */
        <>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Join Party</h3>
            <button onClick={() => setPartyState('menu')} className="text-slate-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>
          
          <div className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-[10px] font-bold uppercase p-3 rounded-xl flex items-center gap-2 animate-pulse">
                <AlertCircle size={14} /> {error}
              </div>
            )}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block px-1">
                Enter Code to Join
              </label>
              <div className="bg-slate-950 border-2 border-slate-800 rounded-xl p-1 flex items-center focus-within:border-emerald-500 transition-all w-full overflow-hidden">
                <input 
                  autoFocus 
                  value={inputCode} 
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())} 
                  className="bg-transparent text-white font-mono text-3xl font-bold p-3 w-full text-center tracking-[0.4em] outline-none" 
                />
              </div>
            </div>
            <button 
              onClick={() => onJoinPrivate(inputCode)} 
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 uppercase italic text-lg transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
            >
              Join Party <ArrowRight size={20} />
            </button>
          </div>
        </>
      )}

      {/* 3. ACTIVE PARTY VIEW (UPDATED) */}
      {partyState === 'active' && (
        <>
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="inline-flex items-center gap-1 bg-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase px-2 py-1 rounded-full mb-1 border border-cyan-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span> Active
              </div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Party Lobby</h3>
            </div>
            <button onClick={onLeaveParty} className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white p-3 rounded-xl transition-all border border-red-500/20 group">
              <DoorOpen size={20} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          
          <div className="flex items-center gap-2 mb-4 bg-slate-950 p-2 rounded-xl border-2 border-slate-800">
            <input readOnly value={partyCode} className="bg-transparent text-white font-mono text-3xl font-bold px-2 flex-1 text-center tracking-widest outline-none w-full" />
            <button onClick={copyToClipboard} className="bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl transition-all active:scale-90">
              <Copy size={20} />
            </button>
          </div>

          {/* READY COUNT DISPLAY */}
          <div className="flex items-center justify-between gap-2 mb-4 bg-slate-800/30 py-2 px-4 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-cyan-400" />
              <span className="text-xs font-black text-white uppercase tracking-widest">
                Players: <span className="text-cyan-400">{memberCount}</span> / {maxSize}
              </span>
            </div>
            <div className={`flex items-center gap-2 ${allReady ? "text-green-400" : "text-yellow-400"}`}>
               {allReady ? <CheckCircle size={14}/> : <Play size={14}/>}
               <span className="text-xs font-black uppercase tracking-widest">
                 Ready: {readyCount}/{memberCount}
               </span>
            </div>
          </div>

          {/* READY BUTTON */}
          <button 
            onClick={onToggleReady}
            className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 uppercase italic text-lg transition-all active:scale-95 shadow-lg ${
              isMeReady 
                ? "bg-green-600 hover:bg-green-500 text-white shadow-green-900/20" 
                : "bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white shadow-slate-900/20"
            }`}
          >
             {isMeReady ? (
               <>Ready! <CheckCircle size={24} /></>
             ) : (
               <>Click to Ready <Play size={24} /></>
             )}
          </button>
        </>
      )}
    </div>
  );
};

export default PartyWidget;