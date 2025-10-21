const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const commentSchema = require('./Comment');

const postSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "" },
    content: { type: String, default: "" },
    likes: { type: [String], default: [] },

    imageUrls: { type: [String], default: [] },
    videoUrl: { type: String, default: "" },
    comments: { type: [commentSchema], default: [] },
    visibility: { 
      type: String, 
      enum: ["public", "mutual", "eekrew"], 
      default: "public",
    },
    eeKrewListId: [{ type: Schema.Types.ObjectId, ref: "Eekrew", default: null }],
  },
  { timestamps: true }
);

// ✅ 여기 소문자로 고쳐야 함
postSchema.index({ visibility: 1 });
postSchema.index({ title: "text", content: "text" });

module.exports = model("Post", postSchema);