const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: {type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  imageUrl: { type: String, default: '' },
  videoUrl: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
postSchema.index({ title: 'text', content: 'text' });
module.exports = mongoose.model('Post', postSchema);