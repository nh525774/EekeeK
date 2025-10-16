# test_scan.py
import sys
print(">>> USING PYTHON:", sys.executable)

from pii_scan_warn_base import scan_text_warn_only_base

sample = "내일 소정이랑 영훈이랑 유우시한테 세시까지 덕성여대 앞에서 만나자고 할게"
print("입력 문장:", sample)

res = scan_text_warn_only_base(sample)
print(res["message"])
# print(res["entities"])  # 필요하면 상세 스팬 확인
