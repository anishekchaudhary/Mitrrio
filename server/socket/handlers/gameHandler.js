const { handleRoll, handleHold, handleForfeit, checkTurnTimeouts } = require('../services/gameService');
const activeGames = require('../state/activeGames');
const pendingRemovals = require('../state/pendingRemovals');
const Party = require('../../models/Party');
const { resetPartyReadiness, broadcastPartyUpdate } = require('../services/partyService');
const User = require('../../models/User');
const { calculateNewRatings } = require('../../utils/elo');

const registerGameHandler = (socket, io) => {
  
  socket.on('get_game_state', (roomCode) => {
    // --- RECONNECT LOGIC: Clear disconnect timeout if they return ---
    if (socket.userId && pendingRemovals.has(socket.userId)) {
        clearTimeout(pendingRemovals.get(socket.userId));
        pendingRemovals.delete(socket.userId);
        console.log(`User ${socket.userId} reconnected safely.`);
    }

    const game = activeGames.get(roomCode);
    if (game) {
      socket.join(roomCode); 
      socket.emit('game_update', game);
    } else {
      socket.emit('game_update', null);
    }
  });

  socket.on('roll_dice', ({ roomCode, userId }) => {
    const result = handleRoll(roomCode, userId);
    if (result) {
      io.to(roomCode).emit('dice_rolled', { userId, roll: result.lastRoll });
      io.to(roomCode).emit('game_update', result.game);
    }
  });

  socket.on('hold_score', ({ roomCode, userId }) => {
    const updatedGame = handleHold(roomCode, userId);
    if (updatedGame) processGameState(io, roomCode, updatedGame);
  });

  socket.on('forfeit_game', ({ roomCode, userId }) => {
    const updatedGame = handleForfeit(roomCode, userId);
    if (updatedGame) {
      io.to(roomCode).emit('receive_message', { room: roomCode, user: "System", text: `Player disconnected and forfeited.`, type: "system" });
      processGameState(io, roomCode, updatedGame);
    }
  });
};

const processGameState = async (io, roomCode, game) => {
  io.to(roomCode).emit('game_update', game);

  if (game.status === 'finished') {
    io.to(roomCode).emit('receive_message', { room: roomCode, user: "System", text: "🏁 Game Over! Calculating ratings...", type: "system_green" });

    try {
      await resetPartyReadiness(roomCode);
      const finishedPlayers = game.finished;
      
      const registeredIds = finishedPlayers.map(p => p.id).filter(id => !id.toString().startsWith('guest'));
      const userDocs = await User.find({ _id: { $in: registeredIds } });
      const userMap = new Map(userDocs.map(u => [u._id.toString(), u]));

      for (let i = 0; i < finishedPlayers.length; i++) {
        const playerA = finishedPlayers[i];
        const isGuest = playerA.id.toString().startsWith('guest');
        let totalEloChange = 0;
        let currentEloA = isGuest ? 1200 : (userMap.get(playerA.id.toString())?.elo || 1200);

        for (let j = 0; j < finishedPlayers.length; j++) {
          if (i === j) continue;
          const playerB = finishedPlayers[j];
          let currentEloB = playerB.id.toString().startsWith('guest') ? 1200 : (userMap.get(playerB.id.toString())?.elo || 1200);

          const { newWinnerRating, newLoserRating } = calculateNewRatings(currentEloA, currentEloB);
          totalEloChange += (playerA.rank < playerB.rank) ? (newWinnerRating - currentEloA) : (newLoserRating - currentEloA);
        }

        const finalEloChange = Math.round(totalEloChange / Math.max(1, finishedPlayers.length - 1));
        const xpGain = 50 + Math.max(0, (4 - playerA.rank) * 10);

        let newElo = currentEloA + finalEloChange, newXp = xpGain, newGames = 1;

        if (!isGuest) {
            const updatedUser = await User.findByIdAndUpdate(
              playerA.id, { $inc: { elo: finalEloChange, xp: xpGain, gamesPlayed: 1 } }, { new: true }
            );
            newElo = updatedUser.elo; newXp = updatedUser.xp; newGames = updatedUser.gamesPlayed;
        }

        io.to(roomCode).emit('elo_update', { userId: playerA.id, elo: newElo, xp: newXp, gamesPlayed: newGames, change: finalEloChange });
      }

      await broadcastPartyUpdate(roomCode, io);
      io.to(roomCode).emit('show_leaderboard', { players: finishedPlayers });
      activeGames.delete(roomCode);

      // --- PUBLIC LOBBY AUTO-EXIT ---
      const party = await Party.findOne({ code: roomCode });
      if (party && party.type === 'public') {
         await Party.deleteOne({ code: roomCode });
         io.to(roomCode).emit('left_party'); // Forces frontend back to "menu" state
      }

    } catch (err) {
      console.error("[GameHandler Error]", err);
    }
  }
};

// --- THE GLOBAL TIMER ENGINE ---
const startGameTimerLoop = (io) => {
  setInterval(() => {
    const timeouts = checkTurnTimeouts();
    timeouts.forEach(({ roomCode, game, missedPlayerId }) => {
      io.to(roomCode).emit('dice_rolled', { userId: missedPlayerId, roll: 'SKIP' });
      io.to(roomCode).emit('receive_message', { room: roomCode, user: 'System', text: 'Turn skipped due to inactivity.', type: 'system_red' });
      io.to(roomCode).emit('game_update', game);
    });
  }, 1000);
};

module.exports = registerGameHandler;
module.exports.processGameState = processGameState; 
module.exports.startGameTimerLoop = startGameTimerLoop;