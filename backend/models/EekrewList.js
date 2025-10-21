// ESM 기준 (package.json에 "type":"module")
import mongoose from "mongoose";

const EekrewSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    eekrewId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// 같은 사람을 중복 추가 방지
EekrewSchema.index({ userId: 1, eekrewId: 1 }, { unique: true });

export default mongoose.model("eekrewUserIds", EekrewSchema);