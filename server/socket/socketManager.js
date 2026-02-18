const registerIdentifyHandler = require('./handlers/identifyHandler');
const registerChatHandler = require('./handlers/chatHandler');
const registerPartyHandler = require('./handlers/partyHandler');
const registerDisconnectHandler = require('./handlers/disconnectHandler');
const registerEloHandler = require('./handlers/eloHandler');

const socketManager = (io) => {
  io.on('connection', (socket) => {
    console.log('User Connected:', socket.id);

    socket.join('global');

    registerIdentifyHandler(socket, io);
    registerChatHandler(socket, io);
    registerPartyHandler(socket, io);
    registerDisconnectHandler(socket, io);
    registerEloHandler(socket, io);
  });
};

module.exports = socketManager;
