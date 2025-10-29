const express = require("express");
const router = express.Router();
const multer = require("multer");
const { handleImageUpload, streamImage } = require("../controllers/deepfakeController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

// POST /api/deepfake/image  (폼데이터: file)
router.post("/image", upload.single("file"), handleImageUpload);

// private S3 이미지 프록시 (원본/처리본 공통)
router.get("/image/:key", streamImage);

module.exports = router;