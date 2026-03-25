const User = require('../../models/User');
const Party = require('../../models/Party');
const activeGames = require('../state/activeGames'); 

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
          roomName: actualCode,
          memberCount: party.members.length,
          maxSize: party.maxSize,
          members: party.members,
          isGameRunning: activeGames.has(actualCode)
        });

        io.to(actualCode).emit('receive_message', { room: actualCode, user: "System", text: `${username || "A player"} disconnected.`, type: "system" });
      }

      if (userId && !userId.toString().startsWith('guest')) {
        await User.findByIdAndUpdate(userId, { currentParty: null });
      }
    }
  } catch (err) { console.error("Leave Logic Error:", err); }
};

const removeUserFromAllParties = async (userId, io) => {
  try {
    const parties = await Party.find({ "members.id": userId });
    for (const party of parties) {
      await handleActualLeave(userId, null, party.code, io);
    }
  } catch (err) { console.error("Remove from all parties error:", err); }
};

const broadcastPartyUpdate = async (roomCode, io) => {
  try {
    const party = await Party.findOne({ code: roomCode });
    if (party) {
      io.to(roomCode).emit('party_update', {
        roomName: party.code,
        isPublic: party.type === 'public',
        memberCount: party.members.length,
        maxSize: party.maxSize,
        members: party.members,
        isGameRunning: activeGames.has(roomCode)
      });
    }
  } catch (err) { console.error("Broadcast Error:", err); }
};

const resetPartyReadiness = async (roomCode) => {
  try {
    await Party.findOneAndUpdate(
      { code: roomCode },
      { $set: { "members.$[].isReady": false, "members.$[].isSpectator": false } } 
    );
  } catch (err) { console.error("Reset Readiness Error:", err); }
};

module.exports = { handleActualLeave, broadcastPartyUpdate, resetPartyReadiness, removeUserFromAllParties };