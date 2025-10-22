// routes/protectRoutes.js
const express = require("express");
const router = express.Router();

const multer = require("multer");
const os = require("os");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

// ✅ S3 유틸 (CommonJS 내보내기 버전이어야 함)
const { putObject } = require("../src/lib/s3"); // module.exports = { putObject, ... } 형태

// ─────────────────────────────────────────────
// 1) multer를 '메모리 저장소'로 전환 (로컬 디스크 안 씀)
// ─────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// ─────────────────────────────────────────────
// 2) 유틸 함수
// ─────────────────────────────────────────────
function writeBufferToTmp(buffer, originalname = "file") {
  const ext = path.extname(originalname) || "";
  const tmpPath = path.join(os.tmpdir(), `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  fs.writeFileSync(tmpPath, buffer);
  return tmpPath;
}

function parseLastJsonLine(stdout) {
  const lines = String(stdout || "").trim().split("\n");
  const last = lines[lines.length - 1] || "{}";
  return JSON.parse(last);
}

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
  return publicBase ? `${publicBase}/${key}` : key; // 비공개 버킷이면 presigned GET을 쓰세요
}

// ─────────────────────────────────────────────
// 3) 분석 API: /api/protect-analyze
//    (이미지 → 탐지 결과 JSON 반환)
// ─────────────────────────────────────────────
router.post("/protect-analyze", upload.array("image", 4), async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: "No images provided" });

    const results = [];
    for (const f of files) {
      const tmpIn = writeBufferToTmp(f.buffer, f.originalname);
      const out = await new Promise((resolve, reject) => {
        execFile("python", ["ai_server/detect_entry.py", tmpIn], (err, stdout, stderr) => {
          if (err) return reject(stderr || err);
          resolve(stdout);
        });
      });
      const json = parseLastJsonLine(out); // 파이썬이 마지막 줄에 JSON을 찍는 전제
      results.push(json);
    }
    res.json({ results });
  } catch (e) {
    console.error("protect-analyze error:", e);
    res.status(500).json({ error: "Detection failed" });
  }
});

// ─────────────────────────────────────────────
// 4) 이미지 모자이크: /api/protect-mosaic
//    (이미지 → 파이썬 처리 → 임시 파일 → S3 업로드 → URL 반환)
// ─────────────────────────────────────────────
router.post("/protect-mosaic", upload.array("image", 4), async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: "No image files provided" });

    const blockSize = Number(req.body.block_size) || 15;

    let selected = [];
    let selectedBoxes = [];
    try {
      selected = JSON.parse(req.body.selected || "[]");
      selectedBoxes = JSON.parse(req.body.selectedBoxes || "[]");
    } catch {
      return res.status(400).json({ error: "Invalid selected / selectedBoxes JSON" });
    }

    const outUrls = [];
    for (const f of files) {
      const tmpIn = writeBufferToTmp(f.buffer, f.originalname);

      const stdout = await new Promise((resolve, reject) => {
        execFile(
          "python",
          ["ai_server/mosaic_entry.py", tmpIn, JSON.stringify(selected), JSON.stringify(selectedBoxes), String(blockSize)],
          (err, out, errout) => (err ? reject(errout || err) : resolve(out))
        );
      });

      // 🔁 파이썬 출력 형식(권장): { out_path: "/tmp/xxx.jpg" } 또는 { out_paths: ["...","..."] }
      const result = parseLastJsonLine(stdout);

      if (Array.isArray(result.out_paths)) {
        for (const p of result.out_paths) {
          const url = await uploadLocalFileToS3(p, "uploads/processed/images/");
          outUrls.push(url);
        }
      } else if (result.out_path) {
        const url = await uploadLocalFileToS3(result.out_path, "uploads/processed/images/");
        outUrls.push(url);
      } else {
        // 과거 버전 호환: 만약 파이썬이 "/static/..."를 돌려줬다면 거절
        return res.status(500).json({ error: "Python must return out_path(s) JSON (no /static)" });
      }
    }

    res.json({ urls: outUrls });
  } catch (e) {
    console.error("protect-mosaic error:", e);
    res.status(500).json({ error: "Mosaic failed" });
  }
});

// ─────────────────────────────────────────────
// 5) 비디오 분석: /api/protect-video-analyze
// ─────────────────────────────────────────────
router.post("/protect-video-analyze", upload.single("video"), async (req, res) => {
  try {
    const f = req.file;
    if (!f) return res.status(400).json({ error: "No video provided" });

    const tmpIn = writeBufferToTmp(f.buffer, f.originalname);
    const out = await new Promise((resolve, reject) => {
      execFile("python", ["ai_server/video_analyze.py", tmpIn], (err, stdout, stderr) => {
        if (err) return reject(stderr || err);
        resolve(stdout);
      });
    });
    const json = parseLastJsonLine(out);
    res.json(json);
  } catch (e) {
    console.error("protect-video-analyze error:", e);
    res.status(500).json({ error: "Video analyze failed" });
  }
});

// ─────────────────────────────────────────────
// 6) 비디오 모자이크: /api/protect-video-mosaic
// ─────────────────────────────────────────────
router.post("/protect-video-mosaic", upload.single("video"), async (req, res) => {
  try {
    const f = req.file;
    if (!f) return res.status(400).json({ success: false, msg: "No video provided" });

    const blockSize = Number(req.body.block_size) || 15;

    let selected = [];
    let selectedBoxes = [];
    try {
      selected = JSON.parse(req.body.selected || "[]");
      selectedBoxes = JSON.parse(req.body.selectedBoxes || "[]");
    } catch {
      return res.status(400).json({ success: false, msg: "Invalid JSON" });
    }

    const tmpIn = writeBufferToTmp(f.buffer, f.originalname);

    const stdout = await new Promise((resolve, reject) => {
      execFile(
        "python",
        ["ai_server/video_mosaic.py", tmpIn, JSON.stringify(selected), JSON.stringify(selectedBoxes), String(blockSize)],
        (err, out, errout) => (err ? reject(errout || err) : resolve(out))
      );
    });

    // 권장 출력: { out_path: "/tmp/out.mp4" }
    const result = parseLastJsonLine(stdout);
    if (!result.out_path) {
      return res.status(500).json({ success: false, msg: "Python must return { out_path } JSON" });
    }

    const url = await uploadLocalFileToS3(result.out_path, "uploads/processed/videos/");
    res.json({ success: true, url });
  } catch (e) {
    console.error("protect-video-mosaic error:", e);
    res.status(500).json({ success: false, msg: "Video mosaic failed" });
  }
});

module.exports = router;
