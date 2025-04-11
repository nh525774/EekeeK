const express = require('express');
const router = ewpress.Router();
const Post = require('../models/Post');
const firebaseAuth = require('../middleware/firebaseAuth');

router.post('/', firebaseAuth, async (req, res) => {
    try {
        const newPost = new Post({
            userId: req.firebaseUid,
            title: req.body.title,
            content: req.body.content,
        });

        const saved = await newPost.save();
        res.status(201).json(saved);
    } catch (err) {
        console.error("게시글 저장 실패:", err);
        res.status(500).json({message: '게시글 저장 실패'});
    }
});

// 모든 게시글 조회 (인증 필요 없이 공개)
router.get('/', async (req, res) => {
    try {
      const posts = await Post.find().sort({ createdAt: -1 });
      res.json(posts);
    } catch (err) {
      res.status(500).json({ message: '게시글 조회 실패' });
    }
  });
  
  module.exports = router;