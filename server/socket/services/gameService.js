// server/socket/services/gameService.js
const activeGames = require('../state/activeGames');
const { POLYOMINOES, generateStartingInventory } = require('../../utils/polyominoes');

const TURN_TIME_LIMIT = 30000;

// NEW: Calculates tight grid sizes to force competitive blocking
const getDynamicBoardSize = (playerCount) => {
  if (playerCount <= 2) return 14;
  if (playerCount === 3) return 17;
  if (playerCount === 4) return 20;
  return 20 + ((playerCount - 4) * 2); // 5->22, 6->24, 7->26... 10->32
};

// NEW: Dynamically finds corners and midpoints based on the exact board size
const getStartingPositions = (playerCount, boardSize) => {
  const max = boardSize - 1;
  const mid = Math.floor(boardSize / 2);
  const q1 = Math.floor(boardSize / 4);
  const q3 = Math.floor((boardSize * 3) / 4);

  const positions = [
    [0, 0], [max, max], [0, max], [max, 0],           // 1-4: The 4 Corners
    [mid, 0], [mid, max], [0, mid], [max, mid],       // 5-8: The 4 Edge Midpoints
    [q1, 0], [q3, max]                                // 9-10: Offset edge points
  ];

  return positions.slice(0, playerCount);
};

const createGame = (roomCode, members) => {
  const activeMembers = members.filter(m => !m.isSpectator);
  const spectatorMembers = members.filter(m => m.isSpectator);

  // Apply the competitive sizing logic
  const boardSize = getDynamicBoardSize(activeMembers.length);
  const board = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
  
  // Get positions based on the newly calculated size
  const startPositions = getStartingPositions(activeMembers.length, boardSize);

  const gameData = {
    roomCode,
    status: 'playing', 
    turnIndex: 0,
    consecutivePasses: 0, 
    turnDeadline: Date.now() + TURN_TIME_LIMIT,
    board,
    boardSize,
    
    activePlayers: activeMembers.map((m, index) => ({
      id: m.id, 
      username: m.username, 
      color: m.color,
      score: 0, 
      piecesLeft: generateStartingInventory(),
      matchState: 'playing',
      startPos: startPositions[index], // Assign unique starting point!
      elo: m.elo || 1200,              
      xp: m.xp || 0,                   
      gamesPlayed: m.gamesPlayed || 0  
    })),
    spectators: spectatorMembers.map(m => ({
      id: m.id, 
      username: m.username, 
      color: m.color
    })),
    finished: []
  };
  activeGames.set(roomCode, gameData);
  return gameData;
};

const getNextPlayingIndex = (players, startIndex) => {
  let idx = startIndex;
  let loopCount = 0;
  do {
    idx = (idx + 1) % players.length;
    loopCount++;
    if (loopCount > players.length) return -1;
  } while (players[idx].matchState !== 'playing'); 
  return idx;
};

const findGameByUserId = (userId) => {
  for (const [roomCode, game] of activeGames.entries()) {
    if (game.status === 'playing') {
      const isPlayer = game.activePlayers.some(p => p.id === userId);
      const isSpectator = game.spectators && game.spectators.some(p => p.id === userId);
      if (isPlayer || isSpectator) return { roomCode, game };
    }
  }
  return null;
};

const isFirstMove = (board, color) => {
  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < board[y].length; x++) {
      if (board[y][x] === color) return false;
    }
  }
  return true;
};

