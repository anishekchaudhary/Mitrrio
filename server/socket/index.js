const identifyHandler = require('./handlers/identifyHandler');
const chatHandler = require('./handlers/chatHandler');
const partyHandler = require('./handlers/partyHandler');
const disconnectHandler = require('./handlers/disconnectHandler');
const eloHandler = require('./handlers/eloHandler');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('User Connected:', socket.id);
    socket.join('global');

    identifyHandler(io, socket);
    chatHandler(io, socket);
    partyHandler(io, socket);
    disconnectHandler(io, socket);
    eloHandler(io, socket);
  });
};
