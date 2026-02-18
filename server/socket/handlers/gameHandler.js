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
    console.log(`[GameHandler] User ${userId} submitted win in Room ${roomCode}`); // LOG 1
    const updatedGame = handleWin(roomCode, userId);
    
    if (updatedGame) {
      io.to(roomCode).emit('game_update', updatedGame);

      if (updatedGame.isFinished) {
        console.log(`[GameHandler] Game Finished in Room ${roomCode}. Starting calculations...`); // LOG 2
        try {
          await resetPartyReadiness(roomCode);
          
          const finishedPlayers = updatedGame.finished;
          
          // Pre-fetch Registered Users
          const registeredIds = finishedPlayers
            .map(p => p.id)
            .filter(id => !id.toString().startsWith('guest'));
            
          const userDocs = await User.find({ _id: { $in: registeredIds } });
          const userMap = new Map(userDocs.map(u => [u._id.toString(), u]));

          for (let i = 0; i < finishedPlayers.length; i++) {
            const playerA = finishedPlayers[i];
            const isGuest = playerA.id.toString().startsWith('guest');
            console.log(`[GameHandler] Processing Player: ${playerA.username} (${isGuest ? 'Guest' : 'User'})`); // LOG 3

            let totalEloChange = 0;
            let currentEloA = 1200;

            if (isGuest) {
                const gamePlayer = updatedGame.players.find(p => p.id === playerA.id);
                currentEloA = gamePlayer?.elo || 1200;
            } else {
                const userA = userMap.get(playerA.id.toString());
                currentEloA = userA?.elo || 1200;
            }

            // Pairwise Calculation
            for (let j = 0; j < finishedPlayers.length; j++) {
              if (i === j) continue;
              const playerB = finishedPlayers[j];
              const isGuestB = playerB.id.toString().startsWith('guest');
              
              let currentEloB = 1200;
              if (isGuestB) {
                  const gamePlayerB = updatedGame.players.find(p => p.id === playerB.id);
                  currentEloB = gamePlayerB?.elo || 1200;
              } else {
                  const userB = userMap.get(playerB.id.toString());
                  currentEloB = userB?.elo || 1200;
              }

              const { newWinnerRating, newLoserRating } = calculateNewRatings(currentEloA, currentEloB);
              
              const change = (playerA.rank < playerB.rank) 
                ? (newWinnerRating - currentEloA) 
                : (newLoserRating - currentEloA);
              totalEloChange += change;
            }

            const divisor = Math.max(1, finishedPlayers.length - 1);
            const finalEloChange = Math.round(totalEloChange / divisor);
            
            // XP Calculation
            const rankBonus = Math.max(0, (4 - playerA.rank) * 10);
            const xpGain = 50 + rankBonus;

            let newElo, newXp, newGames;

            if (isGuest) {
                const gamePlayer = updatedGame.players.find(p => p.id === playerA.id);
                newElo = (gamePlayer?.elo || 1200) + finalEloChange;
                newXp = (gamePlayer?.xp || 0) + xpGain;
                newGames = (gamePlayer?.gamesPlayed || 0) + 1;
                console.log(`[Guest Update] NewElo: ${newElo}, NewXP: ${newXp}`); // LOG 4 (Guest)
            } else {
                const updatedUser = await User.findByIdAndUpdate(
                  playerA.id, 
                  { 
                    $inc: { 
                      elo: finalEloChange, 
                      xp: xpGain,
                      gamesPlayed: 1
                    } 
                  }, 
                  { new: true }
                );
                newElo = updatedUser.elo;
                newXp = updatedUser.xp;
                newGames = updatedUser.gamesPlayed;
                console.log(`[DB Update] User: ${updatedUser.username}, Elo: ${newElo}, XP: ${newXp}, Games: ${newGames}`); // LOG 4 (DB)
            }

            // EMIT UPDATE
            const updatePayload = { 
              userId: playerA.id, 
              elo: newElo, 
              xp: newXp,
              gamesPlayed: newGames,
              change: finalEloChange 
            };
            
            console.log(`[Socket Emit] Sending elo_update to room ${roomCode}:`, updatePayload); // LOG 5
            
            io.to(roomCode).emit('elo_update', updatePayload);
          }

          await broadcastPartyUpdate(roomCode, io);
          io.to(roomCode).emit('receive_message', {
            room: roomCode,
            user: "System",
            text: "🏁 Match Complete! Ratings updated.",
            type: "system_green"
          });

        } catch (err) {
          console.error("[GameHandler Error]", err);
        }
      }
    }
  });
};

module.exports = registerGameHandler;