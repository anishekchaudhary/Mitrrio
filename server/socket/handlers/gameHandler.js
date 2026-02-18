const { handleWin, getGameState } = require('../services/gameService');
const { resetPartyReadiness, broadcastPartyUpdate } = require('../services/partyService');
const User = require('../../models/User');
const { calculateNewRatings } = require('../../utils/elo');

const registerGameHandler = (socket, io) => {
  
  // 1. Get Initial State
  socket.on('get_game_state', (roomCode) => {
    const gameState = getGameState(roomCode);
    if (gameState) socket.emit('game_update', gameState);
  });

  // 2. Handle Finish/Win Click
  socket.on('submit_win', async ({ roomCode, userId }) => {
    const updatedGame = handleWin(roomCode, userId);
    
    if (updatedGame) {
      // Broadcast live leaderboard update
      io.to(roomCode).emit('game_update', updatedGame);

      // 3. Logic when the match is officially over
      if (updatedGame.isFinished) {
        try {
          // A. Reset readiness in DB so users return to lobby as "Not Ready"
          await resetPartyReadiness(roomCode);
          
          // B. Pairwise Elo Calculation
          const finishedPlayers = updatedGame.finished;
          const userDocs = await User.find({ 
            _id: { $in: finishedPlayers.map(p => p.id).filter(id => !id.toString().startsWith('guest')) } 
          });

          const userMap = new Map(userDocs.map(u => [u._id.toString(), u]));

          for (let i = 0; i < finishedPlayers.length; i++) {
            const playerA = finishedPlayers[i];
            if (playerA.id.toString().startsWith('guest')) continue;

            let totalEloChange = 0;
            const userA = userMap.get(playerA.id.toString());
            const currentEloA = userA?.elo || 1200;

            for (let j = 0; j < finishedPlayers.length; j++) {
              if (i === j) continue;
              const playerB = finishedPlayers[j];
              const userB = userMap.get(playerB.id.toString());
              const currentEloB = userB?.elo || 1200;

              // Pairwise comparison: If A's rank is lower (1st vs 2nd), A won
              const { newWinnerRating, newLoserRating } = calculateNewRatings(currentEloA, currentEloB);
              
              const change = (playerA.rank < playerB.rank) 
                ? (newWinnerRating - currentEloA) 
                : (newLoserRating - currentEloA);
                
              totalEloChange += change;
            }

            // Average the Elo change across all opponents
            const finalEloChange = Math.round(totalEloChange / (finishedPlayers.length - 1));
            const updatedUser = await User.findByIdAndUpdate(
              playerA.id, 
              { $inc: { elo: finalEloChange, xp: 50 } }, 
              { new: true }
            );

            // Notify specific client to update their ProfileWidget
            io.to(roomCode).emit('elo_update', { 
              userId: playerA.id, 
              elo: updatedUser.elo, 
              change: finalEloChange 
            });
          }

          // C. Broadcast party update to reflect "Not Ready" states in Dashboard
          await broadcastPartyUpdate(roomCode, io);

          // D. Final System Message
          io.to(roomCode).emit('receive_message', {
            room: roomCode,
            user: "System",
            text: "🏁 Match Complete! Everyone finished. Ratings updated.",
            type: "system_green"
          });

        } catch (err) {
          console.error("Game Over Processing Error:", err);
        }
      }
    }
  });
};

module.exports = registerGameHandler;