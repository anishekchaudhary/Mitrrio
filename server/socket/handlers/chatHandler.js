const activeGames = require('../state/activeGames');

const registerChatHandler = (socket, io) => {
  socket.on('join_global', () => socket.join('global'));
  socket.on('join_room', (room) => socket.join(room));

  socket.on('send_message', (msgData) => {
    const { room, user } = msgData;
    
    // --- SPECTATOR CHAT SEGREGATION LOGIC ---
    const game = activeGames.get(room);
    if (game && game.status === 'playing') {
       // Check if the sender is playing the game
       const isPlaying = game.activePlayers.some(p => p.username === user);
       
       if (!isPlaying) {
         // Sender is a spectator. Emit ONLY to the spectator sub-channel.
         io.to(`${room}_spectator`).emit('receive_message', msgData);
         return; 
       }
    }
    
    // If game is NOT active (lobby), or sender is a playing Player, everyone sees it.
    io.to(room).emit('receive_message', msgData);
  });
};

module.exports = registerChatHandler;