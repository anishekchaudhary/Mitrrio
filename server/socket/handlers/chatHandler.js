const registerChatHandler = (socket, io) => {
  // Listeners to actually join the rooms
  socket.on('join_global', (room) => {
    socket.join(room); // room will be 'global'
  });

  socket.on('join_room', (room) => {
    socket.join(room);
  });

  socket.on('send_message', (data) => {
    // Fallback: If socket isn't in the room, join it before emitting
    if (!socket.rooms.has(data.room)) {
      socket.join(data.room);
    }
    io.to(data.room).emit('receive_message', data);
  });
};

module.exports = registerChatHandler;