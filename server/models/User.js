const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // Sparse allows these to be null/missing for Guests
  username: { 
    type: String, 
    unique: true, 
    sparse: true,
    maxlength: [20, 'Username cannot exceed 20 characters'] // <--- ADD THIS
  },
  email: { type: String, unique: true, sparse: true },
  password: { type: String }, // Not required for guests
  
  // Game Stats
  elo: { type: Number, default: 1200 },
  xp: { type: Number, default: 0 },
  gamesPlayed: { type: Number, default: 0 },
  
  // App State
  currentParty: { type: String, default: null }, 
  isGuest: { type: Boolean, default: false }, 

  // Auth & Verification Fields
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,

  // Timestamp for cleanup
  createdAt: { type: Date, default: Date.now }

}, { timestamps: true });

// --- SMART TTL INDEX ---
// This ensures ONLY users with isGuest: true are deleted after 24 hours.
UserSchema.index({ createdAt: 1 }, { 
  expireAfterSeconds: 86400, 
  partialFilterExpression: { isGuest: true } 
});

// --- FIX: Modern Middleware Syntax (No 'next') ---
UserSchema.pre('save', async function() {
  // If user is a guest and has no username, generate one
  if (this.isGuest && !this.username) {
    this.username = `Guest_${this._id.toString().slice(-4)}`;
  }
  // No need to call next() here; just finishing the function is enough.
});

module.exports = mongoose.model('User', UserSchema);