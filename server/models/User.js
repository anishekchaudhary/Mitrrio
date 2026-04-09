// server/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { 
    type: String, 
    unique: true, 
    sparse: true,
    maxlength: [20, 'Username cannot exceed 20 characters']
  },
  email: { 
    type: String, 
    unique: true, 
    sparse: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String 
  },
  
  // ==========================================
  // Game Stats (Explicitly Defined)
  // ==========================================
  elo: { 
    type: Number, 
    default: 1200 
  },
  xp: { 
    type: Number, 
    default: 0 
  },
  gamesPlayed: { 
    type: Number, 
    default: 0 
  },
  
  // ==========================================
  // Admin & App State
  // ==========================================
  isAdmin: { 
    type: Boolean, 
    default: false 
  },
  currentParty: { 
    type: String, 
    default: null 
  }, 
  isGuest: { 
    type: Boolean, 
    default: false 
  }, 

  // ==========================================
  // Auth & Verification
  // ==========================================
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,

  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

/**
 * INDEXES
 * 1. Automatic Guest Cleanup: Deletes guest accounts after 24 hours (86400 seconds)
 * 2. partialFilterExpression ensures this only applies to guests.
 */
UserSchema.index({ createdAt: 1 }, { 
  expireAfterSeconds: 86400, 
  partialFilterExpression: { isGuest: true } 
});

/**
 * PRE-SAVE HOOK
 * Automatically generates a guest username if one isn't provided.
 */
UserSchema.pre('save', function(next) {
  if (this.isGuest && !this.username) {
    // Generates a name like Guest_a1b2
    this.username = `Guest_${this._id.toString().slice(-4)}`;
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);