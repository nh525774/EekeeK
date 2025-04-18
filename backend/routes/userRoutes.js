const express = require('express');
const router = express.Router();
const User = require('../models/User');
const firebaseAuth = require('../middleware/firebaseAuth');

//내 프로필 조회
router.get('/me', firebaseAuth, async(req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.firebaseUid });
        if (!user) return res.status(404).json({ message: '프로필 정보가 없습니다. '});

        res.json(user);
    } catch (err) {
        res.status(500).json({ message: '프로필 조회 실패', error: err.message });
    }
});

//내 프로필 수정
router.patch('/me', firebaseAuth, async (req, res) => {
    const updates = {
        username: req.body.username,
        bio: req.body.bio,
        profileImageUrl: req.body.profileImageUrl,
    };

    try {
        const updatedUser = await User.findOneAndUpdate(
            { firebaseUid: req.firebaseUid },
            updates,
            { new: true }
        );

        if (!updatedUser) return res.status(404).json({ message : '유저 없음 '});

        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ message : '프로필 수정 실패', error: err.message });
    }
});

//최초 로그인 시 사용자 등록
router.post('/', firebaseAuth, async (req, res) => {
    const { username, bio, profileImageUrl } = req.body;
    if (await User.exists({ firebaseUid: req.firebaseUid })) {
      return res.status(400).json({ message: '이미 등록된 사용자입니다.' });
    }
    const newUser = new User({ firebaseUid: req.firebaseUid, username, bio, profileImageUrl });
    const saved = await newUser.save();
    res.status(201).json(saved);
  });

module.exports = router;