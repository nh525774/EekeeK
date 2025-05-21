const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");

//알림 생성
router.post("/", async (req, res) => {
    try {
        const { userId, message, type } = req.body;

        if (!userId || !message) {
            return res.status(400).json({ success: false, message: "userId와 message 필수"});
        }

        const newNotif = new Notification({
            userId,
            message,
            type: type || "info",
        });

        await newNotif.save();
        res.status(201).json({ success: true, data: newNotif });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

//알림 조회
router.get("/:userId", async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.params.userId }).sort ({ createdAt : -1 });
        res.json({success: true, data: notifications });
    } catch (err) {
        res.status(500).json({success: false, message: err.message });
    }
});

module.exports = router;