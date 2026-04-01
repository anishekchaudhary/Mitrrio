const router = require('express').Router();
const User = require('../models/User');
const Match = require('../models/Match'); 
const adminOnly = require('../middleware/adminMiddleware');

// GET /api/admin/stats
router.get('/stats', adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isGuest: false });
    
    // Aggregate only XP now
    const aggregates = await User.aggregate([
      { $match: { isGuest: false } },
      { $group: { _id: null, totalXp: { $sum: "$xp" } } }
    ]);
    const stats = aggregates.length > 0 ? aggregates[0] : { totalXp: 0 };

    // Decoupled: Count the actual match history records on the server
    const totalGames = await Match.countDocuments();

    res.status(200).json({ totalUsers, totalXp: stats.totalXp, totalGames });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch global stats" });
  }
});

// GET /api/admin/leaderboard
router.get('/leaderboard', adminOnly, async (req, res) => {
  try {
    const topPlayers = await User.find({ isGuest: false }).sort({ elo: -1 }).limit(50).select('username elo xp gamesPlayed');
    res.status(200).json(topPlayers);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
});

// --- NEW: GET RECENT MATCHES ---
router.get('/matches', adminOnly, async (req, res) => {
  try {
    const matches = await Match.find().sort({ createdAt: -1 }).limit(20);
    res.status(200).json(matches);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch match history" });
  }
});

// --- NEW: RESET MATCH HISTORY ---
router.delete('/matches', adminOnly, async (req, res) => {
  try {
    // This deletes the server records but DOES NOT touch User.gamesPlayed or User.elo
    await Match.deleteMany({});
    res.status(200).json({ message: "Server match history wiped successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Failed to wipe match history" });
  }
});

module.exports = router;