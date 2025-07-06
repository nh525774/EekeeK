import os
import sys
import json
import cv2
from detect_utils import detect_personal_info
from mosaic_utils import apply_mosaic

def to_box(poly):
    try :
        if isinstance(poly[0], (int, float)):
            return tuple(map(int, poly))  # [x1, y1, x2, y2]
        elif isinstance(poly[0], dict) :
            xs = [p["x"] for p in poly]
            ys = [p["y"] for p in poly]
            return (min(xs), min(ys), max(xs), max(ys))
        elif isinstance(poly[0], (list, tuple)) and len(poly[0]) == 2:
            xs = [p[0] for p in poly]
            ys = [p[1] for p in poly]
            return (min(xs), min(ys), max(xs), max(ys))
    except Exception as e:
        print(f"❌ to_box 변환 실패: {poly} → {e}", file=sys.stderr)
    return (0, 0, 0, 0)  # fallback

def mosaic_video(video_path, selected_keys, output_path):
    temp_dir = "video_temp"
    os.makedirs(temp_dir, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("❌ 비디오를 열 수 없습니다.", file=sys.stderr)
        sys.exit(1)
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    frame_paths = []
    idx = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        frame_path = os.path.join(temp_dir, f"frame_{idx:04d}.jpg")
        cv2.imwrite(frame_path, frame)
        frame_paths.append(frame_path)
        idx += 1
    cap.release()

    mosaic_paths = []
    for frame_path in frame_paths:
        try:
            result = detect_personal_info(frame_path)
            print(f"🧪 {frame_path} 탐지결과:", result, file=sys.stderr)
        except Exception as e:
            print(f"❌ 프레임 분석 실패: {e}", file=sys.stderr)
            continue

        all_boxes = []
        for key in selected_keys:
            items = result.get(key, [])
            if key == "faces" :
                all_boxes.extend([face["box"] for face in items if "box" in face])
            else :
                all_boxes.extend(items)
        boxes = [to_box(p) for p in all_boxes]
        print(f"📦 모자이크 대상 박스 개수: {len(boxes)}", file=sys.stderr)
        mosaic_path = frame_path.replace("frame_", "mosaic_frame_")
        apply_mosaic(frame_path, boxes, mosaic_path)
        mosaic_paths.append(mosaic_path)

    fourcc = cv2.VideoWriter_fourcc(*"avc1")
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    if not out.isOpened():
        print(f"❌ 비디오 라이터 열기 실패: {output_path}", file=sys.stderr)
        sys.exit(1)
    for path in mosaic_paths:
        frame = cv2.imread(path)
        if frame is None:
            print(f"⚠️ 모자이크 프레임 읽기 실패: {path}", file=sys.stderr)
            continue
        out.write(frame)
    out.release()

if __name__ == "__main__":
    try:
        if len(sys.argv) < 3:
            print("사용법: python video_mosaic.py input_video.mp4 '[\"phones\", \"license_plates\"]'", file=sys.stderr)
            sys.exit(1)

        video_path = sys.argv[1]
        selected = json.loads(sys.argv[2])
        output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static"))
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, f"mosaic_{os.path.basename(video_path)}")

        mosaic_video(video_path, selected, output_path)

        # ✅ 결과 정상 출력
        print(json.dumps({"url": f"/static/mosaic_{os.path.basename(video_path)}"}))
    except Exception as e:
        import traceback
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({"error": "Video mosaic failed"}))