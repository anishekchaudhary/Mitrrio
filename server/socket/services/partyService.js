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

const removeUserFromAllParties = async (userId, io) => {
  try {
    // Find all parties where this user is a member
    const parties = await Party.find({ "members.id": userId });
    
    for (const party of parties) {
      console.log(`[Cleanup] Removing user ${userId} from old party ${party.code}`);
      
      // Use the existing leave logic to handle cleanup/deletion/broadcast
      // passing 'io' ensures the old lobby UI updates for other players
      await handleActualLeave(userId, null, party.code, io);
    }
  } catch (err) {
    console.error("Remove from all parties error:", err);
  }
};const broadcastPartyUpdate = async (roomCode, io) => {
   // ... keep existing logic
   try {
    const party = await Party.findOne({ code: roomCode });
    if (party) {
      io.to(roomCode).emit('party_update', {
        roomName: party.code,
        isPublic: party.type === 'public',
        memberCount: party.members.length,
        maxSize: party.maxSize,
        members: party.members // Ensure members are sent
      });
    }
  } catch (err) {
    console.error("Broadcast Error:", err);
  }
};

const resetPartyReadiness = async (roomCode) => {
  // ... keep existing logic
   try {
    await Party.findOneAndUpdate(
      { code: roomCode },
      { $set: { "members.$[].isReady": false } }
    );
  } catch (err) { console.error(err); }
};

module.exports = { 
  handleActualLeave, 
  broadcastPartyUpdate, 
  resetPartyReadiness,
  removeUserFromAllParties // <--- EXPORT THIS
};