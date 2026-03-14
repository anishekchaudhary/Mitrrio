const mongoose = require('mongoose');

const PartySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  type: { type: String, enum: ['public', 'private'], required: true },
  maxSize: { type: Number, required: true },
  
  members: [{ 
    id: String,       
    username: String, 
    isLeader: { type: Boolean, default: false },
    color: { type: String, default: '#94a3b8' },
    // ADD THIS FIELD
    isReady: { type: Boolean, default: false }, 
    // Add these for guest persistence as previously discussed
    elo: { type: Number, default: 1200 },
    xp: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 }
  }], 
}, { timestamps: true });

module.exports = mongoose.model('Party', PartySchema);