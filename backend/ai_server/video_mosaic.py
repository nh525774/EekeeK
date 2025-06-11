import os
import sys
import json
import cv2
from detect_utils import detect_personal_info
from mosaic_utils import apply_mosaic

def to_box(poly):
    if isinstance(poly[0], (int, float)):
        return tuple(map(int, poly))  # [x1, y1, x2, y2]
    return (
        int(min(p['x'] for p in poly)),
        int(min(p['y'] for p in poly)),
        int(max(p['x'] for p in poly)),
        int(max(p['y'] for p in poly))
    )

def mosaic_video(video_path, selected_keys, output_path):
    temp_dir = "video_temp"
    os.makedirs(temp_dir, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
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
        result = detect_personal_info(frame_path)
        all_boxes = []
        for key in selected_keys:
            all_boxes.extend(result.get(key, []))
        boxes = [to_box(p) for p in all_boxes]
        mosaic_path = frame_path.replace("frame_", "mosaic_frame_")
        apply_mosaic(frame_path, boxes, mosaic_path)
        mosaic_paths.append(mosaic_path)

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    for path in mosaic_paths:
        frame = cv2.imread(path)
        out.write(frame)
    out.release()

    print("완료:", output_path)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("사용법: python video_mosaic.py input_video.mp4 '[\"phones\", \"license_plates\"]'")
        sys.exit(1)

    video_path = sys.argv[1]
    selected = json.loads(sys.argv[2])
    output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static"))
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"mosaic_{os.path.basename(video_path)}")
    mosaic_video(video_path, selected, output_path)
