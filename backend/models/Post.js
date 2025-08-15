const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const commentSchema = require('./Comment');


const postSchema = new Schema(
  {
    // 🔹 작성자: User 컬렉션 참조 (populate 가능)
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "" },
    content: { type: String, default: "" },
    likes: { type: [String], default: [] },

    imageUrls: { type: [String], default: [] },
    videoUrl: { type: String, default: "" },
    comments: { type: [commentSchema], default: [] },
  },
  { timestamps: true }
);

postSchema.index({ title: "text", content: "text" });

module.exports = model("Post", postSchema);