const registerIdentifyHandler = require('./handlers/identifyHandler');
const registerPartyHandler = require('./handlers/partyHandler');
const registerChatHandler = require('./handlers/chatHandler');
const registerDisconnectHandler = require('./handlers/disconnectHandler');
// NEW IMPORT
const registerGameHandler = require('./handlers/gameHandler'); 

const socketManager = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    registerIdentifyHandler(socket, io);
    registerPartyHandler(socket, io);
    registerChatHandler(socket, io);
    registerDisconnectHandler(socket, io);
    // REGISTER NEW HANDLER
    registerGameHandler(socket, io); 
  });
};

module.exports = socketManager;