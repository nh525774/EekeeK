// type: module (ESM) 기준
import mongoose from "mongoose";
const { Schema, model, Types } = mongoose;

const InviteSchema = new Schema(
  {
    toUser: { type: Types.ObjectId, ref: "User", required: true },
    fromUser: { type: Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
  },
  { _id: false, timestamps: true }
);

const EekrewSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    owner: { type: Types.ObjectId, ref: "User", required: true },
    members: [{ type: Types.ObjectId, ref: "User", index: true }],
    invites: [InviteSchema],
  },
  { timestamps: true }
);

// owner는 항상 members에 포함
EekrewSchema.pre("save", function (next) {
  if (!this.members.some((m) => m.equals(this.owner))) this.members.push(this.owner);
  next();
});

EekrewSchema.index({ owner: 1, name: 1 }, { unique: true });
EekrewSchema.index({ "invites.toUser": 1, _id: 1 });

export default model("Eekrew", EekrewSchema);