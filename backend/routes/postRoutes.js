const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const firebaseAuth = require('../middleware/firebaseAuth');


router.post('/', firebaseAuth, async (req, res) => {
  
  console.log("📥 요청 body:", req.body);
    try {
        const newPost = new Post({
            userId: req.firebaseUid,
            title: req.body.title,
            content: req.body.content,
            imageUrls: req.body.imageUrls,
            videoUrl: req.body.videoUrl,
        });

        const saved = await newPost.save();
        res.status(201).json({ success: true, data: saved });
    } catch (err) {
        console.error("게시글 저장 실패:", err);
        res.status(500).json({success: false, message: '게시글 저장 실패'});
    }
});

    

// 모든 게시글 조회 (인증 필요 없이 공개)
router.get('/', async (req, res) => {
    try {
      const posts = await Post.find().sort({ createdAt: -1 });
      res.json({ success: true, data: posts });
    } catch (err) {
      res.status(500).json({ message: '게시글 조회 실패' });
    }
  });

  // 내 게시글만 조회 (인증 필요)
router.get('/mine', firebaseAuth, async (req, res) => {
    try {
      const myPosts = await Post.find({ userId: req.firebaseUid }).sort({ createdAt: -1 });
      res.json({ success: true, data: myPosts });
    } catch (err) {
      res.status(500).json({ message: '내 게시글 조회 실패', error: err.message });
    }
});

  // 게시글 ID로 단일 조회 (공개)
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: '게시글 없음' });

    res.json({ success: true, data: post });
  } catch (err) {
    res.status(500).json({ success: false, message: '게시글 조회 실패', error: err.message });
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
        res.json({ success: true, message: "게시글 삭제 완료" });
    } catch (err) {
        res.status(500).json({ message : "삭제 중 오류 발생", error: err.message });
    }
});

//게시글 좋아요
router.get('/:id/like', firebaseAuth, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.firebaseUid;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success : false, msg: "게시글 없음"});

    if (!post.likes.includes(userId)) {
      post.likes.push(userId);
      await post.save();
    }

    res.json({ success: true, likes: post.likes });
  } catch (err) {
    console.error("좋아요 실패:", err);
    res.status(500).json({ success: false, msg: "좋아요 실패" });
  }
});

// 게시글 좋아요 취소
router.get('/:id/unlike', firebaseAuth, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.firebaseUid;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, msg: "게시글 없음" });

    if (post.likes.includes(userId)) {
      post.likes = post.likes.filter(uid => uid !== userId);
      await post.save();
    }

    res.json({ success: true, likes: post.likes });
  } catch (err) {
    console.error("좋아요 취소 실패:", err);
    res.status(500).json({ success: false, msg: "좋아요 취소 실패" });
  }
});

module.exports = router;