const { handleWin, getGameState } = require('../services/gameService');
const { resetPartyReadiness, broadcastPartyUpdate } = require('../services/partyService');
const User = require('../../models/User');
const { calculateNewRatings } = require('../../utils/elo');

const registerGameHandler = (socket, io) => {
  
  socket.on('get_game_state', (roomCode) => {
    const gameState = getGameState(roomCode);
    if (gameState) socket.emit('game_update', gameState);
  });

  socket.on('submit_win', async ({ roomCode, userId }) => {
    const updatedGame = handleWin(roomCode, userId);
    
    if (updatedGame) {
      io.to(roomCode).emit('game_update', updatedGame);

      if (updatedGame.isFinished) {
        try {
          await resetPartyReadiness(roomCode);
          
          const finishedPlayers = updatedGame.finished;
          
          // Get registered users (exclude guests)
          const registeredIds = finishedPlayers
            .map(p => p.id)
            .filter(id => !id.toString().startsWith('guest'));

          const userDocs = await User.find({ _id: { $in: registeredIds } });
          const userMap = new Map(userDocs.map(u => [u._id.toString(), u]));

          for (let i = 0; i < finishedPlayers.length; i++) {
            const playerA = finishedPlayers[i];
            
            // Skip guests for DB updates
            if (playerA.id.toString().startsWith('guest')) continue;

            let totalEloChange = 0;
            const userA = userMap.get(playerA.id.toString());
            const currentEloA = userA?.elo || 1200;

            // 1. Calculate Elo Change
            for (let j = 0; j < finishedPlayers.length; j++) {
              if (i === j) continue;
              const playerB = finishedPlayers[j];
              const userB = userMap.get(playerB.id.toString());
              const currentEloB = userB?.elo || 1200;

              const { newWinnerRating, newLoserRating } = calculateNewRatings(currentEloA, currentEloB);
              
              const change = (playerA.rank < playerB.rank) 
                ? (newWinnerRating - currentEloA) 
                : (newLoserRating - currentEloA);
                
              totalEloChange += change;
            }

            const divisor = Math.max(1, finishedPlayers.length - 1);
            const finalEloChange = Math.round(totalEloChange / divisor);

            // 2. Calculate XP Gain (Bonus for Rank 1, 2, 3)
            // Base 50XP + Bonus
            const rankBonus = Math.max(0, (4 - playerA.rank) * 10); // 1st:+30, 2nd:+20, 3rd:+10
            const xpGain = 50 + rankBonus;

            // 3. Update DB
            const updatedUser = await User.findByIdAndUpdate(
              playerA.id, 
              { 
                $inc: { 
                  elo: finalEloChange, 
                  xp: xpGain,
                  gamesPlayed: 1 // Increment Games Played
                } 
              }, 
              { new: true }
            );

            // 4. Emit Update to Client
            // We send gamesPlayed and new XP so the profile widget updates instantly
            io.to(roomCode).emit('elo_update', { 
              userId: playerA.id, 
              elo: updatedUser.elo, 
              xp: updatedUser.xp,
              gamesPlayed: updatedUser.gamesPlayed,
              change: finalEloChange 
            });
          }

          await broadcastPartyUpdate(roomCode, io);

          io.to(roomCode).emit('receive_message', {
            room: roomCode,
            user: "System",
            text: "🏁 Match Complete! Profiles updated.",
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