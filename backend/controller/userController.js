import User from "../models/User.js";

// 팔로우
export const followUser = async (req, res) => {
  try {
    const myId = req.user.id;
    const targetId = req.params.id;

    if (myId === targetId) {
      return res.status(400).json({ message: "자기 자신은 팔로우할 수 없습니다." });
    }

    const me = await User.findById(myId);
    const target = await User.findById(targetId);

    if (!target) {
      return res.status(404).json({ message: "대상 유저를 찾을 수 없습니다." });
    }

    if (me.following.includes(targetId)) {
      return res.status(400).json({ message: "이미 팔로우 중입니다." });
    }

    me.following.push(targetId);
    target.followers.push(myId);

    await me.save();
    await target.save();

    res.status(200).json({ message: "팔로우 완료" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 언팔로우
export const unfollowUser = async (req, res) => {
  try {
    const myId = req.user.id;
    const targetId = req.params.id;

    const me = await User.findById(myId);
    const target = await User.findById(targetId);

    if (!target) {
      return res.status(404).json({ message: "대상 유저를 찾을 수 없습니다." });
    }

    if (!me.following.includes(targetId)) {
      return res.status(400).json({ message: "팔로우 상태가 아닙니다." });
    }

    me.following = me.following.filter(id => id.toString() !== targetId);
    target.followers = target.followers.filter(id => id.toString() !== myId);

    await me.save();
    await target.save();

    res.status(200).json({ message: "언팔로우 완료" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 팔로우 여부 조회
export const getFollowStatus = async (req, res) => {
  try {
    const myId = req.user.id;
    const targetId = req.params.id;

    if (myId === targetId) {
      return res.status(200).json({ isFollowing: false, isMe: true });
    }

    const me = await User.findById(myId);

    const isFollowing = me.following.includes(targetId);
    res.status(200).json({ isFollowing, isMe: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
