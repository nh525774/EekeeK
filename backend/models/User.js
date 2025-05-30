const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  bio: { type: String, default: '' },
  profileImageUrl: { type: String, default: '' },
},
{timestamps: true});

module.exports = mongoose.model('User', userSchema);
