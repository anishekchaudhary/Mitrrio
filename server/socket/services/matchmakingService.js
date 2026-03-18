const { createGame } = require('./gameService');
const Party = require('../../models/Party');

const queue = [];

const joinQueue = (user, socket, io) => {
  // Remove if already in queue to prevent duplicates
  leaveQueue(user._id || user.id);
  
  queue.push({
    userId: user._id || user.id,
    socket,
    username: user.username,
    elo: user.elo || 1200,
    xp: user.xp || 0,
    gamesPlayed: user.gamesPlayed || 0,
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
  // Need at least 2 players to start a match
  if (queue.length < 2) return; 

  // Sort by Elo for SBMM
  queue.sort((a, b) => a.elo - b.elo);

  const PLAYERS_PER_MATCH = 2; // For testing. Change to 4 later.

  while (queue.length >= PLAYERS_PER_MATCH) {
    const matchedPlayers = queue.splice(0, PLAYERS_PER_MATCH);
    const roomCode = `PUB_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];

    const members = matchedPlayers.map((player, index) => ({
      id: player.userId,
      username: player.username,
      color: colors[index],
      isReady: true, // Auto-ready for public matches
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

      // Notify matched players and trigger their frontend navigation
      matchedPlayers.forEach(player => {
        player.socket.join(roomCode);
        player.socket.emit('joined_party', {
          roomName: roomCode,
          isPublic: true,
          memberCount: members.length,
          maxSize: PLAYERS_PER_MATCH,
          myColor: player.color,
          members
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