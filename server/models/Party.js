const mongoose = require('mongoose');

const PartySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  type: { type: String, enum: ['public', 'private'], required: true },
  maxSize: { type: Number, required: true },
  
  // CHANGED: Store simple objects instead of strict ObjectIds
  members: [{ 
    id: String,       // Can be "guest_123" OR "65d4..." (MongoID)
    username: String, // Store username for easy display
    isLeader: { type: Boolean, default: false }
  }], 
}, { timestamps: true });

module.exports = mongoose.model('Party', PartySchema);