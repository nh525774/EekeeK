// controllers/eekrewController.js
const User = require("../models/User");

// 로그인한 내 MongoDB 사용자 id 추출(미들웨어별로 달라질 수 있어 넓게 커버)
function getMyId(req) {
  return (
    req.user?.id ||
    req.user?._id ||
    req.userId ||
    req.firebaseUid || // 네 프로젝트에서 자주 쓰던 키
    null
  );
}

// GET /api/eekrew/my-users
exports.listMyEekrewUsers = async (req, res) => {
  try {
    const myId = getMyId(req);
    if (!myId) return res.status(401).json({ message: "unauthorized" });

    const me = await User.findById(myId).populate(
      "eekrewUserIds",
      "_id username profileImageUrl avatar"
    );
    return res.json(me?.eekrewUserIds || []);
  } catch (err) {
    console.error("listMyEekrewUsers error:", err);
    return res.status(500).json({ message: "listMyEekrewUsers error" });
  }
};

// GET /api/eekrew/is/:targetId
exports.isInMyEekrew = async (req, res) => {
  try {
    const myId = getMyId(req);
    if (!myId) return res.status(401).json({ message: "unauthorized" });

    const targetId = String(req.params.targetId || "");
    const me = await User.findById(myId).select("eekrewUserIds");
    const ok = !!me?.eekrewUserIds?.some(
      (id) => String(id) === String(targetId)
    );
    return res.json({ inEekrew: ok });
  } catch (err) {
    console.error("isInMyEekrew error:", err);
    return res.status(500).json({ message: "isInMyEekrew error" });
  }
};

// POST /api/eekrew/toggle/:targetId
exports.toggleEekrewUser = async (req, res) => {
  try {
    const myId = getMyId(req);
    if (!myId) return res.status(401).json({ message: "unauthorized" });

    const targetId = String(req.params.targetId || "");
    if (!targetId) return res.status(400).json({ message: "targetId required" });
    if (String(myId) === String(targetId)) {
      return res.status(400).json({ message: "본인은 eekrew로 지정할 수 없어요." });
    }

    const me = await User.findById(myId).select("eekrewUserIds");
    if (!me) return res.status(404).json({ message: "me not found" });

    const exists = me.eekrewUserIds?.some(
      (id) => String(id) === String(targetId)
    );
    if (exists) {
      me.eekrewUserIds = me.eekrewUserIds.filter(
        (id) => String(id) !== String(targetId)
      );
    } else {
      me.eekrewUserIds = [...(me.eekrewUserIds || []), targetId];
    }

    await me.save();
    return res.json({ ok: true, inEekrew: !exists });
  } catch (err) {
    console.error("toggleEekrewUser error:", err);
    return res.status(500).json({ message: "toggleEekrewUser error" });
  }
};