const Party = require('../../models/Party');
const User = require('../../models/User');
const { getUniqueColor, PLAYER_COLORS } = require('../services/colorService');
const { handleActualLeave, broadcastPartyUpdate } = require('../services/partyService');
const pendingRemovals = require('../state/pendingRemovals');
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
  const startCountdown = (partyCode) => {
    if (countdownTimers.has(partyCode)) clearTimeout(countdownTimers.get(partyCode));

    let count = 3;

    const runTimer = () => {
      // Broadcast to Chat with GREEN type
      io.to(partyCode).emit('receive_message', {
        room: partyCode,
        user: "System",
        text: count > 0 ? `Starting game in ${count}...` : "Starting game!",
        type: "system_green" // <--- NEW TYPE FOR GREEN COLOR
      });

      if (count > 0) {
        count--;
        const timerId = setTimeout(runTimer, 1000);
        countdownTimers.set(partyCode, timerId);
      } else {
        countdownTimers.delete(partyCode);
        // Trigger Game Start
        io.to(partyCode).emit('game_start', { gameId: partyCode });
      }
    };

    runTimer();
  };

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
      const userId = userData._id || userData.id || "host";
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const myColor = PLAYER_COLORS[0];

      const newParty = new Party({
        code,
        type: 'private',
        maxSize: 10,
        members: [{ id: userId, username: userData.username, isLeader: true, color: myColor }]
      });

      await newParty.save();

      if (userId && !userId.toString().startsWith('guest')) {
        await User.findByIdAndUpdate(userId, { currentParty: code });
      }

      socket.leave('global');
      socket.join(code);

      socket.emit('joined_party', {
        roomName: code,
        isPublic: false,
        memberCount: 1,
        maxSize: 10,
        myColor
      });

    } catch (err) { console.error(err); }
  });

  socket.on('join_private', async ({ code, user: userData }) => {
    try {
      const party = await Party.findOne({ code });
      if (!party) return socket.emit('party_error', 'Invalid code.');
      if (party.members.length >= party.maxSize) return socket.emit('party_error', 'Party full.');

      const userId = userData._id || userData.id;
      let myColor = '#94a3b8';

      if (!party.members.some(m => m.id === userId)) {
        myColor = getUniqueColor(party.members);
        party.members.push({ id: userId, username: userData.username, color: myColor });
        await party.save();

        if (userId && !userId.toString().startsWith('guest')) {
          await User.findByIdAndUpdate(userId, { currentParty: code });
        }
      } else {
        myColor = party.members.find(m => m.id === userId).color;
      }

      socket.leave('global');
      socket.join(code);

      socket.emit('joined_party', {
        roomName: code,
        isPublic: false,
        memberCount: party.members.length,
        maxSize: party.maxSize,
        myColor
      });

      broadcastPartyUpdate(code, io);

      io.to(code).emit('receive_message', {
        room: code,
        user: "System",
        text: `${userData.username} joined!`,
        type: "system"
      });

    } catch (err) { console.error(err); }
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

        // Check if everyone is ready
        const allReady = party.members.length > 0 && party.members.every(m => m.isReady);

        if (allReady) {
          startCountdown(roomCode);
        } else {
          // If someone un-readies, cancel it
          cancelCountdown(roomCode);
        }
      }
    } catch (err) {
      console.error("Ready Error:", err);
    }
  });

  // --- UPDATED: Leave Party ---
  socket.on('leave_party', async ({ user: userData, roomCode }) => {
    // 1. Cancel Countdown first
    cancelCountdown(roomCode);

    // 2. Proceed with leave logic
    const userId = userData?._id || userData?.id;
    const pendingRemovals = require('../state/pendingRemovals'); // Ensure this is imported at top if not already

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