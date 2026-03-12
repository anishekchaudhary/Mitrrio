const { handleRoll, handleHold, handleForfeit, checkTurnTimeouts } = require('../services/gameService');
const activeGames = require('../state/activeGames');
const pendingRemovals = require('../state/pendingRemovals');
const Party = require('../../models/Party');
const { resetPartyReadiness, broadcastPartyUpdate } = require('../services/partyService');
const User = require('../../models/User');
const Match = require('../../models/Match');

const registerGameHandler = (socket, io) => {
  
  socket.on('get_game_state', (roomCode) => {
    if (socket.userId && pendingRemovals.has(socket.userId)) {
        clearTimeout(pendingRemovals.get(socket.userId));
        pendingRemovals.delete(socket.userId);
    }
    const game = activeGames.get(roomCode);
    if (game) {
      socket.join(roomCode); 
      const isPlaying = game.activePlayers.some(p => p.id === socket.userId);
      if (!isPlaying) socket.join(`${roomCode}_spectator`);
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
      io.to(roomCode).emit('receive_message', { room: roomCode, user: "System", text: `Player disconnected and forfeited.`, type: "system_red" });
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

      const party = await Party.findOne({ code: roomCode });

      for (let i = 0; i < finishedPlayers.length; i++) {
        const playerA = finishedPlayers[i];
        const isGuest = playerA.id.toString().startsWith('guest');
        
        // STRICT FALLBACKS: Uses ?? to respect "0" xp and gamesPlayed
        let currentEloA = isGuest ? (playerA.elo ?? 1200) : (userMap.get(playerA.id.toString())?.elo ?? 1200);
        let currentXpA = isGuest ? (playerA.xp ?? 0) : (userMap.get(playerA.id.toString())?.xp ?? 0);
        let currentGamesA = isGuest ? (playerA.gamesPlayed ?? 0) : (userMap.get(playerA.id.toString())?.gamesPlayed ?? 0);

        let totalEloChange = 0;

        for (let j = 0; j < finishedPlayers.length; j++) {
          if (i === j) continue;
          const playerB = finishedPlayers[j];
          let currentEloB = playerB.id.toString().startsWith('guest') ? (playerB.elo ?? 1200) : (userMap.get(playerB.id.toString())?.elo ?? 1200);

          const expectedScoreA = 1 / (1 + Math.pow(10, (currentEloB - currentEloA) / 400));
          const actualScoreA = playerA.rank < playerB.rank ? 1 : 0; 
          totalEloChange += 32 * (actualScoreA - expectedScoreA);
        }

        const divisor = Math.max(1, finishedPlayers.length - 1);
        const finalEloChange = Math.round(totalEloChange / divisor);
        const rankBonus = Math.max(0, (finishedPlayers.length - playerA.rank) * 15);
        const xpGain = 50 + rankBonus;

        let newElo = currentEloA + finalEloChange;
        let newXp = currentXpA + xpGain;
        let newGames = currentGamesA + 1;

        if (!isGuest) {
            try {
                const updatedUser = await User.findByIdAndUpdate(
                  playerA.id, 
                  { $inc: { elo: finalEloChange, xp: xpGain, gamesPlayed: 1 } }, 
                  { returnDocument: 'after' } 
                );
                if (updatedUser) {
                    newElo = updatedUser.elo; 
                    newXp = updatedUser.xp; 
                    newGames = updatedUser.gamesPlayed;
                }
            } catch (dbErr) {
                console.error(`[DB Update Error]:`, dbErr);
            }
        }

        if (party) {
            const partyMember = party.members.find(m => m.id === playerA.id);
            if (partyMember) {
                partyMember.elo = newElo;
                partyMember.xp = newXp;
                partyMember.gamesPlayed = newGames;
            }
        }

        io.to(roomCode).emit('elo_update', { 
            userId: playerA.id, elo: newElo, xp: newXp, gamesPlayed: newGames, change: finalEloChange 
        });
      }

      try {
          const newMatch = new Match({
              roomCode: roomCode,
              players: finishedPlayers.map(p => ({
                  username: p.username,
                  score: p.score,
                  rank: p.rank
              }))
          });
          await newMatch.save();
      } catch (matchErr) {
          console.error("[Match Save Error]:", matchErr);
      }


      activeGames.delete(roomCode);

      if (party && party.type === 'public') {
         await Party.deleteOne({ code: roomCode });
         io.to(roomCode).emit('left_party');
      } else if (party) {
         party.markModified('members'); 
         await party.save(); 
         await broadcastPartyUpdate(roomCode, io);
      }

      io.to(roomCode).emit('show_leaderboard', { players: finishedPlayers });

    } catch (err) {
      console.error("[GameHandler Error]", err);
    }
  }
};

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