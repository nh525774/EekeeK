import sys
import json
import os
from detect_utils import detect_personal_info

def main():
    image_paths = []
    keys_arg = ""  # "license_plates,faces" 같은 콤마 문자열

    # 인자 파싱: 파일 경로 + --keys=...
    for a in sys.argv[1:]:
        if a.startswith("--keys="):
            keys_arg = a.split("=", 1)[1].strip()
        else:
            image_paths.append(a)

    # keys 리스트로 정리
    keys = [k.strip() for k in keys_arg.split(",") if k.strip()] if keys_arg else None

    results = {}
    for path in image_paths:
        if not os.path.exists(path):
            results[path] = {"error": "file not found"}
            continue
        try:
            # detect_personal_info가 keys를 지원하지 않아도 안전하게 호출
            try:
                results[path] = detect_personal_info(path, keys=keys)
            except TypeError:
                # 구버전 시그니처 대응
                results[path] = detect_personal_info(path)
        except Exception as e:
            results[path] = {"error": str(e)}

    # 이미지 1개면 객체만 출력, 여러 개면 맵 출력
    if len(image_paths) == 1:
        sys.stdout.write(json.dumps(results[image_paths[0]], ensure_ascii=False))
    else:
        sys.stdout.write(json.dumps(results, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
