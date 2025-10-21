// routes/eekrewRoutes.js (CJS)
const express = require("express");

const firebaseAuth = require("../middleware/firebaseAuth");
const User = require("../models/User");
const {
  listMyEekrewUsers,
  toggleEekrewUser,
  isInMyEekrew,
} = require("../controllers/eekrewController");

const router = express.Router();

// Firebase 토큰 → DB 유저로 매핑해서 req.user.id 세팅
async function attachUserFromFirebase(req, res, next) {
  try {
    // firebaseAuth가 uid를 어디에 두는지에 맞춰 유연하게 처리
    const uid = req.firebaseUid || req.user?.uid || req.decodedToken?.uid;
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const me = await User.findOne({ firebaseUid: uid }).select("_id");
    if (!me) return res.status(401).json({ message: "User not found" });

    req.user = { id: String(me._id) }; // 컨트롤러가 기대하는 형태
    next();
  } catch (e) {
    console.error("attachUserFromFirebase error", e);
    res.status(500).json({ message: "Auth mapping failed" });
  }
}

// ✅ eekrew 전 라우트에 Firebase 인증 + 매핑 적용
router.use(firebaseAuth, attachUserFromFirebase);

router.get("/my-users", listMyEekrewUsers);
router.get("/is/:targetId", isInMyEekrew);
router.post("/toggle/:targetId", toggleEekrewUser);

module.exports = router;