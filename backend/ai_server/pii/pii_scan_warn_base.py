import os, re, json
from typing import List, Dict
from pathlib import Path
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline

# ---- 로컬 모델 디렉터리(절대경로) 확정 ----
MODEL_DIR = (Path(__file__).resolve().parent / "ner_model").as_posix()
USE_GPU = False 

_tokenizer = None
_model = None
_pipe = None

def _load_ner():
    global _tokenizer, _model, _pipe
    if _pipe is None:
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR, local_files_only=True)
        _model = AutoModelForTokenClassification.from_pretrained(MODEL_DIR, local_files_only=True)
        _pipe = pipeline(
            "token-classification",
            model=_model,
            tokenizer=_tokenizer,
            aggregation_strategy="simple",
            device=0 if USE_GPU else -1,
        )
        print(f"[PII] Loading model from: {MODEL_DIR}")
    return _pipe

PHONE_RE = re.compile(r"0\d{1,2}[- ]?\d{3,4}[- ]?\d{4}")
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
NAME_PARTICLE_RE = re.compile(r"([가-힣]{2,4})(?=(?:이랑|랑|과|와|에게|한테|에게서|에서|이가|이|가)(?![가-힣]))")

def get_ner_hits(text: str) -> List[Dict]:
    if not text.strip():
        return []
    out = _load_ner()(text)
    hits = []
    for ent in out:
        s = int(ent.get("start", 0)); e = int(ent.get("end", 0))
        if e > s:
            hits.append({
                "start": s, "end": e,
                "type": ent.get("entity_group", "ENT"),
                "score": float(ent.get("score", 0.0)),
                "value": text[s:e],
            })
    return hits

def quick_regex_hits(text: str) -> List[Dict]:
    hits = []
    for m in PHONE_RE.finditer(text):
        hits.append({"start": m.start(), "end": m.end(), "type": "phone", "value": m.group()})
    for m in EMAIL_RE.finditer(text):
        hits.append({"start": m.start(), "end": m.end(), "type": "email", "value": m.group()})
    return hits

def name_hint_hits(text: str) -> List[Dict]:
    hits = []
    for m in NAME_PARTICLE_RE.finditer(text):
        s, e = m.start(1), m.end(1)
        hits.append({"start": s, "end": e, "type": "name_hint"})
    return hits

def normalize_hits(text: str, hits: List[Dict]) -> List[Dict]:
    n = len(text); arr = []
    for h in hits or []:
        try:
            s = max(0, min(n, int(h["start"]))); e = max(0, min(n, int(h["end"])))
        except Exception:
            continue
        if e > s: arr.append({"start": s, "end": e, "type": h.get("type", "")})
    arr.sort(key=lambda x: (x["start"], x["end"]))
    merged = []
    for h in arr:
        if not merged: merged.append(h); continue
        last = merged[-1]
        if h["start"] <= last["end"]:
            last["end"] = max(last["end"], h["end"])
        else:
            merged.append(h)
    return merged

def mask_by_hits(text: str, hits: List[Dict], ch="*") -> str:
    if not text or not hits: return text
    out, cur = [], 0
    for h in hits:
        s, e = h["start"], h["end"]
        if s > cur: out.append(text[cur:s])
        seg = text[s:e]
        out.append("".join(ch if (c.isalnum() or ('가' <= c <= '힣')) else c for c in seg))
        cur = e
    if cur < len(text): out.append(text[cur:])
    return "".join(out)

def scan_text_warn_only_base(text: str) -> Dict:
    try:
        hits_ner   = get_ner_hits(text)
        hits_regex = quick_regex_hits(text)
        hits_name  = name_hint_hits(text)
        hits_norm  = normalize_hits(text, [*hits_ner, *hits_regex, *hits_name])
        masked     = mask_by_hits(text, hits_norm)
        return {"hits": hits_norm, "message": masked, "skipped": None, "fallback": None, "error": None}
    except Exception as e:
        return {"hits": [], "message": text, "skipped": None, "fallback": "regex_only", "error": f"{type(e).__name__}: {e}"}
