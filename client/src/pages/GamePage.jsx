import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../utils/socket';
import { Trophy, Timer, ArrowLeft, Home } from 'lucide-react';
// NEW IMPORT
import ChatWidget from '../components/ChatWidget'; 

const GamePage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState({ players: [], finished: [], isFinished: false });
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user.id || user._id;
  // Fallback color if not found in state (Sync usually handles this, but good to be safe)
  const myColor = gameState.players.find(p => p.id === userId)?.color || "#94a3b8";

  const myRank = gameState.finished.find(p => p.id === userId);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    // Ensure we are identified and synced even on direct load
    if (userId) {
        socket.emit('identify', userId);
        socket.emit('sync_party_state', user);
    }
    
    socket.emit('get_game_state', roomId);

    const onGameUpdate = (data) => setGameState(data);
    socket.on('game_update', onGameUpdate);

    return () => socket.off('game_update', onGameUpdate);
  }, [roomId, userId]);

  const handleWinClick = () => {
    if (!myRank) socket.emit('submit_win', { roomCode: roomId, userId });
  };

  return (
    <div className="h-screen bg-slate-950 text-white font-sans flex overflow-hidden">
      
      {/* 1. CHAT SIDEBAR (Visible on Desktop) */}
      <div className="w-80 border-r border-slate-800 bg-slate-900/50 hidden md:block shrink-0">
        <ChatWidget 
            isPartyMode={true} 
            partyCode={roomId} 
            username={user.username || user.name} 
            myColor={myColor} 
        />
      </div>

      {/* 2. MAIN GAME CONTENT */}
      <div className="flex-1 flex flex-col relative overflow-y-auto">
        
        {/* GAME OVER OVERLAY */}
        {gameState.isFinished && (
            <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-500">
            <div className="bg-slate-900 border-2 border-emerald-500/50 p-12 rounded-3xl shadow-2xl shadow-emerald-500/20 max-w-lg w-full text-center scale-up-center">
                <Trophy size={100} className="text-yellow-400 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white mb-2">Match Over</h2>
                <p className="text-emerald-400 font-bold uppercase tracking-[0.3em] text-xs mb-8">All players have finished</p>
                
                <div className="space-y-3 mb-10">
                {gameState.finished.slice(0, 3).map((p, i) => (
                    <div key={p.id} className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <span className="font-black text-slate-500 italic">#0{p.rank}</span>
                        <span className="font-bold text-lg">{p.username}</span>
                        <span className="font-mono text-emerald-400">{p.time.toFixed(2)}s</span>
                    </div>
                ))}
                </div>

                <button 
                onClick={() => navigate('/')}
                className="w-full bg-white text-black font-black py-4 rounded-xl flex items-center justify-center gap-3 uppercase italic text-lg hover:bg-cyan-400 transition-all active:scale-95"
                >
                <Home size={20} /> Return to Lobby
                </button>
            </div>
            </div>
        )}

        {/* HEADER */}
        <div className="p-8 pb-0 w-full max-w-5xl mx-auto flex justify-between items-center">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors uppercase text-xs font-black tracking-widest">
            <ArrowLeft size={18} /> Lobby
            </button>
            <div className="text-right">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-cyan-400 leading-none">Mitrrio Arena</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-1">Room: {roomId}</p>
            </div>
        </div>

        {/* GAME GRID */}
        <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-5xl mx-auto items-center">
            
            {/* ACTION AREA */}
            <div className="bg-slate-900/40 border-2 border-slate-800/50 p-8 rounded-3xl flex flex-col items-center justify-center h-[500px] relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/10 blur-[100px] pointer-events-none"></div>
            
            {myRank ? (
                <div className="text-center animate-in zoom-in duration-300">
                <div className="bg-emerald-500/20 p-6 rounded-full mb-6 inline-block border border-emerald-500/30">
                    <Trophy size={60} className="text-emerald-400" />
                </div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter">You Finished!</h2>
                <div className="mt-4 inline-flex items-center gap-4 bg-slate-950 px-6 py-2 rounded-full border border-slate-800">
                    <p className="text-2xl text-white font-black italic">RANK #{myRank.rank}</p>
                    <div className="w-px h-6 bg-slate-800"></div>
                    <p className="text-sm text-slate-400 font-mono">{myRank.time.toFixed(3)}s</p>
                </div>
                </div>
            ) : (
                <button 
                onClick={handleWinClick}
                className="group relative bg-red-600 hover:bg-red-500 text-white w-72 h-72 rounded-full shadow-[0_0_50px_rgba(220,38,38,0.3)] transition-all active:scale-90 flex flex-col items-center justify-center border-[12px] border-red-800/50 hover:border-red-700/50 z-10"
                >
                <span className="text-5xl font-black uppercase italic tracking-tighter group-hover:scale-110 transition-transform">
                    FINISH!
                </span>
                <span className="absolute bottom-14 text-[10px] font-black opacity-40 uppercase tracking-[0.3em]">
                    Click now
                </span>
                </button>
            )}
            </div>

            {/* LEADERBOARD */}
            <div className="bg-slate-900/80 backdrop-blur-md border-2 border-slate-800 rounded-3xl overflow-hidden flex flex-col h-[500px]">
                <div className="bg-slate-800/50 p-6 border-b border-slate-700/50 flex items-center justify-between">
                    <h3 className="font-black uppercase italic tracking-widest flex items-center gap-3 text-sm">
                    <Timer size={18} className="text-cyan-400" /> Live Standings
                    </h3>
                    <div className="bg-slate-950 px-3 py-1 rounded-full border border-slate-700">
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">
                        {gameState.finished.length} / {gameState.players.length}
                    </span>
                    </div>
                </div>
                
                <div className="p-6 space-y-3 flex-1 overflow-y-auto">
                    {gameState.finished.map((p, idx) => (
                    <div key={p.id} className="flex items-center gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50 animate-in slide-in-from-right duration-300">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${
                        idx === 0 ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 
                        idx === 1 ? 'bg-slate-300 text-black' : 
                        idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-500'
                        }`}>
                        {p.rank}
                        </div>
                        <div className="flex-1">
                        <p className="font-black text-white italic uppercase tracking-tighter">{p.username}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Completed</p>
                        </div>
                        <div className="text-right">
                        <p className="font-mono text-emerald-400 font-bold">{p.time.toFixed(3)}s</p>
                        </div>
                    </div>
                    ))}

                    {gameState.players
                    .filter(p => !gameState.finished.some(f => f.id === p.id))
                    .map(p => (
                        <div key={p.id} className="flex items-center gap-4 p-4 opacity-30 grayscale">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-black text-slate-600">
                            ?
                        </div>
                        <p className="font-black text-slate-400 uppercase italic tracking-tighter">{p.username}</p>
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-auto animate-pulse">Racing...</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default GamePage;