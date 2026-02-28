const Party = require('../../models/Party');
const pendingRemovals = require('../state/pendingRemovals');
const activeUsers = require('../state/activeUsers');
const { handleActualLeave } = require('../utils/partyUtils');

module.exports = (io, socket) => {

  socket.on('disconnect', async () => {
    const userId = socket.userId;
    if (!userId) return;

    console.log(`User ${userId} disconnected. Waiting 30s...`);

    activeUsers.delete(userId);

    const timeout = setTimeout(async () => {
      console.log(`Timeout reached for ${userId}. Removing from party.`);

      const party = await Party.findOne({ "members.id": userId });

      if (party) {
        const member = party.members.find(m => m.id === userId);
        await handleActualLeave(io, userId, member ? member.username : "User", party.code);
      }

      pendingRemovals.delete(userId);
    }, 30000);

    pendingRemovals.set(userId, timeout);
  });

};
