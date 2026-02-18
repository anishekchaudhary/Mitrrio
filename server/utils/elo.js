// server/utils/elo.js

// K-Factor determines how much a rating can change in one game.
// Higher = more volatile (good for new players). Lower = more stable.
const getKFactor = (rating) => {
  if (rating < 2000) return 32;
  if (rating < 2400) return 24;
  return 16;
};

const getExpectedScore = (ratingA, ratingB) => {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
};

const calculateNewRatings = (winnerRating, loserRating) => {
  const kWinner = getKFactor(winnerRating);
  const kLoser = getKFactor(loserRating);

  const expectedWinner = getExpectedScore(winnerRating, loserRating);
  const expectedLoser = getExpectedScore(loserRating, winnerRating);

  // Winner gets 1 point, Loser gets 0
  const newWinnerRating = Math.round(winnerRating + kWinner * (1 - expectedWinner));
  const newLoserRating = Math.round(loserRating + kLoser * (0 - expectedLoser));

  return { newWinnerRating, newLoserRating };
};

module.exports = { calculateNewRatings };