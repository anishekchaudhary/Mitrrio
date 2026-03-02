const registerChatHandler = (socket, io) => {
  socket.on('send_message', (data) => {
    if (socket.rooms.has(data.room)) {
      io.to(data.room).emit('receive_message', data);
    }
  });
};

module.exports = registerChatHandler;
