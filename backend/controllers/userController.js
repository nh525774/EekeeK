// controllers/userController.js
const mongoose = require("mongoose");
const User = require("../models/User");

// username 자동 생성 유틸
const makeUsernameSeed = (email) =>
  (email?.split("@")[0] || "user")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 20) || "user";

// 없으면 생성해서 반환
async function ensureUser(firebaseUid, firebaseEmail) {
  if (!firebaseUid) return null;
  let me = await User.findOne({ firebaseUid })
    .select("_id username bio profileImageUrl followers following");
  if (me) return me;

  // username 중복 피해서 자동 생성
  const base = makeUsernameSeed(firebaseEmail);
  let cand = base, n = 0;
  while (await User.exists({ username: cand })) {
    n += 1;
    cand = `${base}${n}`;
    if (cand.length > 24) cand = `${base.slice(0, 24 - String(n).length)}${n}`;
  }

  me = await User.create({
    firebaseUid,
    username: cand,
    bio: "",
    profileImageUrl: "",
    followers: [],
    following: [],
  });
  return me;
}

const countsOf = (u) => ({
  followerCount: Array.isArray(u.followers) ? u.followers.length : 0,
  followingCount: Array.isArray(u.following) ? u.following.length : 0,
});

// 최초 등록(수동 등록도 유지)
exports.registerUser = async (req, res) => {
  try {
    const { firebaseUid } = req;
    if (!firebaseUid) return res.status(401).json({ message: "인증 필요" });

    const { username, bio, profileImageUrl } = req.body || {};
    if (!username || !username.trim()) {
      return res.status(400).json({ message: "username은 필수입니다." });
    }
    const name = username.trim();

    const existsName = await User.exists({ username: name });
    if (existsName) return res.status(409).json({ message: "이미 사용 중인 username입니다." });

    let user = await User.findOne({ firebaseUid })
      .select("_id username bio profileImageUrl followers following");
    if (!user) {
      user = await User.create({
        firebaseUid,
        username: name,
        bio: bio || "",
        profileImageUrl: profileImageUrl || "",
        followers: [],
        following: [],
      });
    }

    const { followerCount, followingCount } = countsOf(user);
    return res.status(201).json({
      _id: user._id,
      username: user.username,
      bio: user.bio,
      profileImageUrl: user.profileImageUrl,
      followerCount,
      followingCount,
    });
  } catch (err) {
    console.error("registerUser error", err);
    return res.status(500).json({ message: "서버 오류" });
  }
};

// 내 프로필 조회 — 없으면 자동 생성
exports.getMe = async (req, res) => {
  try {
    const { firebaseUid, firebaseEmail } = req;
    if (!firebaseUid) return res.status(401).json({ message: "인증 필요" });

    const me = await ensureUser(firebaseUid, firebaseEmail);
    const { followerCount, followingCount } = countsOf(me);

    return res.json({
      _id: me._id,
      username: me.username,
      bio: me.bio,
      profileImageUrl: me.profileImageUrl,
      followerCount,
      followingCount,
    });
  } catch (err) {
    console.error("getMe error", err);
    return res.status(500).json({ message: "서버 오류" });
  }
};

// 내 프로필 수정 — 없으면 자동 생성 후 수정
exports.updateMe = async (req, res) => {
  try {
    const { firebaseUid, firebaseEmail } = req;
    if (!firebaseUid) return res.status(401).json({ message: "인증 필요" });

    const me = await ensureUser(firebaseUid, firebaseEmail);

    const updates = {};
    if (typeof req.body.username === "string") {
      const name = req.body.username.trim();
      if (!name) return res.status(400).json({ message: "username은 비울 수 없습니다." });
      const dup = await User.exists({ username: name, firebaseUid: { $ne: firebaseUid } });
      if (dup) return res.status(409).json({ message: "이미 사용 중인 username입니다." });
      updates.username = name;
    }
    if (typeof req.body.bio === "string") updates.bio = req.body.bio;
    if (typeof req.body.profileImageUrl === "string") updates.profileImageUrl = req.body.profileImageUrl;

    Object.assign(me, updates);
    await me.save();

    return res.json({
      _id: me._id,
      username: me.username,
      bio: me.bio,
      profileImageUrl: me.profileImageUrl,
    });
  } catch (err) {
    console.error("updateMe error", err);
    return res.status(500).json({ message: "서버 오류" });
  }
};

