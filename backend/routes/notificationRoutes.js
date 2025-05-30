const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const User = require("../models/User");
const firebaseAuth = require("../middleware/firebaseAuth");

//알림 생성
router.post("/", firebaseAuth, async (req, res) => {
    try {
        const firebaseUid = req.firebaseUid;

        const sender = await User.findOne({ firebaseUid });
        if (!sender) {
            return res.status(404).json({ success: false, message: "사용자 없음" });
        }

        const { receiverId, message, type, data } = req.body;

        if (!receiverId| !message) {
            return res.status(400).json({ success: false, message: "Id와 message 필수"});
        }

        const newNotif = new Notification({
            senderId: sender._id,
            receiverId,
            message,
            type: type || "info",
            data: data || {},
            createdAt: new Date(),
        });

        await newNotif.save();
        res.status(201).json({ success: true, data: newNotif });
    } catch (err) {
        console.error("알림 생성 오류:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

//알림 조회 (receiverId 기준 + sender 정보 포함함)
router.get("/:receiverId", async (req, res) => {
    try {
        const notifications = await Notification.find({ receiverId: req.params.receiverId,   
         }).sort ({ createdAt : -1 })
         .populate("senderId", "username profileImageUrl"); //sender 정보 가져옴옴
    res.json({success: true, data: notifications });
    } catch (err) {
        res.status(500).json({success: false, message: err.message });
    }
});

module.exports = router;