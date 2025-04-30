const express = require('express');
const router = express.Router();
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
  

//게시글 삭제(본인만 가능)
router.delete("/:id", firebaseAuth, async(req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "게시글이 없습니다. "});

        if (post.userId !== req.firebaseUid) {
            return res.status(403).json({ message: "삭제 권한이 없습니다. "});
        }

        await Post.findByIdAndDelete(req.params.id);
        res.json({ message : "게시글 삭제 완료" });
    } catch (err) {
        res.status(500).json({ message : "삭제 중 오류 발생", error: err.message });
    }
});

// 내 게시글만 조회 (인증 필요)
router.get('/mine', firebaseAuth, async (req, res) => {
    try {
      const myPosts = await Post.find({ userId: req.firebaseUid }).sort({ createdAt: -1 });
      res.json(myPosts);
    } catch (err) {
      res.status(500).json({ message: '내 게시글 조회 실패', error: err.message });
    }
});

module.exports = router;