import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../utils/socket';
import { CheckCircle, LogOut, Trophy, AlertTriangle, Timer, HelpCircle, Grid } from 'lucide-react';
import ChatWidget from '../components/ChatWidget'; 
import RulesModal from '../components/RulesModal';
import { POLYOMINOES, rotatePiece } from '../utils/polyominoes';

const GamePage = () => {
  const { id: roomCode } = useParams();
  const navigate = useNavigate();

  const [gameState, setGameState] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const [selectedPieceId, setSelectedPieceId] = useState(null);
  const [activePieceCoords, setActivePieceCoords] = useState([]);
  const [hoverPos, setHoverPos] = useState({ x: -1, y: -1 });

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
        setToastMessage(""); 
      }
    };

    const onMoveRejected = (reason) => {
      setToastMessage(reason);
      setTimeout(() => setToastMessage(""), 4000);
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
    socket.on('move_rejected', onMoveRejected);
    socket.on('elo_update', onEloUpdate);

    return () => {
      socket.off('connect', initGameConnection);
      socket.off('game_update', onGameUpdate);
      socket.off('move_rejected', onMoveRejected);
      socket.off('elo_update', onEloUpdate);
    };
  }, [roomCode, userId, navigate, user]);

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.key === 'r' || e.key === 'R') && selectedPieceId) {
        setActivePieceCoords(prev => rotatePiece(prev));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedPieceId]);

  useEffect(() => {
    if (!gameState || gameState.status !== 'playing' || !gameState.turnDeadline) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((gameState.turnDeadline - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 100);
    return () => clearInterval(interval);
  }, [gameState]);

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

  const handleReturnToLobby = () => navigate('/');

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

  // NEW: Check if it's the first move for the player
  const isFirstMove = myActivePlayerNode && !gameState.board.some(row => row.includes(myColor));

  let clampedX = hoverPos.x;
  let clampedY = hoverPos.y;

  if (selectedPieceId && activePieceCoords.length > 0 && hoverPos.x !== -1) {
    const minX = Math.min(...activePieceCoords.map(c => c[0]));
    const maxX = Math.max(...activePieceCoords.map(c => c[0]));
    const minY = Math.min(...activePieceCoords.map(c => c[1]));
    const maxY = Math.max(...activePieceCoords.map(c => c[1]));

    if (clampedX + minX < 0) clampedX = -minX;
    if (clampedX + maxX >= gameState.boardSize) clampedX = gameState.boardSize - 1 - maxX;
    if (clampedY + minY < 0) clampedY = -minY;
    if (clampedY + maxY >= gameState.boardSize) clampedY = gameState.boardSize - 1 - maxY;
  }

  const previewBlocks = selectedPieceId && hoverPos.x !== -1 
    ? activePieceCoords.map(([cx, cy]) => ({ x: clampedX + cx, y: clampedY + cy }))
    : [];

  const checkValidPlacement = () => {
    if (previewBlocks.length === 0) return false;
    const { board, boardSize } = gameState;
    const color = myColor;

    let touchesCorner = false;
    let coversStart = false; // NEW check

    for (const { x, y } of previewBlocks) {
      if (x < 0 || x >= boardSize || y < 0 || y >= boardSize) return false;
      if (board[y][x] !== null) return false;

      // Check if it covers assigned starting position
      if (isFirstMove && myActivePlayerNode.startPos && x === myActivePlayerNode.startPos[0] && y === myActivePlayerNode.startPos[1]) {
        coversStart = true;
      }

      const edges = [[x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]];
      for (const [ex, ey] of edges) {
        if (ex >= 0 && ex < boardSize && ey >= 0 && ey < boardSize && board[ey][ex] === color) {
          return false; 
        }
      }

      const corners = [[x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]];
      for (const [cx, cy] of corners) {
        if (cx >= 0 && cx < boardSize && cy >= 0 && cy < boardSize && board[cy][cx] === color) touchesCorner = true;
      }
    }

    if (isFirstMove && !coversStart) return false;
    if (!isFirstMove && !touchesCorner) return false;

    return true;
  };

  const isPlacementValid = isMyTurn ? checkValidPlacement() : false;

  const handleBoardClick = () => {
    if (!isMyTurn || !selectedPieceId || previewBlocks.length === 0 || !isPlacementValid) {
        if (previewBlocks.length > 0 && !isPlacementValid) {
            setToastMessage("Invalid placement. Check starting point or edges/corners.");
            setTimeout(() => setToastMessage(""), 2000);
        }
        return;
    }
    socket.emit('place_piece', { 
      roomCode, 
      pieceId: selectedPieceId, 
      blocksCoords: previewBlocks.map(b => [b.x, b.y]) 
    });
    setSelectedPieceId(null); 
    setHoverPos({ x: -1, y: -1 });
  };

  return (
    <div className="relative w-full min-h-screen bg-slate-950 font-sans text-slate-200 overflow-hidden flex flex-col">
      <div className="absolute inset-0 z-0 bg-cover bg-center opacity-40" style={{ backgroundImage: "url('/Background.png')" }}></div>
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-950 via-slate-900/80 to-slate-950"></div>

      <RulesModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} />

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
                <p className="text-slate-400 mb-8 font-medium">You will automatically drop to last place and suffer an Elo penalty.</p>
                <div className="flex gap-4">
                  <button onClick={() => setShowExitModal(false)} className="flex-1 py-3 rounded-xl font-bold bg-slate-800 text-white hover:bg-slate-700 transition-all">Cancel</button>
                  <button onClick={confirmForfeit} className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-500 transition-all">Yes, Forfeit</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="order-4 hidden lg:block lg:fixed lg:top-6 lg:bottom-6 lg:left-6 lg:w-[350px] lg:z-20">
        <ChatWidget isPartyMode={true} partyCode={roomCode} username={user?.username || user?.name} myColor={myColor} />
      </div>

      <div className="relative z-10 flex items-center justify-between p-6 bg-slate-900/50 border-b border-slate-800 backdrop-blur-md">
        <div className="lg:ml-[380px]"> 
          <h1 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-3">
            <Grid className="text-indigo-400" /> Arena: {roomCode}
          </h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Block Battles</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowRulesModal(true)}
            className="flex items-center justify-center p-2 rounded-lg text-slate-400 bg-slate-800 hover:bg-cyan-600 hover:text-white transition-all border border-slate-700 shadow-sm"
            title="How to Play"
          >
            <HelpCircle size={20} />
          </button>

          <button 
            onClick={() => setShowExitModal(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all shadow-sm ${
              isSpectator 
                ? 'bg-slate-500/10 text-slate-400 border border-slate-500/30 hover:bg-slate-500 hover:text-white'
                : 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white'
            }`}
          >
            <LogOut size={16} /> {isSpectator ? 'Exit' : 'Forfeit'}
          </button>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col lg:flex-row p-6 gap-6 w-full lg:pl-[380px] max-w-[100rem] mx-auto">
        
        {/* Left Column: Player Rankings & Piece Tray */}
        <div className="w-full lg:w-[400px] flex flex-col gap-6 flex-shrink-0">
          
          <div>
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
              <span>Combatants</span>
              <span className="text-xs">Blocks Placed</span>
            </h2>
            
            <div className="flex flex-col gap-3 overflow-y-auto pr-2 max-h-[35vh]">
              {[...gameState.activePlayers].sort((a, b) => b.score - a.score).map((player) => {
                const isCurrentlyPlaying = player.id === activePlayer?.id && gameState.status === 'playing';
                const isMe = player.id === userId;
                const isEliminated = player.matchState === 'eliminated';

                return (
                  <div key={player.id} className={`relative p-3 rounded-2xl border backdrop-blur-md transition-all duration-300 overflow-hidden ${isCurrentlyPlaying ? 'bg-slate-800 border-slate-500 shadow-[0_0_15px_rgba(255,255,255,0.05)] transform scale-[1.02]' : 'bg-slate-900/60 border-slate-800'} ${isEliminated ? 'opacity-50 grayscale' : ''}`}>
                    {isEliminated && <div className="absolute inset-0 bg-slate-950/40 z-10 flex items-center justify-center font-black text-lg tracking-widest text-slate-400 backdrop-blur-[1px]">FORFEITED</div>}
                    
                    <div className="flex justify-between items-center relative z-20">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-sm shadow-sm border border-slate-950" style={{ backgroundColor: player.color }}></div>
                        <div>
                          <span className="font-bold text-[15px] drop-shadow-md" style={{ color: player.color }}>
                            {player.username} {isMe && <span className="text-slate-400 text-xs opacity-70 ml-1">(You)</span>}
                          </span>
                          <div className="text-[11px] text-slate-400 font-medium">Pieces left: {player.piecesLeft.length}</div>
                        </div>
                      </div>
                      <span className="font-black text-2xl" style={{ color: player.color }}>{player.score}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!isSpectator && gameState.status === 'playing' && (
            <div className="w-full bg-slate-900/80 p-5 rounded-2xl border border-slate-700 backdrop-blur-md shadow-xl flex-grow flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold uppercase tracking-widest text-sm">Your Inventory</h3>
                {isMyTurn && <span className="text-yellow-400 text-[10px] font-black animate-pulse uppercase tracking-widest">Press 'R' to Rotate</span>}
              </div>
              
              <div className="flex flex-wrap gap-2 justify-start overflow-y-auto pr-2 content-start flex-grow">
                {myActivePlayerNode?.piecesLeft.map(id => {
                  const isSelected = selectedPieceId === id;
                  const coords = POLYOMINOES[id].coords;
                  const minX = Math.min(...coords.map(c => c[0])), minY = Math.min(...coords.map(c => c[1]));
                  const w = (Math.max(...coords.map(c => c[0])) - minX + 1) * 14;
                  const h = (Math.max(...coords.map(c => c[1])) - minY + 1) * 14;
                  
                  return (
                    <div 
                      key={id} 
                      onClick={() => { if(isMyTurn) { setSelectedPieceId(isSelected ? null : id); setActivePieceCoords(isSelected ? [] : coords); } }}
                      className={`p-1.5 rounded-lg cursor-pointer transition-all duration-200 ${isSelected ? 'bg-slate-600 ring-2 ring-white scale-110 shadow-lg' : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'}`}
                      style={{ opacity: isMyTurn ? 1 : 0.3, pointerEvents: isMyTurn ? 'auto' : 'none' }}
                    >
                      <svg width={w} height={h}>
                        {coords.map(([cx, cy], i) => (
                          <rect key={i} x={(cx-minX)*14} y={(cy-minY)*14} width="13" height="13" fill={myActivePlayerNode.color} rx="2"/>
                        ))}
                      </svg>
                    </div>
                  );
                })}
                {myActivePlayerNode?.piecesLeft.length === 0 && <div className="text-slate-500 font-bold italic py-4">No pieces left!</div>}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800">
                <button 
                  onClick={() => socket.emit('skip_turn', { roomCode })} 
                  disabled={!isMyTurn} 
                  className="w-full bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/50 disabled:opacity-30 disabled:border-slate-800 disabled:text-slate-600 disabled:bg-slate-900 py-3 rounded-xl font-black uppercase tracking-widest transition-all shadow-sm text-sm"
                >
                  Skip Turn (Cannot Move)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Board & Top Banner */}
        <div className="flex-1 flex flex-col items-center">
          
          {toastMessage && (
            <div className="w-full max-w-2xl bg-red-900/80 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-center font-bold animate-pulse mb-4 shadow-lg">
              ⚠️ {toastMessage}
            </div>
          )}

          {gameState.status === 'finished' ? (
             <div className="w-full max-w-xl animate-in fade-in zoom-in duration-500 bg-slate-900/80 p-8 rounded-3xl border border-slate-700 backdrop-blur-md">
                <Trophy size={64} className="text-yellow-500 mx-auto mb-4" />
                <h2 className="text-3xl font-black text-white uppercase tracking-widest text-center mb-8">Final Standings</h2>
                <div className="space-y-3 mb-8">
                  {gameState.finished?.map((player) => (
                    <div key={player.id} className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-slate-900 shadow-md" style={{ backgroundColor: player.color }}>#{player.rank}</div>
                        <div>
                          <h3 className="font-bold text-white text-lg" style={{ color: player.color }}>{player.username}</h3>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Blocks Placed: {player.score}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-3 py-1.5 rounded-lg font-bold text-sm"><CheckCircle size={16} /> Completed</div>
                    </div>
                  ))}
                </div>
                <button onClick={handleReturnToLobby} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg">Return to Dashboard</button>
             </div>
          ) : (
            <>
              <div className="w-full max-w-2xl flex justify-between items-center mb-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
                 <div>
                   <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Current Turn</h3>
                   <div className="text-2xl font-black drop-shadow-lg flex items-center gap-2" style={{ color: activePlayer?.color || '#fff' }}>
                     {activePlayer?.username} 
                     {isMyTurn && <span className="text-[10px] bg-yellow-500 text-black px-2 py-0.5 rounded-full uppercase tracking-widest">Your Turn</span>}
                   </div>
                 </div>
                 <div className="text-right">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 justify-end"><Timer size={12}/> Time Left</span>
                    <span className={`text-2xl font-black ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-slate-300'}`}>{timeLeft}s</span>
                 </div>
              </div>

              {/* The Board */}
              <div 
                className="bg-slate-800 border-4 border-slate-700 rounded-lg shadow-[0_0_40px_rgba(0,0,0,0.5)] relative select-none w-full max-w-2xl aspect-square"
                style={{ display: 'grid', gridTemplateColumns: `repeat(${gameState.boardSize}, 1fr)`, gap: '1px' }}
                onMouseLeave={() => setHoverPos({ x: -1, y: -1 })}
              >
                {gameState.board.map((row, y) => row.map((cellColor, x) => {
                  const isPreview = previewBlocks.some(b => b.x === x && b.y === y);
                  // NEW: Detect if this grid square is the specific starting position for the current user
                  const isMyStart = isFirstMove && myActivePlayerNode?.startPos && x === myActivePlayerNode.startPos[0] && y === myActivePlayerNode.startPos[1];
                  
                  let displayClass = 'bg-slate-950/80 transition-colors cursor-crosshair ';
                  
                  if (cellColor) {
                    displayClass += 'hover:opacity-80'; 
                  } else if (isPreview) {
                    displayClass += isPlacementValid 
                      ? 'ring-2 ring-inset ring-green-400 bg-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.5)] z-10 ' 
                      : 'ring-2 ring-inset ring-red-500 bg-red-500/20 shadow-[0_0_10px_rgba(248,113,113,0.5)] z-10 ';
                  } else {
                    displayClass += 'hover:bg-slate-700';
                  }

                  return (
                    <div 
                      key={`${x}-${y}`} 
                      className={`w-full h-full relative flex items-center justify-center ${displayClass}`}
                      style={{ backgroundColor: cellColor || (isPreview && isPlacementValid ? myActivePlayerNode?.color : undefined) }}
                      onMouseEnter={() => setHoverPos({ x, y })}
                      onClick={handleBoardClick}
                    >
                        {isPreview && !isPlacementValid && !cellColor && (
                            <div className="absolute inset-0 opacity-40" style={{ backgroundColor: myColor }}></div>
                        )}
                        {/* Render the pulsing start point if it's their first turn */}
                        {isMyStart && !cellColor && !isPreview && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                <div className="w-2/3 h-2/3 rounded-full animate-ping opacity-70" style={{ backgroundColor: myColor }}></div>
                                <div className="absolute w-2 h-2 rounded-full" style={{ backgroundColor: myColor }}></div>
                            </div>
                        )}
                    </div>
                  );
                }))}
              </div>
            </>
          )}
        </div>

      </div>
      
      <div className="lg:hidden p-6 pt-0">
        <div className="h-64 w-full relative z-20">
          <ChatWidget isPartyMode={true} partyCode={roomCode} username={user?.username || user?.name} myColor={myColor} />
        </div>
      </div>
    </div>
  );
};

export default GamePage;