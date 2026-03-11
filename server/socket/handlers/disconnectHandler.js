const Party = require('../../models/Party');
const pendingRemovals = require('../state/pendingRemovals');
const { handleActualLeave } = require('../services/partyService');

// ADD THIS MISSING IMPORT:
const { leaveQueueBySocket } = require('../services/matchmakingService');

const registerDisconnectHandler = (socket, io) => {
  socket.on('disconnect', async () => {
    // Now this function is defined and will safely remove them from the queue
    leaveQueueBySocket(socket.id); 
    
    const userId = socket.userId;
    if (!userId) return;

    console.log(`User ${userId} disconnected. Waiting 30s...`);

    const timeout = setTimeout(async () => {
      console.log(`Timeout reached for ${userId}. Removing from party.`);
      const party = await Party.findOne({ "members.id": userId });

      if (party) {
        const member = party.members.find(m => m.id === userId);
        await handleActualLeave(userId, member ? member.username : "User", party.code, io);
      }

      pendingRemovals.delete(userId);
    }, 30000);

    pendingRemovals.set(userId, timeout);
  });
};

module.exports = registerDisconnectHandler;