/*
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
*/

// backend/models/Comment.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const commentSchema = new Schema({
  userId: { type: String, required: true },          // firebaseUid 문자열 유지
  userName: { type: String, required: true },
  userImage: { type: String, default: '' },
  text: { type: String, required: true },

  mentionUsernames: [{ type: String, lowercase: true, trim: true }],
  mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],  // 멘션된 User._id들

  // 🔽 추가: NER 결과(범위) & 메타
  piiHits: [{
    start: { type: Number, required: true },
    end:   { type: Number, required: true },
    type:  { type: String },
    score: { type: Number },
  }],
  piiMeta: {
    error: { type: String },
    skipped: { type: String },
    fallback: { type: String },
  },
}, { timestamps: true });

module.exports = commentSchema;
