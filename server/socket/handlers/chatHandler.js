const registerChatHandler = (socket, io) => {
  // 1. Listen for explicit room joins from the frontend
  socket.on('join_global', (room) => {
    socket.join(room); // Joins 'global'
  });

  socket.on('join_room', (room) => {
    socket.join(room); // Joins 'PUB_XYZ' or private codes
  });

  socket.on('send_message', (data) => {
    // 2. Safety fallback: If they aren't in the room, force them in
    if (!socket.rooms.has(data.room)) {
      socket.join(data.room);
    }
    // 3. Broadcast the message to everyone in that room
    io.to(data.room).emit('receive_message', data);
  });
};

module.exports = registerChatHandler;