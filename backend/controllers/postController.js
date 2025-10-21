import Eekrew from "../models/Eekrew.js";
import Post from "../models/Post.js";

// 사용자가 속한 크루 목록을 먼저 구한 뒤, $or에 포함
export const getFeed = async (req, res) => {
  const userId = req.user.id;

  // 내가 멤버인 eekrew id들
  const myCrews = await Eekrew.find({ members: userId }).select("_id");
  const myCrewIds = myCrews.map((c) => c._id);

  // 기존 mutuals 조건(예: 서로 팔로우 상태)을 담은 쿼리가 alreadyMutuals 라고 가정
  // 예시: { visibility:"mutuals", user: { $in: mutualUserIds } }
  const mutualsFilter = { visibility: "mutuals", /* ...기존 조건 유지... */ };

  const query = {
    $or: [
      { visibility: "public" },
      mutualsFilter,
      { visibility: "eekrew", crewIds: { $in: myCrewIds } }, // ★ eekrew 조건
    ],
  };

  const posts = await Post.find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("user", "_id username avatar")
    .lean();

  res.json(posts);
};