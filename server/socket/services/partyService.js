const User = require('../../models/User');
const Party = require('../../models/Party');

/**
 * Handles the logic for a user leaving a party, including DB cleanup
 * and broadcasting updates to remaining members.
 */
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

        // Broadcast current state to remaining members
        io.to(actualCode).emit('party_update', {
          roomName: actualCode,
          memberCount: party.members.length,
          maxSize: party.maxSize,
          members: party.members
        });

        io.to(actualCode).emit('receive_message', {
          room: actualCode,
          user: "System",
          text: `${username || "A player"} disconnected.`,
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

/**
 * Forcefully removes a user from any and all parties they are currently in.
 * Essential for preventing "ghost" memberships in multiple lobbies.
 */
const removeUserFromAllParties = async (userId, io) => {
  try {
    const parties = await Party.find({ "members.id": userId });
    for (const party of parties) {
      console.log(`[Cleanup] Removing user ${userId} from old party ${party.code}`);
      await handleActualLeave(userId, null, party.code, io);
    }
  } catch (err) {
    console.error("Remove from all parties error:", err);
  }
};

/**
 * Fetches the latest party state and broadcasts it to the room.
 */
const broadcastPartyUpdate = async (roomCode, io) => {
  try {
    const party = await Party.findOne({ code: roomCode });
    if (party) {
      io.to(roomCode).emit('party_update', {
        roomName: party.code,
        isPublic: party.type === 'public',
        memberCount: party.members.length,
        maxSize: party.maxSize,
        members: party.members
      });
    }
  } catch (err) {
    console.error("Broadcast Error:", err);
  }
};

/**
 * Resets the 'isReady' status to false for all members in a party.
 */
const resetPartyReadiness = async (roomCode) => {
  try {
    await Party.findOneAndUpdate(
      { code: roomCode },
      { $set: { "members.$[].isReady": false } }
    );
    console.log(`[PartyService] Readiness reset for room ${roomCode}`);
  } catch (err) {
    console.error("Reset Readiness Error:", err);
  }
};

module.exports = { 
  handleActualLeave, 
  broadcastPartyUpdate, 
  resetPartyReadiness,
  removeUserFromAllParties 
};