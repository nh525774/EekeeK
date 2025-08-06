const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  bio: { type: String, default: '' },
  profileImageUrl: { type: String, default: '' },

  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
},
{timestamps: true});

module.exports = mongoose.model('User', userSchema);
