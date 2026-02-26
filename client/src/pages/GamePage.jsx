import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const GamePage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-sans">
      <h1 className="text-3xl font-bold mb-4">Game Arena ⚔️</h1>
      <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 text-center shadow-2xl">
        <p className="text-gray-400 uppercase text-xs font-bold tracking-widest mb-2">Current Room ID</p>
        <p className="text-5xl font-mono text-blue-400 font-bold mb-6">{roomId || "RANKED_QUEUE"}</p>
        
        <div className="flex items-center justify-center space-x-3 text-green-400 bg-green-400/10 py-2 px-4 rounded-full border border-green-400/20">
           <span className="animate-pulse">●</span> <span>Connecting to Game Server...</span>
        </div>

        <button 
          onClick={() => navigate('/')}
          className="mt-8 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-bold"
        >
          Leave Match
        </button>
      </div>
    </div>
  );
};
const handleGameOver = (winnerId, loserId) => {
    // 1. Show Game Over UI
    
    // 2. Report result to server for Elo calculation
    socket.emit('game_end', { 
        winnerId: winnerId, 
        loserId: loserId 
    });
};

export default GamePage;