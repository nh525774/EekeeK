// routes/protectRoutes.js
const express = require("express");
const router = express.Router();

const multer = require("multer");
const os = require("os");
const fs = require("fs");
const path = require("path");

// ✅ S3 유틸 (CommonJS 내보내기)
const { putObject } = require("../src/lib/s3");

// ✅ FastAPI 클라이언트
const { postForm } = require("../src/lib/aiClient");

// 메모리 저장소 (디스크 임시파일 최소화)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

// 파일 유틸
function guessContentTypeByExt(p) {
  const ext = (path.extname(p) || "").toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".webm") return "video/webm";
  return "application/octet-stream";
}

async function uploadLocalFileToS3(localPath, keyPrefix = "uploads/processed/") {
  const body = fs.readFileSync(localPath);
  const ct = guessContentTypeByExt(localPath);
  const key = `${keyPrefix}${Date.now()}_${path.basename(localPath)}`;
  await putObject({ Key: key, Body: body, ContentType: ct });
  const publicBase = process.env.PUBLIC_BUCKET_BASE;
  return publicBase ? `${publicBase}/${key}` : key;
}

function toFilePartsFromMulter(file, fieldName = "image") {
  if (!file) return null;
  return { fieldName, buffer: file.buffer, filename: file.originalname, contentType: file.mimetype };
}

// 1) 이미지 분석
router.post("/protect-analyze", upload.array("image", 10), async (req, res) => {
  try {
    const files = (req.files || []).map((f) => toFilePartsFromMulter(f, "image")).filter(Boolean);
    if (!files.length) return res.status(400).json({ error: "No images provided" });

    const data = await postForm("/protect-analyze", {}, files);
    // data: { results: [...] }
    return res.json(data);
  } catch (e) {
    console.error("protect-analyze error:", e?.response?.data || e);
    res.status(500).json({ error: "Detection failed" });
  }
});

// 2) 이미지 모자이크
router.post("/protect-mosaic", upload.array("image", 10), async (req, res) => {
  try {
    const files = (req.files || []).map((f) => toFilePartsFromMulter(f, "image")).filter(Boolean);
    if (!files.length) return res.status(400).json({ error: "No image files provided" });

    const fields = {
      selected: req.body.selected || "[]",
      selectedBoxes: req.body.selectedBoxes || "[]",
      block_size: req.body.block_size ? Number(req.body.block_size) : 15,
    };

    const data = await postForm("/protect-mosaic", fields, files);
    // data: { results: [ { out_path }, ... ] }  → S3 업로드하여 URL 반환
    const outUrls = [];

    for (const r of data.results || []) {
      if (Array.isArray(r.out_paths)) {
        for (const p of r.out_paths) outUrls.push(await uploadLocalFileToS3(p, "uploads/processed/images/"));
      } else if (r.out_path) {
        outUrls.push(await uploadLocalFileToS3(r.out_path, "uploads/processed/images/"));
      }
    }
    return res.json({ urls: outUrls });
  } catch (e) {
    console.error("protect-mosaic error:", e?.response?.data || e);
    res.status(500).json({ error: "Mosaic failed" });
  }
});

// 3) 비디오 분석
router.post("/protect-video-analyze", upload.single("video"), async (req, res) => {
  try {
    const f = req.file;
    if (!f) return res.status(400).json({ error: "No video provided" });

    const filePart = toFilePartsFromMulter(f, "video");
    const data = await postForm("/protect-video-analyze", {}, [filePart]);
    return res.json(data); // 분석 JSON
  } catch (e) {
    console.error("protect-video-analyze error:", e?.response?.data || e);
    res.status(500).json({ error: "Video analyze failed" });
  }
});

// 4) 비디오 모자이크
router.post("/protect-video-mosaic", upload.single("video"), async (req, res) => {
  try {
    const f = req.file;
    if (!f) return res.status(400).json({ success: false, msg: "No video provided" });

    const filePart = toFilePartsFromMulter(f, "video");
    const fields = {
      selected: req.body.selected || "[]",
      selectedBoxes: req.body.selectedBoxes || "[]",
      block_size: req.body.block_size ? Number(req.body.block_size) : 15,
    };

    const data = await postForm("/protect-video-mosaic", fields, [filePart]);
    // data: { success: true, out_path: "..." }
    if (!data?.out_path && !data?.success) return res.status(500).json({ success: false, msg: "AI failed" });

    const url = await uploadLocalFileToS3(data.out_path, "uploads/processed/videos/");
    return res.json({ success: true, url });
  } catch (e) {
    console.error("protect-video-mosaic error:", e?.response?.data || e);
    res.status(500).json({ success: false, msg: "Video mosaic failed" });
  }
});

module.exports = router;

