const activeGames = require('../state/activeGames');

const TARGET_SCORE = 50;
const TURN_TIME_LIMIT = 30000; // 30 Seconds

const createGame = (roomCode, members) => {
  // --- NEW: Split the lobby into players and spectators ---
  const activeMembers = members.filter(m => !m.isSpectator);
  const spectatorMembers = members.filter(m => m.isSpectator);

  const gameData = {
    roomCode,
    status: 'playing', 
    turnIndex: 0,
    currentTurnTotal: 0,
    turnDeadline: Date.now() + TURN_TIME_LIMIT,
    // Only active players get scores and Elo baselines
    activePlayers: activeMembers.map(m => ({
      id: m.id, 
      username: m.username, 
      color: m.color, 
      score: 0, 
      matchState: 'playing',
      elo: m.elo || 1200,              
      xp: m.xp || 0,                   
      gamesPlayed: m.gamesPlayed || 0  
    })),
    // Spectators just watch
    spectators: spectatorMembers.map(m => ({
      id: m.id, 
      username: m.username, 
      color: m.color
    })),
    winners: [], losers: [], finished: []
  };
  activeGames.set(roomCode, gameData);
  return gameData;
};

const getNextPlayingIndex = (players, startIndex) => {
  let idx = (startIndex + 1) % players.length;
  while (idx !== startIndex) {
    if (players[idx].matchState === 'playing') return idx;
    idx = (idx + 1) % players.length;
  }
  return -1; 
};

const findGameByUserId = (userId) => {
  for (const [roomCode, game] of activeGames.entries()) {
    if (game.status === 'playing') {
      // Check both active players and spectators
      const isPlayer = game.activePlayers.some(p => p.id === userId);
      const isSpectator = game.spectators && game.spectators.some(p => p.id === userId);
      
      if (isPlayer || isSpectator) {
        return { roomCode, game };
      }
    }
  }
  return null;
};

const handleRoll = (roomCode, userId) => {
  const game = activeGames.get(roomCode);
  if (!game || game.status !== 'playing') return null;

  const activePlayer = game.activePlayers[game.turnIndex];
  if (activePlayer.id !== userId || activePlayer.matchState !== 'playing') return null;

  const roll = Math.floor(Math.random() * 6) + 1;

  if (roll === 1) {
    game.currentTurnTotal = 0;
    game.turnIndex = getNextPlayingIndex(game.activePlayers, game.turnIndex);
  } else {
    game.currentTurnTotal += roll;
  }
  
  game.turnDeadline = Date.now() + TURN_TIME_LIMIT; // RESET TIMER ON ROLL
  return { game, lastRoll: roll };
};

const handleHold = (roomCode, userId) => {
  const game = activeGames.get(roomCode);
  if (!game || game.status !== 'playing') return null;

  const activePlayer = game.activePlayers[game.turnIndex];
  if (activePlayer.id !== userId || activePlayer.matchState !== 'playing') return null;

  const targetIndex = getNextPlayingIndex(game.activePlayers, game.turnIndex);
  if (targetIndex === -1) return null;
  const targetPlayer = game.activePlayers[targetIndex];

  activePlayer.score += game.currentTurnTotal;
  targetPlayer.score -= game.currentTurnTotal;
  game.currentTurnTotal = 0;

  if (targetPlayer.score <= -TARGET_SCORE) {
    targetPlayer.matchState = 'eliminated';
    game.losers.unshift({ ...targetPlayer }); 
  }
  if (activePlayer.score >= TARGET_SCORE) {
    activePlayer.matchState = 'won';
    game.winners.push({ ...activePlayer });
  }

  return checkGameEndAndAdvance(game, userId);
};

const handleForfeit = (roomCode, userId) => {
  const game = activeGames.get(roomCode);
  if (!game || game.status !== 'playing') return null;

  const playerIndex = game.activePlayers.findIndex(p => p.id === userId);
  if (playerIndex === -1) return null; // Ignores spectators trying to forfeit

  const player = game.activePlayers[playerIndex];
  if (player.matchState !== 'playing') return null;

  player.score = -TARGET_SCORE; 
  player.matchState = 'eliminated';
  
  if (game.turnIndex === playerIndex) game.currentTurnTotal = 0;
  game.losers.unshift({ ...player });

  return checkGameEndAndAdvance(game, userId);
};

// --- NEW: Identify AFK Players ---
const checkTurnTimeouts = () => {
  const timeoutEvents = [];
  const now = Date.now();
  for (const [roomCode, game] of activeGames.entries()) {
    if (game.status === 'playing' && game.turnDeadline && now > game.turnDeadline) {
      // FORCE A SNAP / SKIP
      game.currentTurnTotal = 0;
      const missedPlayerId = game.activePlayers[game.turnIndex].id;
      game.turnIndex = getNextPlayingIndex(game.activePlayers, game.turnIndex);
      game.turnDeadline = now + TURN_TIME_LIMIT; // Reset for next person
      timeoutEvents.push({ roomCode, game, missedPlayerId });
    }
  }
  return timeoutEvents;
};

const checkGameEndAndAdvance = (game, userId) => {
  const playingCount = game.activePlayers.filter(p => p.matchState === 'playing').length;
  if (playingCount <= 1) {
    game.status = 'finished';
    const lastMan = game.activePlayers.find(p => p.matchState === 'playing');
    if (lastMan) {
      lastMan.matchState = 'won';
      game.winners.push({ ...lastMan });
    }
    game.finished = [...game.winners, ...game.losers].map((p, index) => ({ ...p, rank: index + 1 }));
  } else {
    const currentPlayerIndex = game.activePlayers.findIndex(p => p.id === userId);
    if (game.turnIndex === currentPlayerIndex) {
      game.turnIndex = getNextPlayingIndex(game.activePlayers, currentPlayerIndex);
    }
    game.turnDeadline = Date.now() + TURN_TIME_LIMIT; // RESET TIMER ON TURN PASS
  }
  return game;
};

module.exports = { createGame, handleRoll, handleHold, handleForfeit, findGameByUserId, checkTurnTimeouts, getGameState: (code) => activeGames.get(code) };