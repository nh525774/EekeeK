import sys
import json
import os
from detect_utils import detect_personal_info

def main():
    image_paths = sys.argv[1:]

    results = {}

    for path in image_paths:
        if not os.path.exists(path):
            results[path] = {"error": "file not found"}
            continue

        try:
            results[path] = detect_personal_info(path)
        except Exception as e:
            results[path] = {"error": str(e)}

    # 이미지가 1개일 경우, 그 결과만 출력 (배열 아님)
    if len(image_paths) == 1:
        sys.stdout.write(json.dumps(results[image_paths[0]], ensure_ascii=False))
    else:
        sys.stdout.write(json.dumps(results, indent=2, ensure_ascii=False))

if __name__ == '__main__':
    main()