const isValidMove = (roomCode, userId, pieceId, blocksCoords) => {
  const game = activeGames.get(roomCode);
  if (!game || game.status !== 'playing') return { valid: false, reason: "Game is not active." };

  const player = game.activePlayers.find(p => p.id === userId);
  if (!player || player.matchState !== 'playing') return { valid: false, reason: "You cannot play." };
  if (!player.piecesLeft.includes(pieceId)) return { valid: false, reason: "Piece already played." };
  if (blocksCoords.length !== POLYOMINOES[pieceId].size) return { valid: false, reason: "Invalid piece shape." };

  const { board, boardSize } = game;
  const color = player.color;
  const firstMove = isFirstMove(board, color);

  let touchesCorner = false;
  let coversStartPos = false;

  for (const [x, y] of blocksCoords) {
    if (x < 0 || x >= boardSize || y < 0 || y >= boardSize) return { valid: false, reason: "Out of bounds." };
    if (board[y][x] !== null) return { valid: false, reason: "Cell occupied." };

    if (firstMove && x === player.startPos[0] && y === player.startPos[1]) {
      coversStartPos = true;
    }

    const edges = [[x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]];
    for (const [ex, ey] of edges) {
      if (ex >= 0 && ex < boardSize && ey >= 0 && ey < boardSize && board[ey][ex] === color) {
        return { valid: false, reason: "Cannot touch edges of your own pieces." };
      }
    }

    const corners = [[x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]];
    for (const [cx, cy] of corners) {
      if (cx >= 0 && cx < boardSize && cy >= 0 && cy < boardSize && board[cy][cx] === color) touchesCorner = true;
    }
  }

  if (firstMove && !coversStartPos) return { valid: false, reason: "First move must cover your assigned starting position." };
  if (!firstMove && !touchesCorner) return { valid: false, reason: "Must touch the corner of your own piece." };

  return { valid: true };
};

const applyMove = (roomCode, userId, pieceId, blocksCoords) => {
  const game = activeGames.get(roomCode);
  const player = game.activePlayers.find(p => p.id === userId);
  
  blocksCoords.forEach(([x, y]) => { game.board[y][x] = player.color; });
  
  player.piecesLeft = player.piecesLeft.filter(id => id !== pieceId);
  player.score += blocksCoords.length; 
  
  game.consecutivePasses = 0; 
  game.turnIndex = getNextPlayingIndex(game.activePlayers, game.turnIndex);
  game.turnDeadline = Date.now() + TURN_TIME_LIMIT;
  
  return game;
};

const handleForfeit = (roomCode, userId) => {
  const game = activeGames.get(roomCode);
  if (!game || game.status !== 'playing') return null;

  const playerIndex = game.activePlayers.findIndex(p => p.id === userId);
  if (playerIndex === -1) return null;

  const player = game.activePlayers[playerIndex];
  if (player.matchState !== 'playing') return null;

  player.score = -999; 
  player.matchState = 'eliminated';
  game.consecutivePasses += 1;
  
  if (game.turnIndex === playerIndex) {
    game.turnIndex = getNextPlayingIndex(game.activePlayers, game.turnIndex);
    game.turnDeadline = Date.now() + TURN_TIME_LIMIT;
  }

  return checkGameEnd(game);
};

const checkTurnTimeouts = () => {
  const timeoutEvents = [];
  const now = Date.now();
  for (const [roomCode, game] of activeGames.entries()) {
    if (game.status === 'playing' && game.turnDeadline && now > game.turnDeadline) {
      const missedPlayer = game.activePlayers[game.turnIndex];
      game.consecutivePasses += 1;
      game.turnIndex = getNextPlayingIndex(game.activePlayers, game.turnIndex);
      game.turnDeadline = now + TURN_TIME_LIMIT; 
      
      const updatedGame = checkGameEnd(game);
      timeoutEvents.push({ roomCode, game: updatedGame, missedPlayerId: missedPlayer.id });
    }
  }
  return timeoutEvents;
};

const checkGameEnd = (game) => {
  const activeCount = game.activePlayers.filter(p => p.matchState === 'playing').length;
  if (game.consecutivePasses >= activeCount || activeCount === 0 || getNextPlayingIndex(game.activePlayers, game.turnIndex) === -1) {
    game.status = 'finished';
    game.finished = [...game.activePlayers]
        .sort((a, b) => b.score - a.score)
        .map((p, index) => ({ ...p, rank: index + 1 }));
  }
  return game;
};

module.exports = { 
  createGame, isValidMove, applyMove, handleForfeit, 
  findGameByUserId, checkTurnTimeouts, getNextPlayingIndex, checkGameEnd,
  getGameState: (code) => activeGames.get(code) 
};