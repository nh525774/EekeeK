// routes/postRoutes.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { Types } = require("mongoose");


const Post = require("../models/Post");
const User = require("../models/User");
const { maskByHits } = require("../utils/piiScan");

// 미들웨어
const firebaseAuth = require("../middleware/firebaseAuth");               // 토큰 필수
const firebaseAuthOptional = require("../middleware/firebaseAuthOptional"); // 토큰 선택 (조회용)

/** [공용] userId가 문자열(firebaseUid)인 옛 문서를 ObjectId로 교정 */
async function ensureObjectIdUserId(post) {
  if (!post) return post;
  if (typeof post.userId === "string" || post.userId instanceof String) {
    const u = await User.findOne({ firebaseUid: String(post.userId) }).lean();
    if (u?._id) {
      post.userId = new mongoose.Types.ObjectId(u._id);
      await post.save({ validateModifiedOnly: true });
    }
  }
  return post;
}

/** [공용] populate 후 응답 형태 통일 */
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
      // 구버전 호환 별칭
      name: p.userId?.username || "User",
      image: p.userId?.profileImageUrl || "/defaultUser.png",
    },
    visibility: p.visibility || "public",
    eeKrewListId: p.eeKrewListId || null,
  };
}

/** viewer Mongo _id 얻기 (선택 인증 사용 시) */
async function getViewerMongoId(req) {
  if (!req.firebaseUid) return null;
  const v = await User.findOne({ firebaseUid: req.firebaseUid }).select("_id").lean();
  return v?._id || null;
}

/** 서로 팔로우(=mutual) 판별 (User.following: [ObjectId] 가정) */
async function isMutual(viewerId, authorId) {
  const [viewer, author] = await Promise.all([
    User.findById(viewerId).select("following").lean(),
    User.findById(authorId).select("following").lean(),
  ]);
  if (!viewer || !author) return false;
  const vf = (viewer.following || []).map(String);
  const af = (author.following || []).map(String);
  return vf.includes(String(authorId)) && af.includes(String(viewerId));
}

/** 이 viewer가 해당 post 열람 가능? (eeKrew는 리스트 구현 전까지 임시로 작성자만) */
async function canViewPost(postDoc, viewerId) {
  const authorId = postDoc.userId?._id || postDoc.userId;
  const vis = postDoc.visibility || "public";

  if (viewerId && String(viewerId) === String(authorId)) return true;
  if (vis === "public") return true;
  if (!viewerId) return false;

  if (vis === "mutual") return isMutual(viewerId, authorId);
  if (vis === "eeKrew") return false; // TODO: 리스트 구현 시 교체
  return true;
}

/** 게시글 작성 */
router.post("/", firebaseAuth, async (req, res) => {
  try {
    const me = await User.findOne({ firebaseUid: req.firebaseUid });
    if (!me) return res.status(404).json({ success: false, message: "사용자 없음" });

    const { title, content, imageUrls, videoUrl, visibility, eeKrewListId } = req.body;

    const post = await Post.create({
      userId: me._id,
      title: title || "",
      content: content || "",
      imageUrls: imageUrls || [],
      videoUrl: videoUrl || "",
      visibility: visibility || "public",
      eeKrewListId: visibility === "eeKrew" ? eeKrewListId || null : undefined,
    });

    const saved = await Post.findById(post._id).populate("userId", "username profileImageUrl");
    res.status(201).json({ success: true, data: toPostDTO(saved) });
  } catch (err) {
    console.error("게시글 저장 실패:", err);
    res.status(500).json({ success: false, message: "게시글 저장 실패" });
  }
});

/** 모든 게시글 (옵션 인증 + 가시성 필터) */
router.get("/", firebaseAuthOptional, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const rows = await Post.find().sort({ createdAt: -1 }).limit(limit);

    const populated = await Promise.all(
      rows.map(async (p) => {
        await ensureObjectIdUserId(p);
        return Post.findById(p._id).populate("userId", "username profileImageUrl");
      })
    );

    const viewerId = await getViewerMongoId(req);
    const filtered = [];
    for (const p of populated) {
      if (await canViewPost(p, viewerId)) filtered.push(p);
    }

    res.json({ success: true, data: filtered.map(toPostDTO) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "게시글 조회 실패" });
  }
});

/** 내 게시글 (강제 인증) */
router.get("/mine", firebaseAuth, async (req, res) => {
  try {
    const me = await User.findOne({ firebaseUid: req.firebaseUid });
    if (!me) return res.status(404).json({ success: false, message: "사용자 없음" });

    const rows = await Post.find({ userId: me._id }).sort({ createdAt: -1 });
    const populated = await Promise.all(
      rows.map(async (p) => {
        await ensureObjectIdUserId(p);
        return Post.findById(p._id).populate("userId", "username profileImageUrl");
      })
    );

    res.json({ success: true, data: populated.map(toPostDTO) });
  } catch (err) {
    res.status(500).json({ success: false, message: "내 게시글 조회 실패", error: err.message });
  }
});

/** 단일 게시글 (옵션 인증 + 가시성 필터) */
router.get("/:id", firebaseAuthOptional, async (req, res) => {

  try {
    let post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: "게시글 없음" });

    await ensureObjectIdUserId(post);
    post = await Post.findById(post._id).populate("userId", "username profileImageUrl");

    const viewerId = await getViewerMongoId(req);
    if (!(await canViewPost(post, viewerId))) {
      return res.status(403).json({ success: false, message: "열람 권한이 없습니다." });
    }
    // ↓↓↓ 여기부터 댓글별 contentForViewer 생성 (maskByHits는 utils에서 임포트해둠)
    const viewerUid = req.firebaseUid;                // 작성자 판별용(firebaseUid 문자열)
    const viewerObjId = viewerId?.toString?.();       // 멘션 판별용(ObjectId 문자열)

    const decoratedComments = (post.comments || []).map((c) => {
      const isAuthor =
    (viewerUid   && String(c.userId) === String(viewerUid)) ||      // firebaseUid 형태
    (viewerObjId && String(c.userId) === String(viewerObjId));      // ObjectId 형태
      const isMentioned =
        viewerObjId && Array.isArray(c.mentions)
          ? c.mentions.some((u) => String(u) === String(viewerObjId))
          : false;

      const contentForViewer =
        isAuthor || isMentioned
          ? (c.text || "")
          : maskByHits(c.text || "", c.piiHits || []);  // ★ NER 저장 범위로 마스킹

      // lean()이 아닐 수도 있으니 안전하게 POJO로
      return { ...(c.toObject?.() ?? c), contentForViewer };
    });

    const dto = toPostDTO(post);
    dto.comments = decoratedComments;

    res.json({ success: true, data: dto });
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
    post = await Post.findById(post._id).populate(
      "userId",
      "username profileImageUrl"
    );

    const me = await User.findOne({ firebaseUid: req.firebaseUid });
    const authorId = post.userId?._id || post.userId;
    if (!me || String(authorId) !== String(me._id)) {
      return res.status(403).json({ success: false, message: "권한이 없습니다." });
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

module.exports = router;
