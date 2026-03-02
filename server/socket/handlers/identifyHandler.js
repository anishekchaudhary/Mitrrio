const Party = require('../../models/Party');
const User = require('../../models/User');
const pendingRemovals = require('../state/pendingRemovals');

const registerIdentifyHandler = (socket) => {
  socket.on('identify', async (userId) => {
    socket.userId = userId;

    // cancel disconnect removal if reconnect
    if (pendingRemovals.has(userId)) {
      console.log(`User ${userId} reconnected. Cancelling removal.`);
      clearTimeout(pendingRemovals.get(userId));
      pendingRemovals.delete(userId);
    }

    try {
      // 🔥 SOURCE OF TRUTH → USER.currentParty
      if (!userId || userId.toString().startsWith('guest')) return;

      const userDoc = await User.findById(userId);
      if (!userDoc || !userDoc.currentParty) return;

      const party = await Party.findOne({ code: userDoc.currentParty });
      if (!party) return;

      // safe rejoin
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

    } catch (err) {
      console.error("Rejoin Error:", err);
    }
  });
};

module.exports = registerIdentifyHandler;
