const User = require('../../models/User');
const { calculateNewRatings } = require('../../utils/elo');

module.exports = (io, socket) => {

  socket.on('game_end', async ({ winnerId, loserId }) => {
    try {
      const winnerDoc = await User.findById(winnerId);
      const loserDoc = await User.findById(loserId);

      const wElo = winnerDoc ? winnerDoc.elo : 1000;
      const lElo = loserDoc ? loserDoc.elo : 1000;

      const { newWinnerRating, newLoserRating } = calculateNewRatings(wElo, lElo);

      if (winnerDoc) {
        winnerDoc.elo = newWinnerRating;
        winnerDoc.xp = (winnerDoc.xp + 20) % 100;
        await winnerDoc.save();
      }

      if (loserDoc) {
        loserDoc.elo = newLoserRating;
        loserDoc.xp = (loserDoc.xp + 5) % 100;
        await loserDoc.save();
      }

      io.to(winnerId).emit('elo_update', {
        elo: newWinnerRating,
        xp: winnerDoc?.xp || 0,
        change: newWinnerRating - wElo
      });

      io.to(loserId).emit('elo_update', {
        elo: newLoserRating,
        xp: loserDoc?.xp || 0,
        change: newLoserRating - lElo
      });

    } catch (err) {
      console.error(err);
    }
  });

};
