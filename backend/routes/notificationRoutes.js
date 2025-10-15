const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const User = require("../models/User");
const firebaseAuth = require("../middleware/firebaseAuth");

// 알림 생성
router.post("/", firebaseAuth, async (req, res) => {
  try {
    const sender = await User.findOne({ firebaseUid: req.firebaseUid });
    if (!sender) return res.status(404).json({ success: false, message: "사용자 없음" });

    const { receiverId, message, type, data } = req.body;

    // ✅ 버그 수정: '|' → '||'
    if (!receiverId || !message) {
      return res.status(400).json({ success: false, message: "Id와 message 필수" });
    }

    const newNotif = new Notification({
      senderId: sender._id,
      receiverId,
      message,
      type: type || "info",   // "post_like" | "post_comment" | "follow" 등
      data: data || {},       // { postId }, { userId } 등
      createdAt: new Date(),
    });

    await newNotif.save();
    res.status(201).json({ success: true, data: newNotif });
  } catch (err) {
    console.error("알림 생성 오류:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ 내 알림 조회 (/me로 통일)
router.get("/me", firebaseAuth, async (req, res) => {
  try {
    const me = await User.findOne({ firebaseUid: req.firebaseUid }).select("_id");
    if (!me) return res.status(404).json({ success: false, message: "사용자 없음" });

    const notifications = await Notification.find({ receiverId: me._id })
      .sort({ createdAt: -1 })
      .populate("senderId", "username profileImageUrl");

    res.json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
