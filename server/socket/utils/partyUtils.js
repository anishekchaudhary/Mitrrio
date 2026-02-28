const Party = require('../../models/Party');
const User = require('../../models/User');

const broadcastPartyUpdate = async (io, roomCode) => {
  const party = await Party.findOne({ code: roomCode });
  if (!party) return;

  io.to(roomCode).emit('party_update', {
    memberCount: party.members.length,
    maxSize: party.maxSize,
    members: party.members
  });
};

const handleActualLeave = async (io, userId, username, roomCode) => {
  try {
    const query = roomCode ? { code: roomCode } : { "members.id": userId };
    const party = await Party.findOne(query);

    if (!party) return;

    const actualCode = party.code;
    party.members = party.members.filter(m => m.id !== userId);

    if (party.members.length === 0) {
      await Party.findByIdAndDelete(party._id);
    } else {
      await party.save();

      await broadcastPartyUpdate(io, actualCode);

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

  } catch (err) {
    console.error("Leave Logic Error:", err);
  }
};

module.exports = { broadcastPartyUpdate, handleActualLeave };
