const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { execFile } = require('child_process');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

//  /api/protect-analyze
router.post('/protect-analyze', upload.array('image', 4), (req, res) => {
   const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No images provided" });
  }

  const results = [];
  let completed = 0;

  files.forEach(file => {
    const imagePath = file.path;

  execFile('python', ['ai_server/detect_entry.py', imagePath], (error, stdout, stderr) => {
    if (error) {
      console.error('Detection error:', error);
      results.push(null);
    } else {
      try {
          const lines = stdout.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const result = JSON.parse(lastLine);
          results.push(result);
          } catch (err) {
            console.error('❌ JSON parse error:', err);
            results.push(null);
          }
    }

    completed++;
      if (completed === files.length) {
        const validResults = results.filter(Boolean);
        if (validResults.length === 0) {
          res.status(500).json({ error: "All detections failed" });
        } else {
          res.json({ results: validResults });
        }
      }
  });
});
});


// /api/protect-mosaic
router.post('/protect-mosaic', upload.array('image', 4), (req, res) => {
  console.log("💬 서버에서 받은 selected 값:", req.body.selected);

  let selected;
  try {
    selected = JSON.parse(req.body.selected);
  } catch (e) {
    return res.status(400).json({ error: "Invalid selected JSON" });
  }

  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No image files provided" });
  }

  const results = [];
  let completed = 0;

  files.forEach(file => {
    const imagePath = file.path;

  execFile('python', ['ai_server/mosaic_entry.py', imagePath, JSON.stringify(selected)], (error, stdout, stderr) => {
    if (error) {
      console.error('Mosaic error:', error);
      results.push(null);
    } else {
      try {
          const lines = stdout.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const result = JSON.parse(lastLine);

          if (typeof result === 'string') {
            results.push(result);
          } else if (result.url) {
            results.push(result.url);
          } else {
            results.push(...Object.values(result));
          }
        } catch (err) {
          console.error('❌ JSON parse error:', err);
          results.push(null);
        }
    }
    completed++;
      if (completed === files.length) {
        const validUrls = results.filter(r => typeof r === "string" && r.startsWith("/static/"));
        if (validUrls.length === 0) {
          res.status(500).json({ error: "All mosaic processes failed" });
        } else {
          res.json({ urls: validUrls });
        }
      }
    });
  });
});


// /api/protect-video-analyze
router.post('/protect-video-analyze', upload.single('video'), (req, res) => {
  const videoPath = req.file.path;

  execFile('python', ['ai_server/video_analyze.py', videoPath], (error, stdout, stderr) => {
    if (error) {
      console.error('Video Analyze error:', error);
      return res.status(500).json({ error: 'Video analyze failed' });
    }

    try {
      const lines = stdout.trim().split('\n');
      const lastLine = lines[lines.length - 1];  // 마지막 줄만 JSON으로 간주
      const result = JSON.parse(lastLine);
      res.json(result);
    } catch (err) {
      console.error('❌ JSON parse error:', err);
      console.error('📤 stdout:', stdout);
      console.error('📛 stderr:', stderr);
      res.status(500).json({ error: 'Invalid JSON from Python' });
    }
  });
});


// /api/protect-video-mosaic
router.post('/protect-video-mosaic', upload.single('video'), (req, res) => {
  const videoPath = req.file.path;
  const selected = JSON.parse(req.body.selected); // 예: ["faces", "phones"]

  execFile('python', ['ai_server/video_mosaic.py', videoPath, JSON.stringify(selected)], (error, stdout, stderr) => {
    if (error) {
      console.error('Video Mosaic error:', error);
      return res.status(500).json({ error: 'Video mosaic failed' });
    }

    try {
      const lines = stdout.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const result = JSON.parse(lastLine); // ✅ { url: ... }
      res.json(result);
    } catch (err) {
      console.error('JSON parse error:', err);
      console.error('stdout:', stdout);
      res.status(500).json({ error: 'Invalid JSON from Python' });
    }
  });
});

module.exports = router;
