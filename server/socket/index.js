// --- IMPORT HANDLERS ---
const registerIdentifyHandler = require('./handlers/identifyHandler');
const registerChatHandler = require('./handlers/chatHandler');
const registerPartyHandler = require('./handlers/partyHandler');
const registerDisconnectHandler = require('./handlers/disconnectHandler');
const registerGameHandler = require('./handlers/gameHandler');
const registerMatchmakingHandler = require('./handlers/matchmakingHandler');
const registerEloHandler = require('./handlers/eloHandler'); // Brought over from socketManager.js

// --- IMPORT ADMIN HANDLERS (NEW) ---
const { registerAdminHandler, startAdminMetricsLoop } = require('./handlers/adminHandler');

// --- IMPORT LOOPS ---
const { startMatchmakingLoop } = require('./services/matchmakingService');
const { startGameTimerLoop } = require('./handlers/gameHandler');

const socketManager = (io) => {
  // 1. Start all background server loops
  startMatchmakingLoop(io);
  startGameTimerLoop(io);
  startAdminMetricsLoop(io); // Start the new admin health monitor

  io.on('connection', (socket) => {
    // Brought over from socketManager.js
    console.log('User Connected:', socket.id); 
    socket.join('global'); 

    // 2. Register all individual socket event listeners
    registerIdentifyHandler(socket, io);
    registerChatHandler(socket, io);
    registerPartyHandler(socket, io);
    registerDisconnectHandler(socket, io);
    registerGameHandler(socket, io);
    registerMatchmakingHandler(socket, io); 
    registerEloHandler(socket, io); 
    
    // Register the new Admin events
    registerAdminHandler(socket, io); 
  });
};

module.exports = socketManager;