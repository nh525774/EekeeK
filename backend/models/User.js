const mongoose = require('mongoose');
const { Schema } = mongoose;


const userSchema = new Schema({
  firebaseUid: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  bio: { type: String, default: '' },
  profileImageUrl: { type: String, default: '' },

  followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: Schema.Types.ObjectId, ref: "User" }],
},
{timestamps: true});
userSchema.index({ username: "text", bio: "text" });

module.exports = mongoose.model('User', userSchema);
