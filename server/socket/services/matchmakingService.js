const { createGame } = require('./gameService');
const Party = require('../../models/Party');

const queue = [];

const joinQueue = (user, socket, io) => {
  leaveQueue(user._id || user.id);
  
  queue.push({
    userId: user._id || user.id,
    socket,
    username: user.username,
    // Use ?? instead of || to prevent 0 from being wiped out
    elo: user.elo ?? 1200, 
    xp: user.xp ?? 0,
    gamesPlayed: user.gamesPlayed ?? 0,
    joinedAt: Date.now()
  });
};

const leaveQueue = (userId) => {
  const index = queue.findIndex(p => p.userId === userId);
  if (index !== -1) queue.splice(index, 1);
};

const leaveQueueBySocket = (socketId) => {
  const index = queue.findIndex(p => p.socket.id === socketId);
  if (index !== -1) queue.splice(index, 1);
};

const processMatchmaking = async (io) => {
  if (queue.length < 2) return; 

  queue.sort((a, b) => a.elo - b.elo);

  const PLAYERS_PER_MATCH = 2; 

  while (queue.length >= PLAYERS_PER_MATCH) {
    const matchedPlayers = queue.splice(0, PLAYERS_PER_MATCH);
    const roomCode = `PUB_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const colors = ['#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

    const members = matchedPlayers.map((player, index) => ({
      id: player.userId,
      username: player.username,
      color: colors[index],
      isReady: true, 
      elo: player.elo,
      xp: player.xp,
      gamesPlayed: player.gamesPlayed
    }));

    try {
      const party = new Party({
        code: roomCode,
        type: 'public',
        maxSize: PLAYERS_PER_MATCH,
        members
      });
      await party.save();

      createGame(roomCode, members);

      matchedPlayers.forEach(player => {
        player.socket.join(roomCode);
        player.socket.emit('joined_party', {
          roomName: roomCode,
          isPublic: true,
          memberCount: members.length,
          maxSize: PLAYERS_PER_MATCH,
          myColor: player.color,
          members,
          isGameRunning: true // Game is instantly running for public matches
        });
        player.socket.emit('game_start', { gameId: roomCode });
      });
    } catch (err) {
      console.error('[Matchmaking Error]', err);
    }
  }
};

const startMatchmakingLoop = (io) => {
  setInterval(() => processMatchmaking(io), 3000);
};

module.exports = { joinQueue, leaveQueue, leaveQueueBySocket, startMatchmakingLoop };