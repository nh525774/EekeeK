# ai_server/pii/pii_scan_warn_base.py
import os
# 핵심: transformers가 torchvision을 끌고 오지 않게
os.environ.setdefault("TRANSFORMERS_NO_TORCHVISION", "1")
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")

from typing import List, Dict

def scan_text_warn_only_base(text: str) -> Dict:
    """
    텍스트에서 PII 후보를 찾아 경고만 반환.
    메모리 이슈/임포트 에러 시 빈 결과로 폴백.
    """
    # 아주 가벼운 1차 정규식(노이즈 제거용)
    import re
    hits: List[Dict] = []
    try:
        phone = re.compile(r"\b0\d{1,2}-?\d{3,4}-?\d{4}\b")
        email = re.compile(r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b")
        idnum = re.compile(r"\b\d{6}-\d{7}\b")  # 예시

        for m in phone.finditer(text):
            hits.append({"type": "phone", "start": m.start(), "end": m.end(), "value": m.group(0)})
        for m in email.finditer(text):
            hits.append({"type": "email", "start": m.start(), "end": m.end(), "value": m.group(0)})
        for m in idnum.finditer(text):
            hits.append({"type": "rrn", "start": m.start(), "end": m.end(), "value": m.group(0)})
    except Exception:
        pass

    # 짧은 텍스트만 모델 적용 (불필요한 대형 임포트 회피)
    if len(text) > 4000:
        return {"hits": hits, "skipped": "too_long"}

    # 여기서부터는 필요할 때만 느리게 임포트 (lazy import)
    try:
        from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
        model_id = os.getenv("PII_NER_MODEL", "dslim/bert-base-NER")  # 너희가 쓰는 모델 ID가 있으면 ENV로 지정
        tok = AutoTokenizer.from_pretrained(model_id)
        mdl = AutoModelForTokenClassification.from_pretrained(model_id)
        ner = pipeline("token-classification", model=mdl, tokenizer=tok, aggregation_strategy="simple", device=-1)
        ents = ner(text)
        for e in ents:
            # label 매핑은 너희 프로젝트 규칙대로 조정
            hits.append({
                "type": e.get("entity_group","entity"),
                "start": int(e["start"]),
                "end": int(e["end"]),
                "value": text[e["start"]:e["end"]],
                "score": float(e.get("score", 0)),
            })
        return {"hits": hits}
    except MemoryError:
        # 메모리 에러 폴백
        return {"hits": hits, "error": "MEMORY_ERROR", "fallback": "regex_only"}
    except Exception as e:
        return {"hits": hits, "error": f"{type(e).__name__}: {e}", "fallback": "regex_only"}
