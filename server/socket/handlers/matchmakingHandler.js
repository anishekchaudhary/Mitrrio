const { joinQueue, leaveQueue } = require('../services/matchmakingService');

const registerMatchmakingHandler = (socket, io) => {
  socket.on('find_match', (user) => {
    joinQueue(user, socket, io);
  });

  socket.on('cancel_match', (user) => {
    const userId = user._id || user.id;
    leaveQueue(userId);
  });
};

module.exports = registerMatchmakingHandler;