import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../utils/socket';
import { Dices, CheckCircle, LogOut, Trophy, AlertTriangle, Timer } from 'lucide-react';
import ChatWidget from '../components/ChatWidget'; 

const GamePage = () => {
  const { id: roomCode } = useParams();
  const navigate = useNavigate();

  const [gameState, setGameState] = useState(null);
  const [diceRoll, setDiceRoll] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [showExitModal, setShowExitModal] = useState(false);

  const [user] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const userId = user?.id || user?._id;

  useEffect(() => {
    if (!user) { navigate('/'); return; }

    const initGameConnection = () => {
      socket.emit('identify', userId);
      socket.emit('join_room', roomCode);
      socket.emit('get_game_state', roomCode);
    };

    if (!socket.connected) socket.connect();
    else initGameConnection();

    socket.on('connect', initGameConnection);

    const onGameUpdate = (state) => {
      if (!state) {
        alert("Game session not found or has ended.");
        navigate('/');
      } else {
        setGameState(state);
      }
    };
    
    const onDiceRolled = ({ userId: rollerId, roll }) => {
      setDiceRoll(roll);
      setIsRolling(true);
      setTimeout(() => setIsRolling(false), 500);
    };

    const onEloUpdate = (data) => {
      if (String(data.userId) === String(userId)) {
        const savedUser = JSON.parse(localStorage.getItem('user'));
        if (savedUser) {
          savedUser.elo = data.elo;
          savedUser.xp = data.xp;
          savedUser.gamesPlayed = data.gamesPlayed;
          localStorage.setItem('user', JSON.stringify(savedUser));
        }
      }
    };

    socket.on('game_update', onGameUpdate);
    socket.on('dice_rolled', onDiceRolled);
    socket.on('elo_update', onEloUpdate);

    return () => {
      socket.off('connect', initGameConnection);
      socket.off('game_update', onGameUpdate);
      socket.off('dice_rolled', onDiceRolled);
      socket.off('elo_update', onEloUpdate);
    };
  }, [roomCode, userId, navigate, user]);

  useEffect(() => {
    if (!gameState || gameState.status !== 'playing' || !gameState.turnDeadline) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((gameState.turnDeadline - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 100);
    return () => clearInterval(interval);
  }, [gameState]);

  const handleRoll = () => { if (!isRolling) socket.emit('roll_dice', { roomCode, userId }); };
  const handleHold = () => { socket.emit('hold_score', { roomCode, userId }); };

  const confirmForfeit = () => {
    socket.emit('forfeit_game', { roomCode, userId });
    socket.emit('leave_arena', { roomCode, userId }); 
    setShowExitModal(false);
    navigate('/');
  };

  const confirmSpectatorExit = () => {
    socket.emit('leave_arena', { roomCode, userId });
    setShowExitModal(false);
    navigate('/'); 
  };

  const handleReturnToLobby = () => {
    navigate('/');
  };

  if (!gameState) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const activePlayer = gameState.activePlayers[gameState.turnIndex];
  const myActivePlayerNode = gameState.activePlayers.find(p => p.id === userId);
  
  const isMyTurn = myActivePlayerNode && activePlayer?.id === userId && myActivePlayerNode.matchState === 'playing';
  const isSpectator = !myActivePlayerNode || myActivePlayerNode.matchState === 'eliminated';
  const myColor = myActivePlayerNode?.color || gameState.spectators?.find(p => p.id === userId)?.color || '#94a3b8';

  return (
    <div className="relative w-full min-h-screen bg-slate-950 font-sans text-slate-200 overflow-hidden flex flex-col">
      <div className="absolute inset-0 z-0 bg-cover bg-center opacity-40" style={{ backgroundImage: "url('/Background.png')" }}></div>
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-950 via-slate-900/80 to-slate-950"></div>

      {showExitModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            {isSpectator ? (
              <>
                <LogOut className="text-slate-400 mx-auto mb-4" size={56} />
                <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-2">Leave Arena?</h3>
                <p className="text-slate-400 mb-8 font-medium">You will stop spectating this match and return to the dashboard.</p>
                <div className="flex gap-4">
                  <button onClick={() => setShowExitModal(false)} className="flex-1 py-3 rounded-xl font-bold bg-slate-800 text-white hover:bg-slate-700 transition-all">Cancel</button>
                  <button onClick={confirmSpectatorExit} className="flex-1 py-3 rounded-xl font-bold bg-slate-600 text-white hover:bg-slate-500 transition-all">Yes, Leave</button>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="text-red-500 mx-auto mb-4" size={56} />
                <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-2">Forfeit Match?</h3>
                <p className="text-slate-400 mb-8 font-medium">You will automatically drop to -50 points and suffer an Elo penalty.</p>
                <div className="flex gap-4">
                  <button onClick={() => setShowExitModal(false)} className="flex-1 py-3 rounded-xl font-bold bg-slate-800 text-white hover:bg-slate-700 transition-all">Cancel</button>
                  <button onClick={confirmForfeit} className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-500 transition-all">Yes, Forfeit</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="order-4 hidden md:block md:fixed md:top-6 md:bottom-6 md:left-6 md:w-96 md:z-20">
        <ChatWidget isPartyMode={true} partyCode={roomCode} username={user?.username || user?.name} myColor={myColor} />
      </div>

      <div className="relative z-10 flex items-center justify-between p-6 bg-slate-900/50 border-b border-slate-800 backdrop-blur-md">
        <div className="md:ml-[440px]"> 
          <h1 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-3">
            <Trophy className="text-indigo-400" /> Arena: {roomCode}
          </h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Tug-o-Luck</p>
        </div>
        
        <button 
          onClick={() => setShowExitModal(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
            isSpectator 
              ? 'bg-slate-500/10 text-slate-400 border border-slate-500/30 hover:bg-slate-500 hover:text-white'
              : 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white'
          }`}
        >
          <LogOut size={16} /> {isSpectator ? 'Exit' : 'Forfeit'}
        </button>
      </div>

      <div className="relative z-10 flex-1 flex flex-col md:flex-row p-6 gap-6 w-full md:pl-[440px] max-w-[100rem] mx-auto">
        <div className="w-full md:w-1/3 flex flex-col gap-4 overflow-y-auto pr-2">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Combatants</h2>
          {gameState.activePlayers.map((player, index) => {
            const isCurrentlyPlaying = index === gameState.turnIndex && player.matchState === 'playing';
            const isMe = player.id === userId;
            const isEliminated = player.matchState === 'eliminated';
            const isWon = player.matchState === 'won';

            let targetIndex = (index + 1) % gameState.activePlayers.length;
            while(gameState.activePlayers[targetIndex].matchState !== 'playing' && targetIndex !== index) {
              targetIndex = (targetIndex + 1) % gameState.activePlayers.length;
            }
            const targetPlayer = gameState.activePlayers[targetIndex];

            const fillLeft = player.score < 0 ? `${50 + player.score}%` : '50%';
            const fillRight = player.score > 0 ? `${50 - player.score}%` : '50%';

            return (
              <div key={player.id} className={`relative p-4 rounded-2xl border backdrop-blur-md transition-all duration-300 overflow-hidden ${isCurrentlyPlaying ? 'bg-slate-800/80 border-slate-500 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-slate-900/60 border-slate-700'} ${isEliminated ? 'opacity-50 grayscale' : ''}`}>
                {isWon && <div className="absolute inset-0 bg-green-500/20 z-10 flex items-center justify-center font-black text-3xl tracking-widest text-green-400 backdrop-blur-[2px]">WINNER</div>}
                {isEliminated && <div className="absolute inset-0 bg-red-500/20 z-10 flex items-center justify-center font-black text-2xl tracking-widest text-red-500 backdrop-blur-[2px]">ELIMINATED</div>}
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: player.color }}></div>
                    <span className="font-bold text-lg drop-shadow-md" style={{ color: player.color }}>{player.username} {isMe && <span className="text-slate-400 text-sm opacity-70 ml-1">(You)</span>}</span>
                  </div>
                  <span className={`font-black text-xl ${player.score > 0 ? 'text-green-400' : player.score < 0 ? 'text-red-400' : 'text-slate-400'}`}>{player.score > 0 ? `+${player.score}` : player.score}</span>
                </div>
                <div className="w-full h-3 bg-slate-950 rounded-full relative overflow-hidden shadow-inner">
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-500 z-10"></div>
                  <div className={`absolute top-0 bottom-0 transition-all duration-500 rounded-full ${player.score > 0 ? 'bg-green-500' : 'bg-red-500'}`} style={{ left: fillLeft, right: fillRight }}></div>
                </div>
                {player.matchState === 'playing' && (
                  <div className="mt-3 text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">Tugging Target ➔ <span style={{ color: targetPlayer.color }}>{targetPlayer.username}</span></div>
                )}
              </div>
            );
          })}
        </div>

        <div className={`flex-1 flex flex-col items-center justify-center rounded-3xl p-8 backdrop-blur-md transition-all duration-500 ${isMyTurn ? 'bg-indigo-900/30 border-2 border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.3)] scale-[1.02]' : 'bg-slate-900/40 border border-slate-800 scale-100'}`}>
          {gameState.status === 'finished' ? (
             <div className="w-full max-w-xl animate-in fade-in zoom-in duration-500">
                <Trophy size={64} className="text-yellow-500 mx-auto mb-4" />
                <h2 className="text-3xl font-black text-white uppercase tracking-widest text-center mb-8">Final Standings</h2>
                <div className="space-y-3 mb-8">
                  {gameState.finished?.map((player) => (
                    <div key={player.id} className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-slate-900" style={{ backgroundColor: player.color }}>#{player.rank}</div>
                        <div>
                          <h3 className="font-bold text-white text-lg" style={{ color: player.color }}>{player.username}</h3>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Final Score: {player.score}</p>
                        </div>
                      </div>
                      {player.score <= -50 ? (
                         <div className="flex items-center gap-2 text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg font-bold text-sm"><AlertTriangle size={16} /> Eliminated</div>
                      ) : (
                         <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-3 py-1.5 rounded-lg font-bold text-sm"><CheckCircle size={16} /> Survived</div>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={handleReturnToLobby} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest transition-all active:scale-95">Return to Dashboard</button>
             </div>
          ) : (
            <>
              <div className="w-full max-w-xs mb-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><Timer size={12}/> Time Left</span>
                  <span className={`text-xs font-black ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>{timeLeft}s</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden shadow-inner">
                  <div className={`h-full transition-all duration-200 ease-linear ${timeLeft <= 10 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${(timeLeft / 30) * 100}%` }}></div>
                </div>
              </div>
              <div className="text-center mb-8">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Active Turn</h3>
                <div className="text-5xl font-black drop-shadow-lg" style={{ color: activePlayer?.color || '#fff' }}>{activePlayer?.username}</div>
                {isMyTurn && <p className="text-indigo-400 font-black tracking-widest uppercase text-sm mt-3 animate-pulse bg-indigo-500/10 inline-block px-4 py-1 rounded-full">It is your turn!</p>}
              </div>
              <div className="flex flex-col items-center justify-center mb-10 h-48">
                <div className={`p-8 bg-slate-950 rounded-3xl border-2 shadow-2xl transition-all ${(diceRoll === 1 || diceRoll === 'SKIP') ? 'border-red-500 shadow-red-500/30' : 'border-slate-700'} ${isRolling ? 'animate-spin scale-110' : ''}`}>
                  {diceRoll === 'SKIP' ? <Timer size={80} className="text-red-500" /> : <Dices size={80} className={diceRoll === 1 ? 'text-red-500' : 'text-indigo-400'} />}
                </div>
                <div className="h-10 mt-6 flex items-center justify-center">
                  {diceRoll !== null && !isRolling && (
                    <div className={`text-2xl font-black uppercase tracking-widest animate-in slide-in-from-bottom-2 fade-in ${(diceRoll === 1 || diceRoll === 'SKIP') ? 'text-red-500' : 'text-green-400'}`}>
                      {diceRoll === 'SKIP' ? 'TIME EXPIRED! Turn Skipped.' : diceRoll === 1 ? 'Rolled a 1! Snap! Turn Lost.' : `Rolled a ${diceRoll}`}
                    </div>
                  )}
                </div>
              </div>
              <div className="mb-12 text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Current Turn Bank</p>
                <div className="text-6xl font-black text-white drop-shadow-md">{gameState.currentTurnTotal}</div>
              </div>
              {!isSpectator && (
                <div className="flex gap-4 w-full max-w-sm">
                  <button onClick={handleRoll} disabled={!isMyTurn || isRolling} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white py-5 rounded-xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg"><Dices size={22} /> Roll</button>
                  <button onClick={handleHold} disabled={!isMyTurn || gameState.currentTurnTotal === 0 || isRolling} className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-800 disabled:text-slate-600 text-white py-5 rounded-xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg"><CheckCircle size={22} /> Hold</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      <div className="md:hidden p-6 pt-0">
        <div className="h-64 w-full relative z-20">
          <ChatWidget isPartyMode={true} partyCode={roomCode} username={user?.username || user?.name} myColor={myColor} />
        </div>
      </div>
    </div>
  );
};

export default GamePage;