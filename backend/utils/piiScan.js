// backend/utils/piiScan.js
const { spawn } = require("node:child_process");

/** --- 기존 그대로 --- */
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

function scanTextWithPy(text, { timeoutMs = 15000 } = {}) {
  return new Promise((resolve) => {
    if ((text || "").length > 4000) {
      return resolve({ ok: true, hits: quickRegexScan(text), skipped: "too_long" });
    }

    const child = spawn(process.env.PYTHON_BIN || "python", ["ai_server/pii/pii_scan_cli.py", "--warn-only"], {
      env: {
        ...process.env,
        TRANSFORMERS_NO_TORCHVISION: "1",
        HF_HUB_DISABLE_TELEMETRY: "1",
        PYTHONIOENCODING: "utf-8",
      },
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "", stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    const killer = setTimeout(() => {
      try { child.kill("SIGKILL"); } catch {}
    }, timeoutMs);

    child.on("exit", () => {
      clearTimeout(killer);
      try {
        const parsed = JSON.parse(stdout || "{}"); // { hits: [{start,end,type,score?}], ...}
        resolve({ ok: true, ...parsed, stderr });
      } catch (e) {
        resolve({
          ok: false,
          error: "PY_SCAN_FAILED",
          stderr,
          hits: quickRegexScan(text),
          fallback: "regex_only",
        });
      }
    });

    try { child.stdin.write(text || ""); child.stdin.end(); } catch {}
  });
}

/** --- 새로 추가: 범위 정규화(겹침/정렬/클램프) --- */
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

  // 겹치는 영역 병합(타입은 보존 어려우니 첫 항목 기준)
  const merged = [];
  for (const h of arr) {
    if (!merged.length) { merged.push({ ...h }); continue; }
    const last = merged[merged.length - 1];
    if (h.start <= last.end) {
      // overlap → 확장
      last.end = Math.max(last.end, h.end);
      // type/score는 유지
    } else {
      merged.push({ ...h });
    }
  }
  return merged;
}

/** --- 새로 추가: hits 기준으로 별표 마스킹 --- */
function maskByHits(text, hits = [], maskChar = "*") {
  if (!text || !hits.length) return text || "";
  const pieces = [];
  let cursor = 0;
  for (const h of hits) {
    if (h.start > cursor) pieces.push(text.slice(cursor, h.start));
    const len = [...text.slice(h.start, h.end)].length; // 유니코드 길이
    pieces.push(maskChar.repeat(len));
    cursor = h.end;
  }
  if (cursor < text.length) pieces.push(text.slice(cursor));
  return pieces.join("");
}

module.exports = {
  quickRegexScan,
  scanTextWithPy,
  normalizeHits,
  maskByHits,
};
