const Party = require('../../models/Party');
const User = require('../../models/User');
const { getUniqueColor, PLAYER_COLORS } = require('../services/colorService');
const { 
  handleActualLeave, 
  broadcastPartyUpdate, 
  removeUserFromAllParties // <--- IMPORT THIS
} = require('../services/partyService');
const pendingRemovals = require('../state/pendingRemovals');
const { createGame } = require('../services/gameService');
const countdownTimers = new Map();

const registerPartyHandler = (socket, io) => {

  const cancelCountdown = (partyCode) => {
    if (countdownTimers.has(partyCode)) {
      clearTimeout(countdownTimers.get(partyCode));
      countdownTimers.delete(partyCode);
      
      // Notify Chat (Red/Default Color)
      io.to(partyCode).emit('receive_message', {
        room: partyCode,
        user: "System",
        text: "Match start canceled.",
        type: "system"
      });
      
      // Reset Frontend State
      io.to(partyCode).emit('countdown_canceled');
    }
  };

  // --- HELPER: Start Countdown ---
  const startCountdown = async (partyCode) => {
    if (countdownTimers.has(partyCode)) clearTimeout(countdownTimers.get(partyCode));

    let count = 3;

    const runTimer = async () => {
      io.to(partyCode).emit('receive_message', {
        room: partyCode,
        user: "System",
        text: count > 0 ? `Starting game in ${count}...` : "Starting game!",
        type: "system_green"
      });

      if (count > 0) {
        count--;
        const timerId = setTimeout(runTimer, 1000);
        countdownTimers.set(partyCode, timerId);
      } else {
        countdownTimers.delete(partyCode);
        
        // --- NEW LOGIC START ---
        // Fetch latest party state to get accurate member list
        const party = await Party.findOne({ code: partyCode });
        if (party) {
            // Initialize Game Session in Memory
            createGame(partyCode, party.members);
            
            // Trigger Navigation
            io.to(partyCode).emit('game_start', { gameId: partyCode });
        }
        // --- NEW LOGIC END ---
      }
    };

    runTimer();
  };

  socket.on('sync_party_state', async (userData) => {
    try {
      const userId = userData._id || userData.id;
      // Find any party where this user is a member
      const party = await Party.findOne({ "members.id": userId });
      
      if (party) {
        // 1. Re-join the socket room (critical for receiving updates)
        socket.join(party.code);
        
        // 2. Send the "You are in a party" event to restore frontend UI
        socket.emit('joined_party', {
          roomName: party.code,
          isPublic: party.type === 'public',
          memberCount: party.members.length,
          maxSize: party.maxSize,
          myColor: party.members.find(m => m.id === userId)?.color,
          members: party.members
        });

        console.log(`[Sync] Restored user ${userId} to party ${party.code}`);
      }
    } catch (err) {
      console.error("Sync Error:", err);
    }
  });

  socket.on('join_public', async (userData) => {
    try {
      const userId = userData._id || userData.id;
      let party = await Party.findOne({ type: 'public', $expr: { $lt: [{ $size: "$members" }, 4] } });

      if (!party) {
        const code = `PUB_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        party = new Party({ code, type: 'public', maxSize: 4, members: [] });
      }

      const isMember = party.members.some(m => m.id === userId);
      let myColor = '#94a3b8';

      if (!isMember) {
        myColor = getUniqueColor(party.members);
        party.members.push({ id: userId, username: userData.username, color: myColor });
        await party.save();
      } else {
        myColor = party.members.find(m => m.id === userId).color;
      }

      if (userId && !userId.toString().startsWith('guest')) {
        await User.findByIdAndUpdate(userId, { currentParty: party.code });
      }

      socket.leave('global');
      socket.join(party.code);

      socket.emit('joined_party', {
        roomName: party.code,
        isPublic: true,
        memberCount: party.members.length,
        maxSize: party.maxSize,
        myColor
      });

      broadcastPartyUpdate(party.code, io);

      io.to(party.code).emit('receive_message', {
        room: party.code,
        user: "System",
        text: `${userData.username} joined!`,
        type: "system"
      });

    } catch (err) { console.error(err); }
  });

  socket.on('create_party', async (userData) => {
    try {
      const userId = userData._id || userData.id;
      
      // CLEANUP FIRST: Remove from any old parties
      await removeUserFromAllParties(userId, io);

      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const newParty = new Party({
        code,
        type: 'private',
        members: [{
          id: userId,
          username: userData.username,
          isLeader: true,
          color: '#ef4444', // Red
          isReady: false
        }]
      });

      await newParty.save();
      socket.join(code);
      
      socket.emit('joined_party', {
        roomName: code,
        isPublic: false,
        memberCount: 1,
        maxSize: 10,
        myColor: '#ef4444',
        members: newParty.members
      });
      
    } catch (err) {
      console.error(err);
      socket.emit('party_error', 'Failed to create party');
    }
  });

  // --- 2. JOIN PRIVATE ---
  socket.on('join_private', async ({ code, user }) => {
    try {
      const userId = user._id || user.id;

      // CLEANUP FIRST
      await removeUserFromAllParties(userId, io);

      const party = await Party.findOne({ code });
      if (!party) {
        socket.emit('party_error', 'Party not found');
        return;
      }

      if (party.members.length >= party.maxSize) {
        socket.emit('party_error', 'Party is full');
        return;
      }

      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
      const randomColor = colors[party.members.length % colors.length];

      party.members.push({
        id: userId,
        username: user.username,
        isLeader: false,
        color: randomColor,
        isReady: false
      });

      await party.save();
      socket.join(code);

      // Notify user
      socket.emit('joined_party', {
        roomName: code,
        isPublic: party.type === 'public',
        memberCount: party.members.length,
        maxSize: party.maxSize,
        myColor: randomColor,
        members: party.members
      });

      // Notify others
      broadcastPartyUpdate(code, io);

    } catch (err) {
      console.error(err);
      socket.emit('party_error', 'Failed to join party');
    }
  });

  socket.on('toggle_ready', async ({ roomCode, user }) => {
     try {
      const userId = user._id || user.id;
      const party = await Party.findOne({ code: roomCode });
      if (!party) return;
      const member = party.members.find(m => m.id === userId);
      if (member) {
        member.isReady = !member.isReady;
        await party.save();
        await broadcastPartyUpdate(roomCode, io);
        const allReady = party.members.length > 0 && party.members.every(m => m.isReady);
        if (allReady) {
          startCountdown(roomCode); // Calls the updated function above
        } else {
          cancelCountdown(roomCode);
        }
      }
    } catch (err) { console.error(err); }
  });
  
  socket.on('leave_party', async ({ user: userData, roomCode }) => {
      if (typeof cancelCountdown === 'function') cancelCountdown(roomCode); // Ensure helper is accessible
      // ... rest of leave logic from Step 2
      const userId = userData?._id || userData?.id;
      const pendingRemovals = require('../state/pendingRemovals');
      if (userId && pendingRemovals.has(userId)) {
        clearTimeout(pendingRemovals.get(userId));
        pendingRemovals.delete(userId);
      }
      await handleActualLeave(userId, userData?.username, roomCode, io);
      socket.leave(roomCode);
      socket.join('global');
      socket.emit('left_party');
  });
};

module.exports = registerPartyHandler;