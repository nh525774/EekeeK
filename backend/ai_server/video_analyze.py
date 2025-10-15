import os, sys, json, cv2, time, shutil
from detect_utils import detect_personal_info

# -----------------------------
# 박스 유틸 (좌표 통일)
# -----------------------------
def polygon_to_box(poly):
    try:
        xs, ys = [], []
        for p in poly:
            if isinstance(p, dict):
                xs.append(float(p["x"])); ys.append(float(p["y"]))
            else:
                xs.append(float(p[0]));   ys.append(float(p[1]))
        x1, y1, x2, y2 = min(xs), min(ys), max(xs), max(ys)
        return [int(x1), int(y1), int(x2 - x1), int(y2 - y1)]
    except Exception:
        return [0, 0, 0, 0]

def extract_box(b):
    if b is None:
        return [0, 0, 0, 0]

    # dict 형태
    if isinstance(b, dict):
        if "box" in b:
            return extract_box(b["box"])
        if all(k in b for k in ("x", "y", "w", "h")):
            return [int(b["x"]), int(b["y"]), int(b["w"]), int(b["h"])]
        if all(k in b for k in ("x1", "y1", "x2", "y2")):
            return [
                int(b["x1"]),
                int(b["y1"]),
                int(b["x2"] - b["x1"]),
                int(b["y2"] - b["y1"]),
            ]
        if "x" in b and "y" in b:
            return [int(b["x"]), int(b["y"]), 0, 0]

    # polygon (list of points)
    if isinstance(b, (list, tuple)) and len(b) >= 4 and (
        isinstance(b[0], (list, tuple)) or isinstance(b[0], dict)
    ):
        return polygon_to_box(b)

    # 숫자 4개짜리 배열
    if isinstance(b, (list, tuple)) and len(b) == 4 and all(
        isinstance(v, (int, float)) for v in b
    ):
        a, b_, c, d = b
        if c > a and d > b_:  # [x1,y1,x2,y2]
            return [int(a), int(b_), int(c - a), int(d - b_)]
        return [int(a), int(b_), int(c), int(d)]  # [x,y,w,h]

    return [0, 0, 0, 0]


def normalize_box(arr):
    """(x,y,w,h) 또는 (x1,y1,x2,y2) → (x,y,w,h)"""
    if not isinstance(arr, (list, tuple)) or len(arr) != 4:
        return [0, 0, 0, 0]
    a, b, c, d = arr
    try:
        a, b, c, d = float(a), float(b), float(c), float(d)
        if c > a and d > b:  # [x1,y1,x2,y2]
            return [int(a), int(b), int(c - a), int(d - b)]
        return [int(a), int(b), int(c), int(d)]  # [x,y,w,h]
    except Exception:
        return [0, 0, 0, 0]
# -----------------------------

def analyze_first_frame(video_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(json.dumps({"error": "비디오를 열 수 없습니다."}))
        sys.exit(1)

    ok, frame = cap.read()
    cap.release()
    if not ok:
        print(json.dumps({"error": "프레임을 읽을 수 없습니다."}))
        sys.exit(1)

    h, w = frame.shape[:2]
    # 브라우저는 회전 메타를 적용해서 '세로'로 보이는데, OpenCV는 종종 가로로 읽음
    # 휴대폰 영상 흔한 경우: w > h 이면 90도 회전해야 브라우저와 일치
    if w > h:
        frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)

    temp_dir = "video_temp"
    os.makedirs(temp_dir, exist_ok=True)
    first_frame_path = os.path.join(temp_dir, "frame_0000.jpg")
    cv2.imwrite(first_frame_path, frame)

    result = detect_personal_info(first_frame_path)

    out = {
        "faces": [normalize_box(extract_box(f)) for f in (result.get("faces") or [])],
        "phones": [normalize_box(extract_box(p)) for p in (result.get("phones") or [])],
        "addresses": [normalize_box(extract_box(a)) for a in (result.get("addresses") or [])],
        "location_sensitive": [normalize_box(extract_box(l)) for l in (result.get("location_sensitive") or [])],
        "license_plates": [normalize_box(extract_box(lp)) for lp in (result.get("license_plates") or [])],
    }
    print(json.dumps(out, ensure_ascii=False))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("사용법: python video_analyze.py <video_path>")
        sys.exit(1)
    video_path = sys.argv[1]
    if not os.path.exists(video_path):
        print(json.dumps({"error": "비디오 파일이 존재하지 않습니다."}))
        sys.exit(1)
    analyze_first_frame(video_path)
