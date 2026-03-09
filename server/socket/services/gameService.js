const activeGames = require('../state/activeGames');

const createGame = (roomCode, members) => {
  const gameData = {
    roomCode,
    startTime: Date.now(),
    players: members.map(m => ({
      id: m.id,
      username: m.username,
      color: m.color
    })),
    finished: [],
    isFinished: false // NEW FLAG
  };
  activeGames.set(roomCode, gameData);
  return gameData;
};

const handleWin = (roomCode, userId) => {
  const game = activeGames.get(roomCode);
  if (!game || game.isFinished) return null;

  if (game.finished.some(p => p.id === userId)) return game;

  const player = game.players.find(p => p.id === userId);
  if (!player) return game;

  const rank = game.finished.length + 1;
  const finishTime = (Date.now() - game.startTime) / 1000;

  game.finished.push({ ...player, rank, time: finishTime });

  // Check if game is over
  if (game.finished.length === game.players.length) {
    game.isFinished = true;
  }

  return game;
};

const getGameState = (roomCode) => activeGames.get(roomCode) || null;

module.exports = { createGame, handleWin, getGameState };