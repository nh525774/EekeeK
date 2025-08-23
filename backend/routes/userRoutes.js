const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");
const multer = require("multer");
const User = require("../models/User");

const firebaseAuth = require("../middleware/firebaseAuth");
const {
  getMe, updateMe, registerUser, getUserById, followUser, unfollowUser, getFollowStatus,
} = require("../controllers/userController");

// --- Multer: 아바타 저장 위치/파일명 설정 ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "..", "uploads", "avatars");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const mime = (file.mimetype || "").toLowerCase();
    const ext =
      mime === "image/jpeg" ? ".jpg" :
      mime === "image/png"  ? ".png" :
      mime === "image/webp" ? ".webp" :
      (path.extname(file.originalname || "").toLowerCase() || ".jpg");
    const safeUid = (req.firebaseUid || "anon").replace(/[^a-zA-Z0-9_-]/g, "");
    cb(null, `${safeUid}_${Date.now()}${ext}`);
  },
});
const fileFilter = (req, file, cb) => {
  if (!file.mimetype || !file.mimetype.startsWith("image/")) {
    return cb(new Error("이미지 파일만 업로드할 수 있습니다."), false);
  }
  cb(null, true);
};
const upload = multer({
  storage,
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

// 프로필
router.get("/me", firebaseAuth, getMe);
router.patch("/me", firebaseAuth, updateMe);
router.post("/", firebaseAuth, registerUser);

// 아바타 업로드 — 없으면 자동 생성 후 저장
router.post("/me/avatar", firebaseAuth, uploadAvatar, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "파일이 없습니다." });

    let me = await User.findOne({ firebaseUid: req.firebaseUid });
    if (!me) {
      // 최초 업로드로 프로필 생성
      const seed = (req.firebaseEmail || "user").split("@")[0];
      let cand = seed.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 20) || "user";
      let n = 0;
      while (await User.exists({ username: cand })) {
        n += 1;
        cand = `${seed}${n}`.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 24);
      }
      me = await User.create({
        firebaseUid: req.firebaseUid,
        username: cand,
        bio: "",
        profileImageUrl: "",
        followers: [],
        following: [],
      });
    }

    const baseUrl = req.app.get("publicBaseUrl") || `http://localhost:${process.env.PORT || 5000}`;
    const publicUrl = `${baseUrl}/uploads/avatars/${req.file.filename}`;
    me.profileImageUrl = publicUrl;
    await me.save();

    res.json({ url: publicUrl, user: me });
  } catch (e) {
    console.error("아바타 업로드 실패:", e);
    res.status(500).json({ message: "아바타 업로드 실패", error: e.message });
  }
});

// 조회/팔로우
router.get("/:id", getUserById);
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

router.get("/:id/follow-status", firebaseAuth, getFollowStatus);
router.post("/:id/follow", firebaseAuth, followUser);
router.post("/:id/unfollow", firebaseAuth, unfollowUser);

module.exports = router;
