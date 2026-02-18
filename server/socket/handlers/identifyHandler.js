const Party = require('../../models/Party');
const activeUsers = require('../state/activeUsers');
const pendingRemovals = require('../state/pendingRemovals');

// NEW: lock who currently owns session
const sessionOwners = new Map();
// userId -> socketId

module.exports = (io, socket) => {

  socket.on('identify', async (userId) => {
    socket.userId = userId;

    const existingSocketId = activeUsers.get(userId);
    const currentOwner = sessionOwners.get(userId);

    // -------------------------------
    // HARD CONTROL LOGIC
    // -------------------------------

    if (existingSocketId && existingSocketId !== socket.id) {

      // if someone already owns session → reject reclaim spam
      if (currentOwner && currentOwner !== socket.id) {
        socket.emit("session_denied");
        return;
      }

      const existingSocket = io.sockets.sockets.get(existingSocketId);

      if (existingSocket) {
        existingSocket.emit("session_replaced");
        existingSocket.disconnect();
      }
    }

    // new socket becomes owner
    activeUsers.set(userId, socket.id);
    sessionOwners.set(userId, socket.id);

    // cancel pending disconnect removal
    if (pendingRemovals.has(userId)) {
      clearTimeout(pendingRemovals.get(userId));
      pendingRemovals.delete(userId);
    }

    // rejoin party after refresh
    try {
      const party = await Party.findOne({ "members.id": userId });
      if (party) {
        socket.join(party.code);
        socket.leave('global');

        const me = party.members.find(m => m.id === userId);

        socket.emit('joined_party', {
          roomName: party.code,
          isPublic: party.type === 'public',
          memberCount: party.members.length,
          maxSize: party.maxSize,
          myColor: me ? me.color : '#94a3b8'
        });
      }
    } catch (err) {
      console.error("Rejoin Error:", err);
    }
  });

};
