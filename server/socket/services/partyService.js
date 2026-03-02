const User = require('../../models/User');
const Party = require('../../models/Party');

const handleActualLeave = async (userId, username, roomCode, io) => {
  try {
    const query = roomCode ? { code: roomCode } : { "members.id": userId };
    const party = await Party.findOne(query);

    if (party) {
      const actualCode = party.code;
      party.members = party.members.filter(m => m.id !== userId);

      if (party.members.length === 0) {
        await Party.findByIdAndDelete(party._id);
        console.log(`Party ${actualCode} destroyed (empty).`);
      } else {
        await party.save();

        io.to(actualCode).emit('party_update', {
          memberCount: party.members.length,
          maxSize: party.maxSize,
          members: party.members
        });

        io.to(actualCode).emit('receive_message', {
          room: actualCode,
          user: "System",
          text: `${username} disconnected.`,
          type: "system"
        });
      }

      if (userId && !userId.toString().startsWith('guest')) {
        await User.findByIdAndUpdate(userId, { currentParty: null });
      }
    }
  } catch (err) {
    console.error("Leave Logic Error:", err);
  }
};

const broadcastPartyUpdate = async (roomCode, io) => {
  const Party = require('../../models/Party');
  const party = await Party.findOne({ code: roomCode });

  if (party) {
    io.to(roomCode).emit('party_update', {
      memberCount: party.members.length,
      maxSize: party.maxSize,
      members: party.members
    });
  }
};

module.exports = { handleActualLeave, broadcastPartyUpdate };
