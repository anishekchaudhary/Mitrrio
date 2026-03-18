const registerIdentifyHandler = require('./handlers/identifyHandler');
const registerPartyHandler = require('./handlers/partyHandler');
const registerChatHandler = require('./handlers/chatHandler');
const registerDisconnectHandler = require('./handlers/disconnectHandler');
const registerGameHandler = require('./handlers/gameHandler');
// IMPORT THE MATCHMAKING FILES
const registerMatchmakingHandler = require('./handlers/matchmakingHandler');
const { startMatchmakingLoop } = require('./services/matchmakingService');

const socketManager = (io) => {
  // 1. IGNITE THE MATCHMAKING LOOP (Runs every 3 seconds)
  startMatchmakingLoop(io);

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    registerIdentifyHandler(socket, io);
    registerPartyHandler(socket, io);
    registerChatHandler(socket, io);
    registerDisconnectHandler(socket, io);
    registerGameHandler(socket, io);
    // 2. REGISTER THE MATCHMAKING LISTENER
    registerMatchmakingHandler(socket, io); 
  });
};

module.exports = socketManager;