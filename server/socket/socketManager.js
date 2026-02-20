const User = require('../models/User');
const Party = require('../models/Party');

const socketManager = (io) => {
  // Helper: Notify all clients in a room about the new member count
  const broadcastPartyUpdate = async (roomCode) => {
    const party = await Party.findOne({ code: roomCode });
    if (party) {
      io.to(roomCode).emit('party_update', {
        memberCount: party.members.length,
        maxSize: party.maxSize
      });
    }
  };

  io.on('connection', async (socket) => {
    console.log('User Connected:', socket.id);
    
    // 1. Auto-Join Global Chat
    socket.join('global');

    // --- Chat Logic ---
    socket.on('join_room', (room) => {
      // Optional: If joining specific room via ChatWidget, ensure we handle switches
      // For now, Party logic handles the heavy lifting of switching rooms
      socket.join(room);
    });

    socket.on('send_message', (data) => {
      // Security: Ensure user is actually in the room they are sending to
      if (socket.rooms.has(data.room)) {
        io.to(data.room).emit('receive_message', data);
      }
    });

    // --- Party Logic ---

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
        if (!isMember) {
          party.members.push({ id: userId, username: userData.username });
          await party.save();
        }

        if (userId && !userId.toString().startsWith('guest')) {
          await User.findByIdAndUpdate(userId, { currentParty: party.code });
        }

        // Room Switch Logic: Leave Global, Join Party
        socket.leave('global'); 
        socket.join(party.code);
        
        socket.emit('joined_party', { 
          roomName: party.code, 
          isPublic: true,
          memberCount: party.members.length,
          maxSize: party.maxSize
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

        const newParty = new Party({
          code,
          type: 'private',
          maxSize: 10,
          members: [{ id: userId, username: userData.username, isLeader: true }]
        });

        await newParty.save();

        if (userId && !userId.toString().startsWith('guest')) {
           await User.findByIdAndUpdate(userId, { currentParty: code });
        }

        // Room Switch Logic
        socket.leave('global');
        socket.join(code);

        socket.emit('joined_party', { 
          roomName: code, 
          isPublic: false,
          memberCount: 1,
          maxSize: 10
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
        
        const isMember = party.members.some(m => m.id === userId);
        if (!isMember) {
          party.members.push({ id: userId, username: userData.username });
          await party.save();
          
          if (userId && !userId.toString().startsWith('guest')) {
            await User.findByIdAndUpdate(userId, { currentParty: code });
          }
        }

        // Room Switch Logic
        socket.leave('global');
        socket.join(code);
        
        socket.emit('joined_party', { 
          roomName: code, 
          isPublic: false,
          memberCount: party.members.length,
          maxSize: party.maxSize
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

    // 4. LEAVE PARTY (Fixed)
    socket.on('leave_party', async ({ user: userData, roomCode }) => {
      // 1. Immediate Socket Cleanup (Vital for UI responsiveness)
      if (roomCode) {
        socket.leave(roomCode);
        console.log(`Socket ${socket.id} left room ${roomCode}`);
      }
      
      // 2. Return to Global
      socket.join('global');
      socket.emit('left_party'); // Tell frontend to switch UI

      // 3. Database Cleanup
      if (!userData) return;
      try {
        const userId = userData._id || userData.id;
        // Use provided roomCode to find party, fallback to DB search
        const query = roomCode ? { code: roomCode } : { "members.id": userId };
        const party = await Party.findOne(query);
        
        if (party) {
          const actualCode = party.code;
          party.members = party.members.filter(m => m.id !== userId);
          
          if (party.members.length === 0) {
            await Party.findByIdAndDelete(party._id);
            console.log(`Party ${actualCode} destroyed.`);
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