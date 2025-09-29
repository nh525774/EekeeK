const mongoose = require('mongoose');
const { Schema } = mongoose;

const commentSchema = new Schema({
  userId: { type: String, required: true },          // (추후 ObjectId로 바꿔도 됨)
  userName: { type: String, required: true },
  userImage: { type: String, default: '' },
  text: { type: String, required: true },
  
  mentionUsernames: [{ type: String, lowercase: true, trim: true }],
  mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],          // User 문서 참조(알림/프로필 이동용)
}, { timestamps: true });

module.exports = commentSchema;
