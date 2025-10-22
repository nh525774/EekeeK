// routes/userRoutes.js
const express = require("express");
const router = express.Router();

const multer = require("multer");
const User = require("../models/User");
const firebaseAuth = require("../middleware/firebaseAuth");

const {
  getMe, updateMe, registerUser, getUserById, followUser, unfollowUser, getFollowStatus,
} = require("../controllers/userController");

// 🔐 S3 유틸(CommonJS)
const { putObject } = require("../src/lib/s3");

// ─────────────────────────────────────────────
// Multer: 메모리 저장소(디스크 X)
// ─────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  if (!file.mimetype || !file.mimetype.startsWith("image/")) {
    return cb(new Error("이미지 파일만 업로드할 수 있습니다."), false);
  }
  cb(null, true);
};
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
const uploadAvatar = (req, res, next) => {
  upload.single("avatar")(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({ message: "업로드 실패", error: String(err.message || err) });
    }
    next();
  });
};

// ─────────────────────────────────────────────
// 프로필
// ─────────────────────────────────────────────
router.get("/me", firebaseAuth, getMe);
router.patch("/me", firebaseAuth, updateMe);
router.post("/", firebaseAuth, registerUser);

// ─────────────────────────────────────────────
// 아바타 업로드 → S3 저장
// ─────────────────────────────────────────────
router.post("/me/avatar", firebaseAuth, uploadAvatar, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "파일 없음" });

    // 로그인 사용자
    const me = await User.findOne({ firebaseUid: req.firebaseUid });
    if (!me) return res.status(404).json({ message: "사용자 없음" });

    // 파일 메타
    const safeName = (req.file.originalname || "avatar").replace(/[^\w.\-]+/g, "_");
    const ext = safeName.includes(".") ? "" : ".jpg"; // 확장자 없을 때 기본 확장자
    const key = `uploads/avatars/${Date.now()}_${safeName}${ext}`;

    // S3 업로드 (메모리 버퍼 그대로)
    await putObject({
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype || "image/jpeg",
    });

    // URL 저장
    const publicBase = process.env.PUBLIC_BUCKET_BASE; 
    const publicUrl = publicBase ? `${publicBase}/${key}` : key;

    me.profileImageUrl = publicUrl;
    await me.save();

    res.json({ url: publicUrl, user: {
      _id: me._id,
      username: me.username,
      bio: me.bio,
      profileImageUrl: me.profileImageUrl,
      followerCount: (me.followers || []).length,
      followingCount: (me.following || []).length,
    }});
  } catch (e) {
    console.error("avatar upload error:", e);
    res.status(500).json({ message: "아바타 업로드 실패", error: e.message });
  }
});

// ─────────────────────────────────────────────
// 조회/팔로우
// ─────────────────────────────────────────────
router.get("/by-username/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select("_id username bio profileImageUrl followers following");
    if (!user) return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    res.json({
      _id: user._id,
      username: user.username,
      bio: user.bio,
      profileImageUrl: user.profileImageUrl,
      followerCount: user.followers.length,
      followingCount: user.following.length,
    });
  } catch (e) {
    res.status(500).json({ message: "서버 오류" });
  }
});

router.get("/mention-search", firebaseAuth, async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json([]);
  const users = await User.find({ username: { $regex: "^" + q, $options: "i" } })
    .select("_id username profileImageUrl bio")
    .limit(8);
  res.json(users);
});

router.get("/:id", getUserById);
router.get("/:id/follow-status", firebaseAuth, getFollowStatus);
router.post("/:id/follow", firebaseAuth, followUser);
router.post("/:id/unfollow", firebaseAuth, unfollowUser);

module.exports = router;
