const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  elo: { type: Number, default: 1200 },
  xp: { type: Number, default: 0 },
  
  // CHANGED: Store the party CODE instead of ObjectId for easier lookup
  currentParty: { type: String, default: null }, 

  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date

}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);