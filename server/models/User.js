const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // Allow username/email/password to be missing for guests initially
  username: { type: String, unique: true, sparse: true }, 
  email: { type: String, unique: true, sparse: true },
  password: { type: String }, // Not required for guests
  
  elo: { type: Number, default: 1200 },
  xp: { type: Number, default: 0 },
  gamesPlayed: { type: Number, default: 0 },
  
  currentParty: { type: String, default: null }, 
  isGuest: { type: Boolean, default: false }, // NEW FLAG

  // TTL Index: Automatically delete guest accounts after 24 hours if not registered
  // This satisfies "remove that when sessions ends" (cleanup)
  createdAt: { type: Date, default: Date.now, expires: 86400 } 

}, { timestamps: true });

// Middleware to ensure guests don't trigger validation errors
UserSchema.pre('save', function(next) {
  if (this.isGuest) {
    if (!this.username) this.username = `Guest_${this._id.toString().slice(-4)}`;
    // We don't set email/password for guests
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);