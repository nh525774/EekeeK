const { Schema, model, Types } = require('mongoose');

const PlaceSchema = new Schema({
  userId: { type: Types.ObjectId, index: true, required: true },
  name: String,
  desc: String,
  geo: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  address: String,
  visibility: { type: String, enum: ['private','followers','public'], default: 'private' },
  tags: [String],
  createdAt: { type: Date, default: Date.now }
});

PlaceSchema.index({ geo: '2dsphere' });
module.exports = model('Place', PlaceSchema);
