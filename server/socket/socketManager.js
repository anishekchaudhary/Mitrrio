const User = require('../models/User');
const Party = require('../models/Party');
const { calculateNewRatings } = require('../utils/elo');

const PLAYER_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#84cc16", "#10b981", 
  "#06b6d4", "#3b82f6", "#8b5cf6", "#d946ef", "#f43f5e"
];

// Map to track pending 30s removals (Key: userId, Value: timeoutID)
const pendingRemovals = new Map();

const socketManager = (io) => {

  // --- HELPER: Logic to remove a player from a party ---
  const handleActualLeave = async (userId, username, roomCode) => {
    try {
      const query = roomCode ? { code: roomCode } : { "members.id": userId };
      const party = await Party.findOne(query);
      
      if (party) {
        const actualCode = party.code;
        // Remove user from members list
        party.members = party.members.filter(m => m.id !== userId);
        
        if (party.members.length === 0) {
          await Party.findByIdAndDelete(party._id);
          console.log(`Party ${actualCode} destroyed (empty).`);
        } else {
          await party.save();
          
          // 1. Notify remaining members of new count
          io.to(actualCode).emit('party_update', {
            memberCount: party.members.length,
            maxSize: party.maxSize,
            members: party.members 
          });
          
          // 2. Send Chat Notification
          io.to(actualCode).emit('receive_message', { 
            room: actualCode, 
            user: "System", 
            text: `${username} disconnected.`, 
            type: "system" 
          });
        }

        // Clear currentParty in User DB (if registered)
        if (userId && !userId.toString().startsWith('guest')) {
          await User.findByIdAndUpdate(userId, { currentParty: null });
        }
      }
    } catch (err) {
      console.error("Leave Logic Error:", err);
    }
  };

  const getUniqueColor = (members) => {
    const usedColors = members.map(m => m.color);
    return PLAYER_COLORS.find(c => !usedColors.includes(c)) || '#94a3b8';
  };

  const broadcastPartyUpdate = async (roomCode) => {
    const party = await Party.findOne({ code: roomCode });
    if (party) {
      io.to(roomCode).emit('party_update', {
        memberCount: party.members.length,
        maxSize: party.maxSize,
        members: party.members 
      });
    }
  };

  io.on('connection', async (socket) => {
    console.log('User Connected:', socket.id);
    socket.join('global'); // Everyone joins global initially

    // ---------------------------------------------------------
    // 0. IDENTIFY (The Fix for Refresh/Reconnection)
    // ---------------------------------------------------------
    socket.on('identify', async (userId) => {
      socket.userId = userId; // Attach userId to this specific socket instance

      // A. Cancel pending removal if user came back within 30s
      if (pendingRemovals.has(userId)) {
        console.log(`User ${userId} reconnected. Cancelling removal.`);
        clearTimeout(pendingRemovals.get(userId));
        pendingRemovals.delete(userId);
      }

      // B. IMPORTANT: Check if user is already in a party in DB and Re-Join the Socket!
      // This fixes the issue where a refreshed page loses connection to the party chat/lobby
      try {
        const party = await Party.findOne({ "members.id": userId });
        if (party) {
          socket.join(party.code); // Re-join socket room
          socket.leave('global');  // Leave global
          
          // Send current state back to the reconnected user
          const me = party.members.find(m => m.id === userId);
          socket.emit('joined_party', { 
            roomName: party.code, 
            isPublic: party.type === 'public', 
            memberCount: party.members.length, 
            maxSize: party.maxSize, 
            myColor: me ? me.color : '#94a3b8' 
          });
        }
      } catch (err) {
        console.error("Rejoin Error:", err);
      }
    });

    // 1. CHAT
    socket.on('send_message', (data) => {
      if (socket.rooms.has(data.room)) {
        io.to(data.room).emit('receive_message', data);
      }
    });

    // 2. JOIN PUBLIC
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
        socket.emit('joined_party', { roomName: party.code, isPublic: true, memberCount: party.members.length, maxSize: party.maxSize, myColor });
        broadcastPartyUpdate(party.code);
        
        // Notify others
        io.to(party.code).emit('receive_message', { 
          room: party.code, user: "System", text: `${userData.username} joined!`, type: "system" 
        });

      } catch (err) { console.error(err); }
    });

    // 3. CREATE PRIVATE PARTY
    socket.on('create_party', async (userData) => {
      try {
        const userId = userData._id || userData.id || "host";
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const myColor = PLAYER_COLORS[0];

        const newParty = new Party({
          code, type: 'private', maxSize: 10,
          members: [{ id: userId, username: userData.username, isLeader: true, color: myColor }]
        });
        await newParty.save();

        if (userId && !userId.toString().startsWith('guest')) {
           await User.findByIdAndUpdate(userId, { currentParty: code });
        }

        socket.leave('global');
        socket.join(code);
        socket.emit('joined_party', { roomName: code, isPublic: false, memberCount: 1, maxSize: 10, myColor });
      } catch (err) { console.error(err); }
    });

    // 4. JOIN PRIVATE PARTY
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
        socket.emit('joined_party', { roomName: code, isPublic: false, memberCount: party.members.length, maxSize: party.maxSize, myColor });
        broadcastPartyUpdate(code);
        
        io.to(code).emit('receive_message', { 
          room: code, user: "System", text: `${userData.username} joined!`, type: "system" 
        });
      } catch (err) { console.error(err); }
    });

    // 5. MANUAL LEAVE (Instant Removal)
    socket.on('leave_party', async ({ user: userData, roomCode }) => {
      const userId = userData?._id || userData?.id;
      // If user manually leaves, cancel any pending disconnect timer
      if (userId && pendingRemovals.has(userId)) {
        clearTimeout(pendingRemovals.get(userId));
        pendingRemovals.delete(userId);
      }
      await handleActualLeave(userId, userData?.username, roomCode);
      socket.leave(roomCode);
      socket.join('global');
      socket.emit('left_party');
    });

    // ---------------------------------------------------------
    // 6. DISCONNECT (Delayed Removal - 30 Seconds)
    // ---------------------------------------------------------
    socket.on('disconnect', async () => {
      const userId = socket.userId;
      if (!userId) return;

      console.log(`User ${userId} disconnected. Waiting 30s...`);
      
      const timeout = setTimeout(async () => {
        console.log(`Timeout reached for ${userId}. Removing from party.`);
        // 1. Find the party they were in
        const party = await Party.findOne({ "members.id": userId });
        if (party) {
          const member = party.members.find(m => m.id === userId);
          // 2. Perform Removal and Notification
          await handleActualLeave(userId, member ? member.username : "User", party.code);
        }
        pendingRemovals.delete(userId);
      }, 30000); // 30 Seconds

      pendingRemovals.set(userId, timeout);
    });

    // 7. ELO UPDATES
    socket.on('game_end', async ({ winnerId, loserId }) => {
      try {
        const winnerDoc = await User.findById(winnerId);
        const loserDoc = await User.findById(loserId);

        const wElo = winnerDoc ? winnerDoc.elo : 1000;
        const lElo = loserDoc ? loserDoc.elo : 1000;

        const { newWinnerRating, newLoserRating } = calculateNewRatings(wElo, lElo);

        if (winnerDoc) {
          winnerDoc.elo = newWinnerRating;
          winnerDoc.xp = (winnerDoc.xp + 20) % 100;
          await winnerDoc.save();
        }
        if (loserDoc) {
          loserDoc.elo = newLoserRating;
          loserDoc.xp = (loserDoc.xp + 5) % 100;
          await loserDoc.save();
        }

        io.to(winnerId).emit('elo_update', { elo: newWinnerRating, xp: winnerDoc?.xp || 0, change: newWinnerRating - wElo });
        io.to(loserId).emit('elo_update', { elo: newLoserRating, xp: loserDoc?.xp || 0, change: newLoserRating - lElo });
      } catch (err) { console.error(err); }
    });
  });
};

module.exports = socketManager;