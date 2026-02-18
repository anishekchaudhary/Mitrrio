const User = require('../models/User');
const Party = require('../models/Party');

const PLAYER_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#84cc16", "#10b981", 
  "#06b6d4", "#3b82f6", "#8b5cf6", "#d946ef", "#f43f5e"
];

const socketManager = (io) => {
  // Helper: Get first unused color
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
    socket.join('global');

    socket.on('send_message', (data) => {
      if (socket.rooms.has(data.room)) {
        io.to(data.room).emit('receive_message', data);
      }
    });

    // 1. JOIN PUBLIC
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
          const member = party.members.find(m => m.id === userId);
          myColor = member.color;
        }

        if (userId && !userId.toString().startsWith('guest')) {
          await User.findByIdAndUpdate(userId, { currentParty: party.code });
        }

        socket.leave('global'); 
        socket.join(party.code);
        
        // EMIT MYCOLOR HERE
        socket.emit('joined_party', { 
          roomName: party.code, 
          isPublic: true,
          memberCount: party.members.length,
          maxSize: party.maxSize,
          myColor: myColor 
        });

        broadcastPartyUpdate(party.code);
        
        io.to(party.code).emit('receive_message', { 
          room: party.code, user: "System", text: `${userData.username} joined!`, type: "system" 
        });

      } catch (err) {
        console.error(err);
        socket.emit('party_error', 'Failed to join public match.');
      }
    });

    // 2. CREATE PRIVATE PARTY
    socket.on('create_party', async (userData) => {
      try {
        const userId = userData._id || userData.id || "host";
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const myColor = PLAYER_COLORS[0]; // Host gets first color

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
          myColor: myColor
        });

      } catch (err) {
        console.error(err);
        socket.emit('party_error', 'Could not create party.');
      }
    });

    // 3. JOIN PRIVATE PARTY
    socket.on('join_private', async ({ code, user: userData }) => {
      try {
        const party = await Party.findOne({ code });
        if (!party) return socket.emit('party_error', 'Invalid code.');
        if (party.members.length >= party.maxSize) return socket.emit('party_error', 'Party full.');

        const userId = userData._id || userData.id;
        let myColor = '#94a3b8';

        const isMember = party.members.some(m => m.id === userId);
        if (!isMember) {
          myColor = getUniqueColor(party.members);
          party.members.push({ id: userId, username: userData.username, color: myColor });
          await party.save();
          
          if (userId && !userId.toString().startsWith('guest')) {
            await User.findByIdAndUpdate(userId, { currentParty: code });
          }
        } else {
           const member = party.members.find(m => m.id === userId);
           myColor = member.color;
        }

        socket.leave('global');
        socket.join(code);
        
        socket.emit('joined_party', { 
          roomName: code, 
          isPublic: false,
          memberCount: party.members.length,
          maxSize: party.maxSize,
          myColor: myColor
        });

        broadcastPartyUpdate(code);
        
        io.to(code).emit('receive_message', { 
          room: code, user: "System", text: `${userData.username} joined!`, type: "system" 
        });

      } catch (err) {
        console.error(err);
        socket.emit('party_error', 'Error joining party.');
      }
    });

    // 4. LEAVE PARTY
    socket.on('leave_party', async ({ user: userData, roomCode }) => {
      if (roomCode) socket.leave(roomCode);
      socket.join('global');
      socket.emit('left_party'); 

      if (!userData) return;
      try {
        const userId = userData._id || userData.id;
        const query = roomCode ? { code: roomCode } : { "members.id": userId };
        const party = await Party.findOne(query);
        
        if (party) {
          const actualCode = party.code;
          party.members = party.members.filter(m => m.id !== userId);
          
          if (party.members.length === 0) {
            await Party.findByIdAndDelete(party._id);
          } else {
            await party.save();
            broadcastPartyUpdate(actualCode);
            io.to(actualCode).emit('receive_message', { 
              room: actualCode, user: "System", text: `${userData.username} left.`, type: "system" 
            });
          }
          if (userId && !userId.toString().startsWith('guest')) {
            await User.findByIdAndUpdate(userId, { currentParty: null });
          }
        }
      } catch (err) {
        console.error("Leave Party DB Error:", err);
      }
    });

    socket.on('disconnect', () => {
      console.log('User Disconnected:', socket.id);
    });
  });
};

module.exports = socketManager;