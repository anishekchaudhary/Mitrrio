const registerIdentifyHandler = require('./handlers/identifyHandler');
const registerPartyHandler = require('./handlers/partyHandler');
const registerChatHandler = require('./handlers/chatHandler');
const registerDisconnectHandler = require('./handlers/disconnectHandler');
const registerGameHandler = require('./handlers/gameHandler');
const registerMatchmakingHandler = require('./handlers/matchmakingHandler');

const { startMatchmakingLoop } = require('./services/matchmakingService');
// IMPORT THE TIMER LOOP
const { startGameTimerLoop } = require('./handlers/gameHandler');

const socketManager = (io) => {
  startMatchmakingLoop(io);
  startGameTimerLoop(io); // IGNITE THE TURN TIMER

  io.on('connection', (socket) => {
    // ... existing registers
    registerIdentifyHandler(socket, io);
    registerPartyHandler(socket, io);
    registerChatHandler(socket, io);
    registerDisconnectHandler(socket, io);
    registerGameHandler(socket, io);
    registerMatchmakingHandler(socket, io); 
  });
};

module.exports = socketManager;