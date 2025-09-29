const { spawn } = require("node:child_process");

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

    const child = spawn("python", ["ai_server/pii/pii_scan_cli.py", "--warn-only"], {
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

    const killer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);

    child.on("exit", () => {
      clearTimeout(killer);
      try {
        const parsed = JSON.parse(stdout || "{}");
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

module.exports = { quickRegexScan, scanTextWithPy };
