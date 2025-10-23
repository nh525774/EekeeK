// backend/utils/piiScan.js
const { postJson } = require("../src/lib/aiClient"); // ← FastAPI 공용 클라이언트

function quickRegexScan(text) {
  const hits = [];
  const phone = /0\d{1,2}[- ]?\d{3,4}[- ]?\d{4}/g;
  const email = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const idnum = /\d{6}-\d{7}/g;
  for (const m of text.matchAll(phone)) hits.push({ type: "phone", start: m.index, end: m.index + m[0].length, value: m[0] });
  for (const m of text.matchAll(email)) hits.push({ type: "email", start: m.index, end: m.index + m[0].length, value: m[0] });
  for (const m of text.matchAll(idnum)) hits.push({ type: "rrn", start: m.index, end: m.index + m[0].length, value: m[0] });
  return hits;
}

/** FastAPI NER 호출로 교체 (이름은 유지해 commentRoutes 수정 불필요) */
async function scanTextWithPy(text, { timeoutMs = 15000 } = {}) {
  if ((text || "").length > 4000) {
    return { ok: true, hits: quickRegexScan(text), skipped: "too_long" };
  }
  try {
    const data = await postJson("/protect-pii-text", { text });
    // FastAPI serve.py: { ok, hits:[{start,end,type...}], message, error }
    return { ok: !!data.ok, hits: data.hits || [], message: data.message, error: data.error };
  } catch (e) {
    return { ok: false, error: "AI_HTTP_FAILED", hits: quickRegexScan(text), fallback: "regex_only" };
  }
}

/** 기존 normalize/mask 유틸은 그대로 */
function normalizeHits(text, hits = []) {
  const n = (text || "").length;
  const arr = hits
    .map(h => ({
      start: Math.max(0, Math.min(n, Number(h.start))),
      end: Math.max(0, Math.min(n, Number(h.end))),
      type: h.type || "",
      score: typeof h.score === "number" ? h.score : undefined,
    }))
    .filter(h => Number.isFinite(h.start) && Number.isFinite(h.end) && h.end > h.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const merged = [];
  for (const h of arr) {
    if (!merged.length) { merged.push({ ...h }); continue; }
    const last = merged[merged.length - 1];
    if (h.start <= last.end) {
      last.end = Math.max(last.end, h.end);
    } else {
      merged.push({ ...h });
    }
  }
  return merged;
}

function maskByHits(text, hits = [], maskChar = "*") {
  if (!text || !hits.length) return text || "";
  const pieces = [];
  let cursor = 0;
  for (const h of hits) {
    if (h.start > cursor) pieces.push(text.slice(cursor, h.start));
    const len = [...text.slice(h.start, h.end)].length;
    pieces.push(maskChar.repeat(len));
    cursor = h.end;
  }
  if (cursor < text.length) pieces.push(text.slice(cursor));
  return pieces.join("");
}

module.exports = {
  quickRegexScan,
  scanTextWithPy,   // ← 이름 동일(호출부 유지)
  normalizeHits,
  maskByHits,
};
