import User from "../models/User.js";
import mongoose from "mongoose";


//내 프로필 조회
export const getMe = async (req, res) => {
  try {
    const me = await User.findOne({ firebaseUid: req.firebaseUid });
    if (!me) return res.status(404).json({ message: "프로필 정보가 없습니다." });
    res.json(me);
  } catch (err) {
    res.status(500).json({ message: "프로필 조회 실패", error: err.message });
  }
};

// 내 프로필 수정
export const updateMe = async (req, res) => {
  try {
    const updates = {};

    if (typeof req.body.username === "string") updates.username = req.body.username;
    if (typeof req.body.bio === "string") updates.bio = req.body.bio;
    if (typeof req.body.profileImageUrl === "string") updates.profileImageUrl = req.body.profileImageUrl;

    const updated = await User.findOneAndUpdate(
      { firebaseUid: req.firebaseUid },
      { $set: updates },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "유저 없음"});
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "프로필 수정 실패", error: err.message });
  }
};

//최초 등록
export const registerUser = async (req, res) => {
  try {
    const exists = await User.exists({ firebaseUid: req.firebaseUid });
    if (exists) return res.status(400).json({ message: "이미 등록된 사용자입니다." });

    const { username = "", bio = "", profileImageUrl = "" } = req.body;
    const saved = await new User({
      firebaseUid: req.firebaseUid,
      username,
      bio,
      profileImageUrl,
    }).save();

    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: "등록 실패", error: err.message });
  }
};

// firebaseUid로 유저 조회
export const getByFirebaseUid = async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid });
    if (!user) return res.status(404).json({ success: false, message: "사용자 없음" });
    res.json({ succeess : true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: "유저 조회 실패", error: err.message });
  }
};


// 팔로우
export const followUser = async (req, res) => {
  try {
    const me = await User.findOne({ firebaseUid: req.firebaseUid });
    if (!me) return res.status(404).json({ message: "내 계정을 찾을 수 없습니다." });


    const targetId = req.params.id;
    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: "잘못된 대상 ID" });
    }
    if (me._id.equals(targetId)) {
      return res.status(400).json({ message: "자기 자신은 팔로우할 수 없습니다." })
    }
     const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ message: "대상 유저를 찾을 수 없습니다." });

    if (me.following.some((id) => id.equals(targetId))) {
      return res.status(400).json({ message: "이미 팔로우 중입니다." });
    }

    //원자적 업데이트
    await Promise.all([
      User.findByIdAndUpdate(me._id, { $addToSet: { follosing: targetId } }),
      User.findByIdAndUpdate(targetId, { $addToSet: { followers: me._id } }),
    ]);

    res.status(200).json({ message: "팔로우 완료" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 언팔로우
export const unfollowUser = async (req, res) => {
  try {
    const me = await User.findOne({ firebaseUid: req.firebaseUid });
    if (!me) return res.status(404).json({ message: "내 계정을 찾을 수 없습니다." });

    const targetId = req.params.id;
    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: "잘못된 대상 ID" });
    }

    const target = await User.findById(targetId);
    if (!target) {
      return res.status(404).json({ message: "대상 유저를 찾을 수 없습니다." });
    }

    if (!me.following.includes(targetId)) {
      return res.status(400).json({ message: "팔로우 상태가 아닙니다." });
    }

    await Promise.all([
      User.findByIdAndUpdate(me._id, { $pull: { following: targetId } }),
      User.findByIdAndUpdate(targetId, { $pull: { followers: me._id } }),
    ]);

    res.status(200).json({ message: "언팔로우 완료" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 팔로우 여부 조회
export const getFollowStatus = async (req, res) => {
  try {
    const me = await User.findOne({ firebaseUid: req.firebaseUid });
    if (!me) return res.status(404).json({ message: "내 계정을 찾을 수 없습니다." });

    const targetId = req.params.id;
    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: "잘못된 대상 ID" });
    }

    if (me._id.equals(targetId)) {
      return res.status(200).json({ isFollowing: flase, isMe: true });
    }

    const isFollowing = me.following.some((id) => id.equals(targetId)); 
    res.status(200).json({ isFollowing, isMe: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
