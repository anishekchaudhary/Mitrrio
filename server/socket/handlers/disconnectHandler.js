const Party = require('../../models/Party');
const pendingRemovals = require('../state/pendingRemovals');
const { handleActualLeave } = require('../services/partyService');
const { leaveQueueBySocket } = require('../services/matchmakingService');
const { findGameByUserId, handleForfeit } = require('../services/gameService');
const { processGameState } = require('./gameHandler');

const registerDisconnectHandler = (socket, io) => {
  socket.on('disconnect', async () => {
    leaveQueueBySocket(socket.id); 
    
    const userId = socket.userId;
    if (!userId) return;

    console.log(`User ${userId} disconnected. Giving 30s grace period...`);

    const timeout = setTimeout(async () => {
      console.log(`Timeout reached for ${userId}. Forfeiting game and removing from party.`);
      
      // 1. FORFEIT ACTIVE GAME (If they were in one)
      const activeGameInfo = findGameByUserId(userId);
      if (activeGameInfo) {
        const { roomCode } = activeGameInfo;
        const updatedGame = handleForfeit(roomCode, userId);
        if (updatedGame) {
           io.to(roomCode).emit('receive_message', { room: roomCode, user: "System", text: `Player failed to reconnect and forfeited.`, type: "system_red" });
           processGameState(io, roomCode, updatedGame);
        }
      }

      // 2. LEAVE PARTY 
      const party = await Party.findOne({ "members.id": userId });
      if (party) {
        const member = party.members.find(m => m.id === userId);
        await handleActualLeave(userId, member ? member.username : "User", party.code, io);
      }
      
      pendingRemovals.delete(userId);
    }, 30000); // 30 SECOND GRACE PERIOD

    pendingRemovals.set(userId, timeout);
  });
};

module.exports = registerDisconnectHandler;