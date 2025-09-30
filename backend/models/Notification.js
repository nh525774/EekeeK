// backend/models/Notification.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    senderId:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message:    { type: String, required: true },
    // 필요하면 enum으로 제한
<<<<<<< HEAD
    type:       { type: String, enum: ["info", "follow", "post_like", "post_comment", "mention"], default: "info" },
=======
    type:       { type: String, enum: ["info", "follow", "post_like", "post_comment"], default: "info" },
>>>>>>> backup/20251001-0306
    // 임의 데이터는 Mixed 권장
    data:       { type: Schema.Types.Mixed, default: {} },
    read:       { type: Boolean, default: false },
  },
  { timestamps: true } // createdAt/updatedAt 자동 생성
);

module.exports = mongoose.model("Notification", notificationSchema);
