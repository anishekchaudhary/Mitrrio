const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema({
  id: String,
  username: String,
  isLeader: { type: Boolean, default: false },
  color: String,
  // NEW: Track readiness
  isReady: { type: Boolean, default: false }
}, { _id: false });

const PartySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  type: { type: String, enum: ['public', 'private'], default: 'private' },
  members: [MemberSchema],
  maxSize: { type: Number, default: 10 },
  createdAt: { type: Date, default: Date.now, expires: 3600 } // Auto-delete after 1 hour
});

module.exports = mongoose.model('Party', PartySchema);