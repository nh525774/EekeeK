# backend/ai_server/serve.py
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os, sys, json, tempfile, subprocess, shlex

app = FastAPI(title="EekeeK AI Server", version="1.0.0")

# ─────────────────────────────────────────────────────────
# 경로/실행 환경
# ─────────────────────────────────────────────────────────
PYTHON_BIN = os.environ.get("PYTHON_BIN") or sys.executable
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# pii 모듈 import 경로 보정 (ai_server/pii/…)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
pii_dir = os.path.join(BASE_DIR, "pii")
if os.path.isdir(pii_dir) and pii_dir not in sys.path:
    sys.path.insert(0, pii_dir)

# ─────────────────────────────────────────────────────────
# NER 모듈 (네가 올려준 warn_base 이용)
# ─────────────────────────────────────────────────────────
try:
    from pii_scan_warn_base import scan_text_warn_only_base  # ai_server/pii/pii_scan_warn_base.py
except Exception as e:
    scan_text_warn_only_base = None  # 없거나 import 실패 시 에러로 처리

# ─────────────────────────────────────────────────────────
# 유틸
# ─────────────────────────────────────────────────────────
def _temp_write(upload: UploadFile) -> str:
    """UploadFile을 임시 경로에 저장하고 파일 경로 반환"""
    _, ext = os.path.splitext(upload.filename or "")
    fd, path = tempfile.mkstemp(prefix="eek_", suffix=ext or "")
    with os.fdopen(fd, "wb") as f:
        f.write(upload.file.read())
    return path

def _run_py(rel_script: str, args: List[str]) -> Dict[str, Any]:
    """
    파이썬 스크립트를 실행하고 '마지막 줄 JSON'을 파싱해 dict로 반환.
    (기존 Node의 parseLastJsonLine 계약과 동일)
    """
    script = os.path.join(BASE_DIR, rel_script)
    cmd = [PYTHON_BIN, script, *args]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        err = proc.stderr.strip() or proc.stdout.strip() or f"Process failed: {shlex.join(cmd)}"
        raise RuntimeError(err)
    stdout = (proc.stdout or "").strip()
    last = (stdout.splitlines() or ["{}"])[-1]
    try:
        return json.loads(last)
    except Exception:
        return {"raw": stdout}

# ─────────────────────────────────────────────────────────
# 헬스체크
# ─────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"ok": True, "service": "EekeeK AI", "version": "1.0.0"}

# ─────────────────────────────────────────────────────────
# 1) /protect-analyze : 이미지 분석 (detect_entry.py)
#    Express: POST /api/protect-analyze  (multer array)
#    반환: 각 이미지별 분석 JSON 리스트
# ─────────────────────────────────────────────────────────
@app.post("/protect-analyze")
async def protect_analyze(image: List[UploadFile] = File(...)):
    if not image:
        return JSONResponse({"error": "No images provided"}, status_code=400)

    temps, results = [], []
    try:
        for f in image:
            p = _temp_write(f)
            temps.append(p)
        for p in temps:
            out = _run_py("detect_entry.py", [p])
            results.append(out)
        return {"results": results}
    finally:
        for p in temps:
            try: os.remove(p)
            except: pass

# ─────────────────────────────────────────────────────────
# 2) /protect-mosaic : 이미지 모자이크 (mosaic_entry.py)
#    Express: POST /api/protect-mosaic
#      - fields: selected(JSON), selectedBoxes(JSON), block_size(number)
#    반환: 각 이미지별 { out_path } / { out_paths } (Node가 S3 업로드 이어서 처리)
# ─────────────────────────────────────────────────────────
@app.post("/protect-mosaic")
async def protect_mosaic(
    image: List[UploadFile] = File(...),
    selected: Optional[str] = Form("[]"),
    selectedBoxes: Optional[str] = Form("[]"),
    block_size: Optional[int] = Form(15),
):
    if not image:
        return JSONResponse({"error": "No image files provided"}, status_code=400)

    try:
        sel = json.loads(selected or "[]")
        boxes = json.loads(selectedBoxes or "[]")
    except Exception:
        return JSONResponse({"error": "Invalid selected/selectedBoxes JSON"}, status_code=400)

    temps, outs = [], []
    try:
        for f in image:
            p = _temp_write(f)
            temps.append(p)
        for p in temps:
            out = _run_py("mosaic_entry.py", [p, json.dumps(sel), json.dumps(boxes), str(block_size or 15)])
            outs.append(out)  # { out_path: "..."} or { out_paths: [...] }
        return {"results": outs}
    finally:
        # 입력 임시파일만 정리 (출력은 mosaic_entry.py가 별도 경로에 저장)
        for p in temps:
            try: os.remove(p)
            except: pass

# ─────────────────────────────────────────────────────────
# 3) /protect-video-analyze : 영상 분석 (video_analyze.py)
# ─────────────────────────────────────────────────────────
@app.post("/protect-video-analyze")
async def protect_video_analyze(video: UploadFile = File(...)):
    if not video:
        return JSONResponse({"error": "No video provided"}, status_code=400)

    temp_in = _temp_write(video)
    try:
        out = _run_py("video_analyze.py", [temp_in])
        return out
    finally:
        try: os.remove(temp_in)
        except: pass

# ─────────────────────────────────────────────────────────
# 4) /protect-video-mosaic : 영상 모자이크 (video_mosaic.py)
#    반환: { success: true, out_path: "..." }
# ─────────────────────────────────────────────────────────
@app.post("/protect-video-mosaic")
async def protect_video_mosaic(
    video: UploadFile = File(...),
    selected: Optional[str] = Form("[]"),
    selectedBoxes: Optional[str] = Form("[]"),
    block_size: Optional[int] = Form(15),
):
    if not video:
        return JSONResponse({"success": False, "msg": "No video provided"}, status_code=400)

    try:
        sel = json.loads(selected or "[]")
        boxes = json.loads(selectedBoxes or "[]")
    except Exception:
        return JSONResponse({"success": False, "msg": "Invalid JSON"}, status_code=400)

    temp_in = _temp_write(video)
    try:
        out = _run_py("video_mosaic.py", [temp_in, json.dumps(sel), json.dumps(boxes), str(block_size or 15)])
        if "out_path" not in out:
            return JSONResponse({"success": False, "msg": "Python must return { out_path } JSON"}, status_code=500)
        return {"success": True, **out}
    finally:
        try: os.remove(temp_in)
        except: pass

# ─────────────────────────────────────────────────────────
# 5) /protect-pii-text : 텍스트 NER 기반 PII 탐지 (네 모듈 호출)
#    반환: { ok, hits:[{start,end,type,...}], message(마스킹된 텍스트), error }
# ─────────────────────────────────────────────────────────
class PiiTextIn(BaseModel):
    text: str

@app.post("/protect-pii-text")
def protect_pii_text(body: PiiTextIn):
    if scan_text_warn_only_base is None:
        return {"ok": False, "error": "NER module not found (pii_scan_warn_base.py)"}
    try:
        result = scan_text_warn_only_base(body.text)
        return {
            "ok": True,
            "hits": result.get("hits", []),
            "message": result.get("message", body.text),
            "error": result.get("error"),
        }
    except Exception as e:
        return {"ok": False, "error": str(e), "hits": [], "message": body.text}

# 호환 목적: 기존 이름을 계속 쓰고 있으면 /scan-text도 같은 처리
@app.post("/scan-text")
def scan_text_alias(body: PiiTextIn):
    return protect_pii_text(body)

@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("serve:app", host="0.0.0.0", port=7000)
