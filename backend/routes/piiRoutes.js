const express = require("express");
const router = express.Router();
const { postJson } = require("../src/lib/aiClient");

// NER 기반 텍스트 PII 스캔 (FastAPI: /protect-pii-text)
router.post("/protect-pii-text", async (req, res) => {
  try {
    const { text = "" } = req.body || {};
    if (!text.trim()) return res.status(400).json({ ok: false, message: "empty text" });

    const data = await postJson("/protect-pii-text", { text });
    return res.json(data);
  } catch (e) {
    console.error("protect-pii-text error:", e?.response?.data || e);
    return res.status(500).json({ ok: false, message: "AI NER failed" });
  }
});

// 호환: 기존 경로가 /scan-text였으면 유지
router.post("/scan-text", async (req, res) => {
  try {
    const { text = "" } = req.body || {};
    const data = await postJson("/protect-pii-text", { text });
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ ok: false, message: "AI NER failed" });
  }
});

module.exports = router;

