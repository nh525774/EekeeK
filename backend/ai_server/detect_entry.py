import sys
import json
from detect_utils import detect_personal_info

def main():
    image_path = sys.argv[1]
    result = detect_personal_info(image_path)
    # JSON만 stdout에 출력
    sys.stdout.write(json.dumps(result))

if __name__ == '__main__':
    main()