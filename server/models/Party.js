const mongoose = require('mongoose');

const PartySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  type: { type: String, enum: ['public', 'private'], required: true },
  maxSize: { type: Number, required: true },
  
  members: [{ 
    id: String,       
    username: String, 
    isLeader: { type: Boolean, default: false },
    color: { type: String, default: '#94a3b8' } // Store assigned color
  }], 
}, { timestamps: true });

module.exports = mongoose.model('Party', PartySchema);