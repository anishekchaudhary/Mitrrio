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
    isReady: { type: Boolean, default: false }, 
    
    // --- NEW: Spectator Mode ---
    isSpectator: { type: Boolean, default: false },
    
    // Persistent stats for guests & quick fetching
    elo: { type: Number, default: 1200 },
    xp: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 }
  }], 
}, { timestamps: true });

module.exports = mongoose.model('Party', PartySchema);