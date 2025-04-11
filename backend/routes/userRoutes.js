const express = require('express');
const router = ewpress.Router();
const User = require('../models/User');
const firebaseAuth = require('../middleware/firebaseAuth');

router.get('me', firebaseAuth, async(req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.firebase });
        if (!user) return res.status(404).json({ message: '프로필 정보가 없습니다. '});

        res.json(user);
    } catch (err) {
        res.status(500).json({ message: '프로필 조회 실패', error: err.message });
    }
});

module.exports = router;