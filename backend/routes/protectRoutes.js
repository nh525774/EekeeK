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
  const selected = JSON.parse(req.body.selected); // 예: ["phones", "license_plates"]

  const process = execFile('python', ['ai_server/mosaic_entry.py', imagePath, JSON.stringify(selected)], (error, stdout, stderr) => {
    if (error) {
      console.error('Mosaic error:', error);
      return res.status(500).json({ error: 'Mosaic failed' });
    }
    const lines = stdout.trim().split('\n');
    const outputPath = lines.find(line => line.startsWith('/static/'));
    console.log("✅ Mosaic result URL:", outputPath);
    res.json({ url: outputPath});
  });
});

module.exports = router;