// 특정 유저(상대방)
exports.getUserById = async (req, res) => {
  try {
    const targetId = req.params.id;
    const u = await User.findById(targetId)
      .select("_id username bio profileImageUrl followers following")
      .lean();
    if (!u) return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });

    return res.json({
      _id: u._id,
      username: u.username,
      bio: u.bio,
      profileImageUrl: u.profileImageUrl,
      followerCount: u.followers?.length || 0,
      followingCount: u.following?.length || 0,
    });
  } catch (err) {
    console.error("getUserById error", err);
    return res.status(500).json({ message: "서버 오류" });
  }
};

// 팔로우 상태
exports.getFollowStatus = async (req, res) => {
  try {
    const { firebaseUid } = req;
    if (!firebaseUid) return res.status(401).json({ message: "인증 필요" });

    const me = await User.findOne({ firebaseUid }).select("_id").lean();
    if (!me) return res.status(404).json({ message: "내 계정을 찾을 수 없습니다." });

    const targetId = req.params.id;
    if (String(me._id) === String(targetId)) {
      return res.json({ isFollowing: false, isMe: true });
    }

    const exists = await User.exists({ _id: me._id, following: targetId });
    return res.json({ isFollowing: !!exists, isMe: false });
  } catch (err) {
    console.error("getFollowStatus error", err);
    return res.status(500).json({ message: "서버 오류" });
  }
};

// 팔로우
exports.followUser = async (req, res) => {
  try {
    const { firebaseUid } = req;
    if (!firebaseUid) return res.status(401).json({ message: "인증 필요" });

    const me = await User.findOne({ firebaseUid }).select("_id");
    if (!me) return res.status(404).json({ message: "내 계정을 찾을 수 없습니다." });

    const targetId = req.params.id;
    if (String(me._id) === String(targetId)) {
      return res.status(400).json({ message: "자기 자신은 팔로우할 수 없습니다." });
    }

    await User.updateOne({ _id: me._id }, { $addToSet: { following: targetId } });
    await User.updateOne({ _id: targetId }, { $addToSet: { followers: me._id } });

    const [meAfter, targetAfter] = await Promise.all([
      User.findById(me._id).select("following").lean(),
      User.findById(targetId).select("followers").lean(),
    ]);

    return res.status(200).json({
      message: "팔로우 완료",
      followingCount: meAfter.following.length,
      followerCount: targetAfter.followers.length,
    });
  } catch (err) {
    console.error("followUser error", err);
    return res.status(500).json({ message: "서버 오류" });
  }
};

// 언팔로우
exports.unfollowUser = async (req, res) => {
  try {
    const { firebaseUid } = req;
    if (!firebaseUid) return res.status(401).json({ message: "인증 필요" });

    const me = await User.findOne({ firebaseUid }).select("_id");
    if (!me) return res.status(404).json({ message: "내 계정을 찾을 수 없습니다." });

    const targetId = req.params.id;

    await User.updateOne({ _id: me._id }, { $pull: { following: targetId } });
    await User.updateOne({ _id: targetId }, { $pull: { followers: me._id } });

    const [meAfter, targetAfter] = await Promise.all([
      User.findById(me._id).select("following").lean(),
      User.findById(targetId).select("followers").lean(),
    ]);

    return res.status(200).json({
      message: "언팔로우 완료",
      followingCount: meAfter.following.length,
      followerCount: targetAfter.followers.length,
    });
  } catch (err) {
    console.error("unfollowUser error", err);
    return res.status(500).json({ message: "서버 오류" });
  }
};
