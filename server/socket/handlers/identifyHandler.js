const Party = require('../../models/Party');
const User = require('../../models/User');
const pendingRemovals = require('../state/pendingRemovals');
const { broadcastPartyUpdate } = require('../services/partyService');

// Make sure io is passed here!
const registerIdentifyHandler = (socket, io) => {
  
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

  // --- NEW: Handle Username Updates Gracefully ---
  socket.on('update_username', async ({ userId, newUsername }) => {
    try {
      if (userId && !userId.toString().startsWith('guest')) {
        await User.findByIdAndUpdate(userId, { username: newUsername });
      }

      socket.username = newUsername;

      const party = await Party.findOne({ "members.id": userId });
      if (party) {
        const member = party.members.find(m => m.id === userId);
        if (member) {
          const oldName = member.username;
          member.username = newUsername;
          party.markModified('members');
          await party.save();
          
          // Update everyone's lobbies
          if (io) await broadcastPartyUpdate(party.code, io);
          
          // Broadcast a clean name change message to the chat room
          if (io) {
            io.to(party.code).emit('receive_message', { 
                room: party.code, 
                user: "System", 
                text: `${oldName} changed their name to ${newUsername}`, 
                type: "system_green" 
            });
          }
        }
      }
      socket.emit('username_updated', newUsername);
    } catch (err) {
      console.error("Failed to update username:", err);
    }
  });

};

module.exports = registerIdentifyHandler;