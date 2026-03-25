const Party = require('../../models/Party');
const User = require('../../models/User');
const { getUniqueColor } = require('../services/colorService');
const { 
  handleActualLeave, 
  broadcastPartyUpdate, 
  removeUserFromAllParties 
} = require('../services/partyService');
const { createGame } = require('../services/gameService');
const activeGames = require('../state/activeGames'); 

const countdownTimers = new Map();

const registerPartyHandler = (socket, io) => {

  const cancelCountdown = (partyCode) => {
    if (countdownTimers.has(partyCode)) {
      clearTimeout(countdownTimers.get(partyCode));
      countdownTimers.delete(partyCode);
      io.to(partyCode).emit('receive_message', { room: partyCode, user: "System", text: "Match start canceled.", type: "system" });
    }
  };

  const startCountdown = async (partyCode) => {
    if (countdownTimers.has(partyCode)) clearTimeout(countdownTimers.get(partyCode));
    let count = 3;

    const runTimer = async () => {
      io.to(partyCode).emit('receive_message', { room: partyCode, user: "System", text: count > 0 ? `Starting game in ${count}...` : "Starting game!", type: "system_green" });

      if (count > 0) {
        count--;
        countdownTimers.set(partyCode, setTimeout(runTimer, 1000));
      } else {
        countdownTimers.delete(partyCode);
        const party = await Party.findOne({ code: partyCode });
        if (party) {
            createGame(partyCode, party.members);
            io.to(partyCode).emit('game_start', { gameId: partyCode });
        }
      }
    };
    runTimer();
  };

  const getUserStats = async (userData) => {
    const userId = userData._id || userData.id;
    if (userId.toString().startsWith('guest')) {
        // Use ?? to respect 0 XP and 0 Games Played!
        return { 
            elo: userData.elo ?? 1200, 
            xp: userData.xp ?? 0, 
            gamesPlayed: userData.gamesPlayed ?? 0 
        };
    }
    const user = await User.findById(userId);
    if (user) return { elo: user.elo, xp: user.xp, gamesPlayed: user.gamesPlayed };
    return { elo: 1200, xp: 0, gamesPlayed: 0 };
  };

  socket.on('sync_party_state', async (userData) => {
    try {
      const userId = userData._id || userData.id;
      const party = await Party.findOne({ "members.id": userId });
      if (party) {
        socket.join(party.code);
        socket.emit('joined_party', {
          roomName: party.code, isPublic: party.type === 'public', memberCount: party.members.length,
          maxSize: party.maxSize, myColor: party.members.find(m => m.id === userId)?.color, members: party.members,
          isGameRunning: activeGames.has(party.code)
        });
      }
    } catch (err) { console.error("Sync Error:", err); }
  });

  socket.on('join_public', async (userData) => {
    try {
      const userId = userData._id || userData.id;
      await removeUserFromAllParties(userId, io);
      let party = await Party.findOne({ type: 'public', $expr: { $lt: [{ $size: "$members" }, 4] } });
      if (!party) {
        const code = `PUB_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        party = new Party({ code, type: 'public', maxSize: 4, members: [] });
      }
      const stats = await getUserStats(userData);
      const myColor = getUniqueColor(party.members);
      party.members.push({ id: userId, username: userData.username, color: myColor, isReady: false, isSpectator: false, ...stats });
      await party.save();
      socket.leave('global');
      socket.join(party.code);
      socket.emit('joined_party', { roomName: party.code, isPublic: true, memberCount: party.members.length, maxSize: party.maxSize, myColor, members: party.members, isGameRunning: activeGames.has(party.code) });
      broadcastPartyUpdate(party.code, io);
      io.to(party.code).emit('receive_message', { room: party.code, user: "System", text: `${userData.username} joined!`, type: "system" });
    } catch (err) { console.error(err); }
  });

  socket.on('create_party', async (userData) => {
    try {
      const userId = userData._id || userData.id;
      await removeUserFromAllParties(userId, io);
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const stats = await getUserStats(userData);
      const myColor = getUniqueColor([]); 
      const newParty = new Party({ code, type: 'private', maxSize: 10, members: [{ id: userId, username: userData.username, isLeader: true, color: myColor, isReady: false, isSpectator: false, ...stats }] });
      await newParty.save();
      socket.join(code);
      socket.emit('joined_party', { roomName: code, isPublic: false, memberCount: 1, maxSize: 10, myColor, members: newParty.members, isGameRunning: false });
    } catch (err) { socket.emit('party_error', 'Failed to create party'); }
  });

  socket.on('join_private', async ({ code, user }) => {
    try {
      const userId = user._id || user.id;
      await removeUserFromAllParties(userId, io);
      const party = await Party.findOne({ code });
      if (!party) return socket.emit('party_error', 'Party not found');
      if (party.members.length >= party.maxSize) return socket.emit('party_error', 'Party is full');
      const myColor = getUniqueColor(party.members); 
      const stats = await getUserStats(user);
      party.members.push({ id: userId, username: user.username, isLeader: false, color: myColor, isReady: false, isSpectator: false, ...stats });
      await party.save();
      socket.join(code);
      socket.emit('joined_party', { roomName: code, isPublic: false, memberCount: party.members.length, maxSize: party.maxSize, myColor, members: party.members, isGameRunning: activeGames.has(party.code) });
      broadcastPartyUpdate(code, io);
    } catch (err) { socket.emit('party_error', 'Failed to join party'); }
  });

  socket.on('toggle_ready', async ({ roomCode, user }) => {
    try {
      const userId = user._id || user.id;
      const party = await Party.findOne({ code: roomCode });
      if (!party) return;
      const member = party.members.find(m => m.id === userId);
      if (member) {
        const gameRunning = activeGames.has(roomCode);
        if (gameRunning) {
            if (!member.isReady) {
                socket.emit('party_error', 'Game in progress! You can only join as a Spectator.');
                return;
            } else {
                member.isReady = false;
                member.isSpectator = false;
            }
        } else {
            member.isReady = !member.isReady;
            if (!member.isReady) member.isSpectator = false;
        }
        party.markModified('members');
        await party.save();
        await broadcastPartyUpdate(roomCode, io);
        if (!gameRunning) {
            const activePlayers = party.members.filter(m => !m.isSpectator);
            const allReady = party.members.length > 0 && party.members.every(m => m.isReady);
            if (allReady && activePlayers.length >= 2) startCountdown(roomCode);
            else cancelCountdown(roomCode);
        }
      }
    } catch (err) { console.error(err); }
  });

  socket.on('set_spectator', async ({ roomCode, userId }) => {
    try {
      const party = await Party.findOne({ code: roomCode });
      if (!party) return;
      const member = party.members.find(m => m.id === userId);
      if (member) {
        member.isSpectator = true;
        member.isReady = true; 
        party.markModified('members');
        await party.save();
        await broadcastPartyUpdate(roomCode, io);
        
        const gameRunning = activeGames.has(roomCode);
        if (gameRunning) {
            socket.emit('game_start', { gameId: roomCode });
        } else {
            const activePlayers = party.members.filter(m => !m.isSpectator);
            const allReady = party.members.length > 0 && party.members.every(m => m.isReady);
            if (allReady && activePlayers.length >= 2) startCountdown(roomCode);
            else cancelCountdown(roomCode);
        }
      }
    } catch (err) { console.error(err); }
  });

  socket.on('leave_arena', async ({ roomCode, userId }) => {
    try {
      const party = await Party.findOne({ code: roomCode });
      if (party) {
          const member = party.members.find(m => m.id === userId);
          if (member) {
              member.isReady = false;
              member.isSpectator = false;
              party.markModified('members');
              await party.save();
              await broadcastPartyUpdate(roomCode, io);
          }
      }
    } catch (err) { console.error(err); }
  });
  
  socket.on('leave_party', async ({ user: userData, roomCode }) => {
      cancelCountdown(roomCode);
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