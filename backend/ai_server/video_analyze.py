import os
import sys
import json
import cv2
from collections import defaultdict
from detect_utils import detect_personal_info

def extract_frames_and_analyze(video_path, interval=10):
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        print(json.dumps({"error": "비디오를 열 수 없습니다."}))
        sys.exit(1)

    temp_dir = "video_temp"
    os.makedirs(temp_dir, exist_ok=True)

    counts = defaultdict(int)
    frame_idx = 0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # 지정된 간격에 해당하는 프레임만 분석
        if frame_idx % interval == 0:
            temp_image_path = os.path.join(temp_dir, f"frame_{frame_idx:04d}.jpg")
            cv2.imwrite(temp_image_path, frame)

            try:
                result = detect_personal_info(temp_image_path)

                for key in ["faces", "phones", "license_plates", "addresses", "location_sensitive"]:
                    counts[key] += len(result.get(key, []))

            except Exception as e:
                print(f"❌ 분석 실패: {e}", file=sys.stderr)

        frame_idx += 1

    cap.release()
    return counts

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("사용법: python video_analyze.py <video_path>")
        sys.exit(1)

    video_path = sys.argv[1]

    if not os.path.exists(video_path):
        print(json.dumps({"error": "비디오 파일이 존재하지 않습니다."}))
        sys.exit(1)

    counts = extract_frames_and_analyze(video_path, interval=10)
    print(json.dumps(counts, ensure_ascii=False))
