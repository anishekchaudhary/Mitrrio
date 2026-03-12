const User = require('../../models/User');
const { broadcastPartyUpdate } = require('../services/partyService');

const registerIdentifyHandler = (socket, io) => {
  socket.on('identify', (userId) => {
    socket.userId = userId;
    console.log(`User identified: ${userId}`);
  });

  socket.on('update_username', async ({ userId, newUsername }) => {
    try {
      // 1. If it's a registered user, update the DB
      if (userId && !userId.toString().startsWith('guest')) {
        await User.findByIdAndUpdate(userId, { username: newUsername });
      }

      // 2. Update the socket's internal reference
      socket.username = newUsername;

      // 3. Find if the user is in a party and update everyone
      const Party = require('../../models/Party');
      const party = await Party.findOne({ "members.id": userId });
      
      if (party) {
        const member = party.members.find(m => m.id === userId);
        if (member) {
          member.username = newUsername;
          party.markModified('members');
          await party.save();
          await broadcastPartyUpdate(party.code, io);
        }
      }

      socket.emit('username_updated', newUsername);
    } catch (err) {
      console.error("Failed to update username:", err);
    }
  });
};

// --- CRITICAL FIX: Ensure this line exists ---
module.exports = registerIdentifyHandler;