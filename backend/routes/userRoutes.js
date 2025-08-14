const express = require('express');
const router = express.Router();

const firebaseAuth = require('../middleware/firebaseAuth');
const {
  getMe, updateMe, registerUser, getByFirebaseUid, followUser, unfollowUser, getFollowStatus,
} = require("../controllers/userController");

// 프로필
router.get("/me", firebaseAuth, getMe);
router.patch("/me", firebaseAuth, updateMe);
router.post("/", firebaseAuth, registerUser);
router.get("/firebase/:firebaseUid", firebaseAuth, getByFirebaseUid);

// 팔로우
router.get("/:id/follow-status", firebaseAuth, getFollowStatus);
router.post("/:id/follow", firebaseAuth, followUser);
router.post("/:id/unfollow", firebaseAuth, unfollowUser);

module.exports = router;