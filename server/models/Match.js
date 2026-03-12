const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema({
  roomCode: { type: String, required: true },
  players: [{
    username: String,
    score: Number,
    rank: Number
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Match', MatchSchema);