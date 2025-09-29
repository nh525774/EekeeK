// backend/routes/commentRoutes.js (CJS 그대로)
const express = require("express");
const mongoose = require("mongoose");
const { Types } = mongoose;

const firebaseAuth = require("../middleware/firebaseAuth");
const User = require("../models/User");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const { extractUsernames } = require("../utils/extractMentions");

const router = express.Router({ mergeParams: true });

// ✅ 댓글 목록: GET /api/posts/:postId/comments
//  - PII 스캔/마스킹은 절대 여기서 하지 말 것 (무거운 모델 로딩 방지)
//  - 필요 시 프론트에서 버튼 눌렀을 때 /api/pii/scan-text 로 별도 호출
router.get("/", firebaseAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    if (!Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, msg: "잘못된 게시글 ID 입니다." });
    }

    const viewer = await User.findOne({ firebaseUid: req.firebaseUid })
      .select("_id")
      .lean();
    if (!viewer?._id) {
      return res.status(401).json({ success: false, msg: "인증 실패" });
    }

    const post = await Post.findById(postId).lean();
    if (!post) return res.status(404).json({ success: false, msg: "게시글 없음" });

    const comments = post.comments || [];

    // ⚠️ 여기서는 원문만 전달 (마스킹/하이라이트는 프론트에서 별도 호출로 처리)
    const rendered = comments.map((c) => ({
      _id: c._id,
      userId: c.userId,
      userName: c.userName,
      userImage: c.userImage,
      createdAt: c.createdAt,
      mentionUsernames: c.mentionUsernames || [],
      text: c.text || "", // 원문 그대로
      // 프론트가 필요하면 /api/pii/scan-text 호출해서 마스킹/HTML 생성
    }));

    return res.json({ success: true, data: rendered });
  } catch (err) {
    console.error("댓글 목록 조회 실패:", err);
    return res.status(500).json({ success: false, msg: "댓글 목록 조회 실패" });
  }
});

// 댓글 생성: POST /api/posts/:postId/comments
router.post("/", firebaseAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, msg: "댓글 내용을 입력하세요." });
    }
    if (!Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, msg: "잘못된 게시글 ID 입니다." });
    }

    const me = await User.findOne({ firebaseUid: req.firebaseUid })
      .select("_id username profileImageUrl firebaseUid")
      .lean();
    if (!me) return res.status(401).json({ success: false, msg: "작성자 정보를 찾을 수 없습니다." });

    const usernames = extractUsernames(text);
    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const ors = usernames.map((u) => ({ username: new RegExp(`^${escape(u)}$`, "i") }));
    const mentionedUsers = ors.length
      ? await User.find({ $or: ors }).select("_id username firebaseUid").lean()
      : [];

    const newComment = {
      _id: new Types.ObjectId(),
      userId: String(req.firebaseUid),
      userName: me.username || "User",
      userImage: me.profileImageUrl || "/defaultUser.png",
      text,
      mentionUsernames: usernames,
      mentions: mentionedUsers.map((u) => u._id),
      createdAt: new Date(),
    };

    const upd = await Post.updateOne(
      { _id: postId },
      { $push: { comments: newComment } }
    );
    if (upd.matchedCount === 0) {
      return res.status(404).json({ success: false, msg: "게시글을 찾을 수 없습니다." });
    }

    if (mentionedUsers.length) {
      const docs = mentionedUsers.map((u) => ({
        type: "mention",
        senderId: me._id,
        receiverId: u._id,
        postId,
        commentId: newComment._id,
        read: false,
        message: "회원님을 언급했습니다.",
        data: { postId, commentId: newComment._id },
      }));
      if (docs.length) await Notification.insertMany(docs);
    }

    return res.json({ success: true, data: newComment });
  } catch (err) {
    console.error("댓글 작성 실패:", err);
    return res.status(500).json({ success: false, msg: "댓글 작성 실패" });
  }
});

// 댓글 삭제: DELETE /api/posts/:postId/comments/:commentId
router.delete("/:commentId", firebaseAuth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;

    if (!Types.ObjectId.isValid(postId) || !Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ success: false, msg: "잘못된 ID 입니다." });
    }

    const post = await Post.findById(postId).lean();
    if (!post) return res.status(404).json({ success: false, msg: "게시글 없음" });

    const target = (post.comments || []).find((c) => String(c._id) === String(commentId));
    if (!target) return res.status(404).json({ success: false, msg: "댓글 없음" });

    const me = await User.findOne({ firebaseUid: req.firebaseUid }).select("_id firebaseUid").lean();
    if (!me) return res.status(401).json({ success: false, msg: "인증 실패" });

    const isCommentOwner = String(target.userId) === String(req.firebaseUid);
    const isPostOwner =
      (post.userId && typeof post.userId !== "string" && String(post.userId) === String(me._id)) ||
      (typeof post.userId === "string" && String(post.userId) === String(req.firebaseUid));

    if (!isCommentOwner && !isPostOwner) {
      return res.status(403).json({ success: false, msg: "삭제 권한이 없습니다." });
    }

    await Post.updateOne({ _id: postId }, { $pull: { comments: { _id: commentId } } });
    await Notification.deleteMany({ commentId });

    return res.json({ success: true, data: { commentId } });
  } catch (err) {
    console.error("댓글 삭제 실패:", err);
    return res.status(500).json({ success: false, msg: "댓글 삭제 실패" });
  }
});

module.exports = router;
