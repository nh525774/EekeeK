# ai_server/pii/pii_scan_cli.py
import sys, json, os
os.environ.setdefault("TRANSFORMERS_NO_TORCHVISION", "1")
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")

from pii_scan_warn_base import scan_text_warn_only_base

def main():
    try:
        if not sys.stdin.isatty():
            text = sys.stdin.read()
        else:
            text = " ".join(sys.argv[1:]) 
        res = scan_text_warn_only_base(text or "")
        sys.stdout.write(json.dumps(res, ensure_ascii=False))
    except Exception as e:
        sys.stdout.write(json.dumps({"hits": [], "error": f"{type(e).__name__}: {e}"}))

if __name__ == "__main__":
    main()
