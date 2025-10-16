
// backend/routes/commentRoutes.js (CJS)
const express = require("express");
const mongoose = require("mongoose");
const { Types } = mongoose;

const firebaseAuth = require("../middleware/firebaseAuth");
const User = require("../models/User");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const { extractUsernames } = require("../utils/extractMentions");
const { scanTextWithPy, normalizeHits, maskByHits } = require("../utils/piiScan");

const router = express.Router({ mergeParams: true });

/** 댓글 목록: GET /api/posts/:postId/comments
 *  - 여기서 뷰어 기준으로 마스킹 적용해서 내려준다.
 */
router.get("/", firebaseAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    if (!Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, msg: "잘못된 게시글 ID 입니다." });
    }

    const viewer = await User.findOne({ firebaseUid: req.firebaseUid })
      .select("_id firebaseUid")
      .lean();
    if (!viewer?._id) {
      return res.status(401).json({ success: false, msg: "인증 실패" });
    }

    const post = await Post.findById(postId).lean();
    if (!post) return res.status(404).json({ success: false, msg: "게시글 없음" });

    const comments = post.comments || [];

    const rendered = comments.map((c) => {
      const isAuthor = String(c.userId) === String(req.firebaseUid); // 작성자 판단 (firebaseUid 문자열 비교)
      const isMentioned = Array.isArray(c.mentions)
        ? c.mentions.some(u => String(u) === String(viewer._id))
        : false;

      const privileged = isAuthor || isMentioned;

      let contentForViewer = c.text || "";
      if (!privileged) {
        if (Array.isArray(c.piiHits) && c.piiHits.length) {
          contentForViewer = maskByHits(c.text || "", c.piiHits);
        } else {
          // 과거 댓글처럼 piiHits 없는 경우엔 원문 그대로(폴백) 또는 필요시 빠른 정규식 마스킹 적용 가능
          // contentForViewer = maskByHits(c.text || "", normalizeHits(c.text || "", quickRegexScan(c.text || "")));
        }
      }

      return {
        _id: c._id,
        userId: c.userId,
        userName: c.userName,
        userImage: c.userImage,
        createdAt: c.createdAt,
        mentionUsernames: c.mentionUsernames || [],
        // ✅ 뷰어 기준으로 이미 처리된 텍스트
        contentForViewer,
      };
    });

    return res.json({ success: true, data: rendered });
  } catch (err) {
    console.error("댓글 목록 조회 실패:", err);
    return res.status(500).json({ success: false, msg: "댓글 목록 조회 실패" });
  }
});

/** 댓글 생성: POST /api/posts/:postId/comments
 *  - 저장 시점에 NER 스캔 → 범위 저장(piiHits)
 */
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

    // 멘션 사용자 찾기
    const usernames = extractUsernames(text);
    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const ors = usernames.map((u) => ({ username: new RegExp(`^${escape(u)}$`, "i") }));
    const mentionedUsers = ors.length
      ? await User.find({ $or: ors }).select("_id username firebaseUid").lean()
      : [];

    // 🔎 NER 실행 → 범위 정규화
    const scan = await scanTextWithPy(text);
    const piiHits = normalizeHits(text, scan.hits || []);

    const newComment = {
      _id: new Types.ObjectId(),
      userId: String(req.firebaseUid),
      userName: me.username || "User",
      userImage: me.profileImageUrl || "/defaultUser.png",
      text,
      mentionUsernames: usernames,
      mentions: mentionedUsers.map((u) => u._id),
      createdAt: new Date(),

      // 저장되는 NER 결과
      piiHits,
      piiMeta: {
        error: scan.error,
        skipped: scan.skipped,
        fallback: scan.fallback,
      },
    };
    console.log("[PII]", { hitCount: piiHits.length, error: scan.error, fallback: scan.fallback, skipped: scan.skipped });
    const upd = await Post.updateOne(
      { _id: postId },
      { $push: { comments: newComment } }
    );
    if (upd.matchedCount === 0) {
      return res.status(404).json({ success: false, msg: "게시글을 찾을 수 없습니다." });
    }

    // 멘션 알림
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

    // 작성자 본인에게는 원문을 돌려주자(UX)
    return res.json({
      success: true,
      data: {
        ...newComment,
        contentForViewer: text,
      },
    });
  } catch (err) {
    console.error("댓글 작성 실패:", err);
    return res.status(500).json({ success: false, msg: "댓글 작성 실패" });
  }
});

/** 댓글 삭제: DELETE /api/posts/:postId/comments/:commentId (기존 로직 그대로) */
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
