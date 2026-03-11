const registerIdentifyHandler = require('./handlers/identifyHandler');
const registerPartyHandler = require('./handlers/partyHandler');
const registerChatHandler = require('./handlers/chatHandler');
const registerDisconnectHandler = require('./handlers/disconnectHandler');
const registerMatchmakingHandler = require('./handlers/matchmakingHandler'); 
const { startMatchmakingLoop } = require('./services/matchmakingService');
const registerGameHandler = require('./handlers/gameHandler'); 

const socketManager = (io) => {
  startMatchmakingLoop(io); // START THE QUEUE LOOP

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    registerIdentifyHandler(socket, io);
    registerPartyHandler(socket, io);
    registerChatHandler(socket, io);
    registerMatchmakingHandler(socket, io); // REGISTER NEW HANDLER
    registerDisconnectHandler(socket, io);
    registerGameHandler(socket, io); 
  });
};

module.exports = socketManager;