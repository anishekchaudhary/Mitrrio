const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { 
    type: String, 
    unique: true, 
    sparse: true,
    maxlength: [20, 'Username cannot exceed 20 characters']
  },
  email: { type: String, unique: true, sparse: true },
  password: { type: String },
  
  // Game Stats
  elo: { type: Number, default: 1200 },
  xp: { type: Number, default: 0 },
  gamesPlayed: { type: Number, default: 0 },
  
  // Admin & App State
  isAdmin: { type: Boolean, default: false }, // <-- Added Admin Flag
  currentParty: { type: String, default: null }, 
  isGuest: { type: Boolean, default: false }, 

  // Auth & Verification
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,

  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

UserSchema.index({ createdAt: 1 }, { 
  expireAfterSeconds: 86400, 
  partialFilterExpression: { isGuest: true } 
});

UserSchema.pre('save', async function() {
  if (this.isGuest && !this.username) {
    this.username = `Guest_${this._id.toString().slice(-4)}`;
  }
});

module.exports = mongoose.model('User', UserSchema);