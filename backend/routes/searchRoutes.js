const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const firebaseAuth = require('../middleware/firebaseAuth');

//사용자 검색
router.get('/users', firebaseAuth, async (req, res) => {
    const { q } = req.query;
    try {
        const users = await User.find({ username: new RegExp(q, 'i')}).select('username profileImageUrl');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message : '사용자 검색 실패', error : err.message });
    }
});

//게시글 검색
router.get('/posts', async (req, res) => {
    const { q } = req.query;
    try {
        const posts = await Post.find({
            $or: [
                { title: new RegExp(q, 'i')},
                { content: new RegExp(q, 'i') },
            ]
        }).sort({ createdAt : -1 });
        res.json(posts);
    } catch(err) {
        res.status(500).json({ message : '게시글 검색 실패', error: err.message });
    }
});

module.exports = router;