const { Schema, model, Types } = require('mongoose');

const UserLoginProfileSchema = new Schema({
  // User 컬렉션의 _id를 참조(필수, 유니크)
  userId: { type: Types.ObjectId, ref: 'User', unique: true, index: true, required: true },

  // GeoIP 기반 “대략 지역”만 저장 (정밀 좌표 아님)
  homeRegion: { country: String, region: String, city: String },

  // 신뢰 디바이스 식별자(해시) 목록
  trustedDevices: [String],
  
  locationConsent: { type: Boolean, default: false },

  // 최근 GeoIP 좌표 로그(저정밀) - 최대 10개 정도만 유지
  lastLocations: [{
    geo: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], default: undefined } // [lng, lat]
    },
    at: Date
  }],

  lastIP: String,

  // 로그인 평가 기록(점수/사유/시간) - 보관기간 운영정책으로 정리(예: 90일)
  riskHistory: [{
    score: Number,
    reasons: [String],
    at: Date
  }]
}, { timestamps: true });

// 공간 인덱스(near 쿼리까지는 필요 없지만 정합성 위해 넣어도 됨)
UserLoginProfileSchema.index({ 'lastLocations.geo': '2dsphere' });

module.exports = model('UserLoginProfile', UserLoginProfileSchema);
