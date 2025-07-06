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
router.post('/protect-analyze', upload.single('image'), (req, res) => {
  const imagePath = req.file.path;

  const process = execFile('python', ['ai_server/detect_entry.py', imagePath], (error, stdout, stderr) => {
    if (error) {
      console.error('Detection error:', error);
      return res.status(500).json({ error: 'Detection failed' });
    }
    try {
        const lines = stdout.trim().split('\n');
        const lastLine = lines[lines.length - 1];  // 마지막 줄만 JSON으로 취급
        const result = JSON.parse(lastLine);
      res.json(result);
    } catch (err) {
        console.error('❌ JSON parse error:', err);
     console.error('📤 Python stdout:', stdout);
        console.error('📛 Python stderr:', stderr);
      res.status(500).json({ error: 'Invalid JSON from Python' });
    }
  });
});

// /api/protect-mosaic
router.post('/protect-mosaic', upload.single('image'), (req, res) => {
  const imagePath = req.file.path;
  const selected = JSON.parse(req.body.selected);

  execFile('python', ['ai_server/mosaic_entry.py', imagePath, JSON.stringify(selected)], (error, stdout, stderr) => {
    if (error) {
      console.error('Mosaic error:', error);
      return res.status(500).json({ error: 'Mosaic failed' });
    }

     try {
      const lines = stdout.trim().split('\n');
      const lastLine = lines[lines.length - 1];  // ✅ 이 줄만 JSON으로 간주
      const result = JSON.parse(lastLine);
      console.log("✅ Mosaic result:", result);
      res.json(result); // ✅ { url: ... } 반환
    } catch (err) {
      console.error('❌ JSON parse error:', err);
      console.error('📤 stdout:', stdout);
      console.error('📛 stderr:', stderr);
      res.status(500).json({ error: 'Invalid mosaic result' });
    }
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
