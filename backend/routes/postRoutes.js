const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Post = require("../models/Post");
const User = require("../models/User");
const firebaseAuth = require("../middleware/firebaseAuth");
const { Types } = require("mongoose");

/** [공용] userId가 문자열(firebaseUid)인 옛 문서를 ObjectId로 교정 */
async function ensureObjectIdUserId(post) {
  if (!post) return post;
  if (typeof post.userId === "string" || post.userId instanceof String) {
    // 문자열이라면 firebaseUid → User._id 로 치환
    const u = await User.findOne({ firebaseUid: String(post.userId) }).lean();
    if (u?._id) {
      post.userId = new mongoose.Types.ObjectId(u._id);
      // 한 번 교정해두면 다음부터는 에러 안 남
      await post.save({ validateModifiedOnly: true });
    }
  }
  return post;
}

/** [공용] populate + 응답 형태 통일 */
function toPostDTO(p) {
  return {
    _id: p._id,
    title: p.title,
    content: p.content,
    imageUrls: p.imageUrls || [],
    videoUrl: p.videoUrl || "",
    likes: p.likes || [],
    comments: p.comments || [],
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    userId: p.userId?._id || p.userId,
    user: {
      username: p.userId?.username || "User",
      profileImageUrl: p.userId?.profileImageUrl || "/defaultUser.png",
    },
  };
}

/** 게시글 작성 (항상 ObjectId 저장) */
router.post("/", firebaseAuth, async (req, res) => {
  try {
    const me = await User.findOne({ firebaseUid: req.firebaseUid });
    if (!me) return res.status(404).json({ success: false, message: "사용자 없음" });

    const post = await Post.create({
      userId: me._id,
      title: req.body.title || "",
      content: req.body.content || "",
      imageUrls: req.body.imageUrls || [],
      videoUrl: req.body.videoUrl || "",
    });

    const saved = await Post.findById(post._id).populate("userId", "username profileImageUrl");
    res.status(201).json({ success: true, data: toPostDTO(saved) });
  } catch (err) {
    console.error("게시글 저장 실패:", err);
    res.status(500).json({ success: false, message: "게시글 저장 실패" });
  }
});

/** 모든 게시글 */
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const rows = await Post.find().sort({ createdAt: -1 }).limit(limit);
    const fixed = await Promise.all(rows.map(async (p) => {
      await ensureObjectIdUserId(p);
      return Post.findById(p._id).populate("userId", "username profileImageUrl");
    }));
    res.json({ success: true, data: fixed.map(toPostDTO) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "게시글 조회 실패" });
  }
});

/** 내 게시글 */
router.get("/mine", firebaseAuth, async (req, res) => {
  try {
    const me = await User.findOne({ firebaseUid: req.firebaseUid });
    if (!me) return res.status(404).json({ success: false, message: "사용자 없음" });

    const rows = await Post.find({ userId: me._id }).sort({ createdAt: -1 });
    const fixed = await Promise.all(rows.map(async (p) => {
      await ensureObjectIdUserId(p);
      return Post.findById(p._id).populate("userId", "username profileImageUrl");
    }));
    res.json({ success: true, data: fixed.map(toPostDTO) });
  } catch (err) {
    res.status(500).json({ success: false, message: "내 게시글 조회 실패", error: err.message });
  }
});

/** 단일 게시글 */
router.get("/:id", async (req, res) => {
  try {
    let post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: "게시글 없음" });

    await ensureObjectIdUserId(post);
    post = await Post.findById(post._id).populate("userId", "username profileImageUrl");

    res.json({ success: true, data: toPostDTO(post) });
  } catch (err) {
    res.status(500).json({ success: false, message: "게시글 조회 실패", error: err.message });
  }
});

/** 삭제 (본인만) */
router.delete("/:id", firebaseAuth, async (req, res) => {
  try {
    let post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: "게시글이 없습니다." });

    await ensureObjectIdUserId(post);

    // 권한: 작성자 ObjectId === 내 ObjectId
    const me = await User.findOne({ firebaseUid: req.firebaseUid });
    if (!me || String(post.userId) !== String(me._id)) {
      return res.status(403).json({ success: false, message: "삭제 권한이 없습니다." });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "게시글 삭제 완료" });
  } catch (err) {
    res.status(500).json({ success: false, message: "삭제 중 오류 발생", error: err.message });
  }
});

/** 좋아요 */
router.get("/:id/like", firebaseAuth, async (req, res) => {
  try {
    const r = await Post.updateOne(
      { _id: req.params.id },
      { $addToSet: { likes: req.firebaseUid } }
    );
    if (r.matchedCount === 0) return res.status(404).json({ success: false, msg: "게시글 없음" });
    const fresh = await Post.findById(req.params.id).lean();
    res.json({ success: true, likes: fresh?.likes || [] });
  } catch (err) {
    console.error("좋아요 실패:", err);
    res.status(500).json({ success: false, msg: "좋아요 실패" });
  }
});

/** 좋아요 취소 */
router.get("/:id/unlike", firebaseAuth, async (req, res) => {
  try {
    const r = await Post.updateOne(
      { _id: req.params.id },
      { $pull: { likes: req.firebaseUid } }
    );
    if (r.matchedCount === 0) return res.status(404).json({ success: false, msg: "게시글 없음" });
    const fresh = await Post.findById(req.params.id).lean();
    res.json({ success: true, likes: fresh?.likes || [] });
  } catch (err) {
    console.error("좋아요 취소 실패:", err);
    res.status(500).json({ success: false, msg: "좋아요 취소 실패" });
  }
});

/** 댓글 작성 */
router.post("/:postId/comments", firebaseAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, msg: "댓글 내용을 입력하세요." });

    const me = await User.findOne(
      { firebaseUid: req.firebaseUid },
      "username profileImageUrl"
    ).lean();

    const newComment = {
      _id: new Types.ObjectId(),
      userId: String(req.firebaseUid),
      userName: me?.username || "User",
      userImage: me?.profileImageUrl || "/defaultUser.png",
      text,
      createdAt: new Date(),
    };

    const r = await Post.updateOne(
      { _id: req.params.postId },
      { $push: { comments: newComment } }
    );
    if (r.matchedCount === 0) {
      return res.status(404).json({ success: false, msg: "게시글을 찾을 수 없습니다." });
    }
    res.json({ success: true, data: newComment });
  } catch (err) {
    console.error("댓글 작성 실패:", err);
    res.status(500).json({ success: false, msg: "댓글 작성 실패" });
  }
});

module.exports = router;
