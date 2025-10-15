const express = require("express");
const { scanTextWithPy, quickRegexScan } = require("../utils/piiScan");

const router = express.Router();

router.post("/scan-text", async (req, res) => {
  try {
    const { text = "", mode = "auto" } = req.body || {};
    if (mode === "regex") {
      return res.json({ ok: true, hits: quickRegexScan(text), fallback: "regex_only" });
    }
    const out = await scanTextWithPy(text);
    return res.json(out);
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e), hits: quickRegexScan(req.body?.text || ""), fallback: "regex_only" });
  }
});

module.exports = router;

