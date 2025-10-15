import os, sys, json, cv2
from detect_utils import detect_personal_info
import time
import shutil
import subprocess

ALL_KEYS = ["faces", "phones", "addresses", "location_sensitive", "license_plates"]
KEY_ALIASES = {
    "face":"faces","faces":"faces","얼굴":"faces",
    "phone":"phones","phones":"phones","전화":"phones","전화번호":"phones",
    "address":"addresses","addresses":"addresses","주소":"addresses",
    "location":"location_sensitive","location_sensitive":"location_sensitive","위치":"location_sensitive",
    "plate":"license_plates","license_plate":"license_plates","license_plates":"license_plates","번호판":"license_plates",
}

def norm_selected(selected):
    if not selected: return ALL_KEYS[:]
    out = []
    for k in selected:
        key = KEY_ALIASES.get(str(k).strip(), None)
        if key and key not in out:
            out.append(key)
    return out or ALL_KEYS[:]

# === Tracker helpers (CSRT → KCF → MedianFlow) ===
def _new_tracker():
    for path in [getattr(cv2, "legacy", None), cv2]:
        if path is None:
            continue
        creator = (
            getattr(path, "TrackerCSRT_create", None)
            or getattr(path, "TrackerKCF_create", None)
            or getattr(path, "TrackerMedianFlow_create", None)
        )
        if creator:
            return creator()
    return None

def build_trackers(frame, boxes_xywh):
    trackers = []
    for (x, y, w, h) in boxes_xywh:
        if w <= 0 or h <= 0:
            continue
        tr = _new_tracker()
        if tr is None:
            return []
        tr.init(frame, (int(x), int(y), int(w), int(h)))
        trackers.append(tr)
    return trackers

def update_trackers(trackers, frame):
    out = []
    alive = []
    for tr in trackers:
        ok, box = tr.update(frame)
        if ok:
            x, y, w, h = box
            out.append((int(x), int(y), int(w), int(h)))
            alive.append(tr)
    return alive, out
# ================================================

def polygon_to_box(poly):
    try:
        xs, ys = [], []
        for p in poly:
            if isinstance(p, dict):
                xs.append(float(p["x"])); ys.append(float(p["y"]))
            else:
                xs.append(float(p[0]));   ys.append(float(p[1]))
        x1, y1, x2, y2 = min(xs), min(ys), max(xs), max(ys)
        return (int(x1), int(y1), int(x2 - x1), int(y2 - y1))
    except Exception:
        return (0, 0, 0, 0)

def extract_box(b):
    if b is None:
        return [0, 0, 0, 0]
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
    if isinstance(b, (list, tuple)) and len(b) >= 4 and (
        isinstance(b[0], (list, tuple)) or isinstance(b[0], dict)
    ):
        return polygon_to_box(b)
    if isinstance(b, (list, tuple)) and len(b) == 4 and all(
        isinstance(v, (int, float)) for v in b
    ):
        a, b_, c, d = b
        if c > a and d > b_:
            return [int(a), int(b_), int(c - a), int(d - b_)]
        return [int(a), int(b_), int(c), int(d)]
    return [0, 0, 0, 0]

def normalize_box(arr):
    if not isinstance(arr, (list, tuple)) or len(arr) != 4:
        return (0, 0, 0, 0)
    a, b, c, d = arr
    try:
        a, b, c, d = float(a), float(b), float(c), float(d)
        if c > a and d > b:
            return (int(a), int(b), int(c - a), int(d - b))
        return (int(a), int(b), int(c), int(d))
    except Exception:
        return (0, 0, 0, 0)

def apply_mosaic_array(image, boxes):
    if image is None:
        return image
    H, W = image.shape[:2]
    out = image.copy()
    for (x, y, w, h) in boxes:
        x, y = int(x), int(y)
        w, h = int(w), int(h)
        if w <= 0 or h <= 0:
            continue
        x = max(0, min(x, W - 1))
        y = max(0, min(y, H - 1))
        x2 = max(x + 1, min(x + w, W))
        y2 = max(y + 1, min(y + h, H))
        roi = out[y:y2, x:x2]
        roi_h, roi_w = roi.shape[:2]
        if roi_h <= 0 or roi_w <= 0:
            continue
        small = cv2.resize(roi, (max(1, roi_w // 10), max(1, roi_h // 10)))
        mosaic = cv2.resize(small, (roi_w, roi_h), interpolation=cv2.INTER_NEAREST)
        out[y:y2, x:x2] = mosaic
    return out

def mosaic_video(video_path, selected_keys, fixed_boxes, output_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("❌ 비디오를 열 수 없습니다.", file=sys.stderr)
        sys.exit(1)

    fps = cap.get(cv2.CAP_PROP_FPS) or 0
    if not fps or fps != fps or fps < 1:
        fps = 25.0
    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

    if width <= 0 or height <= 0:
        ok, f0 = cap.read()
        if not ok:
            print("❌ 첫 프레임 로드 실패", file=sys.stderr)
            sys.exit(1)
        height, width = f0.shape[:2]
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

    selected_keys = norm_selected(selected_keys)

    rotate_cw_90 = width > height
    if rotate_cw_90:
        width, height = height, width 

    fixed_boxes = [normalize_box(extract_box(b)) for b in (fixed_boxes or [])]

    out = cv2.VideoWriter(output_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))
    if not out or not out.isOpened():
        print("❌ VideoWriter 열기 실패(mp4v)", file=sys.stderr)
        sys.exit(1)

    DETECT_EVERY = 8
    last_boxes = []
    trackers = []
    use_tracker = True

    if fixed_boxes:
        last_boxes = [(x,y,w,h) for (x,y,w,h) in fixed_boxes if w>0 and h>0]

    idx = 0
    temp_dir = "video_temp"
    os.makedirs(temp_dir, exist_ok=True)
    temp_img_path = os.path.join(temp_dir, "detect_frame.jpg")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if rotate_cw_90:
            frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)

        if fixed_boxes:
            if not trackers and last_boxes:
                trackers = build_trackers(frame, last_boxes)
                use_tracker = len(trackers) > 0
            elif use_tracker and trackers:
                trackers, tracked = update_trackers(trackers, frame)
                if tracked:
                    last_boxes = tracked
        else:
            if idx % DETECT_EVERY == 0:
                cv2.imwrite(temp_img_path, frame)
                result = detect_personal_info(temp_img_path)
                boxes = []
                if "faces" in selected_keys:
                    boxes += [normalize_box(extract_box(f)) for f in (result.get("faces") or [])]
                if "phones" in selected_keys:
                    boxes += [normalize_box(extract_box(p)) for p in (result.get("phones") or [])]
                if "addresses" in selected_keys:
                    boxes += [normalize_box(extract_box(a)) for a in (result.get("addresses") or [])]
                if "location_sensitive" in selected_keys:
                    boxes += [normalize_box(extract_box(l)) for l in (result.get("location_sensitive") or [])]
                if "license_plates" in selected_keys:
                    boxes += [normalize_box(extract_box(lp)) for lp in (result.get("license_plates") or [])]
                last_boxes = [(x,y,w,h) for (x,y,w,h) in boxes if w>0 and h>0]
                trackers = build_trackers(frame, last_boxes)
                use_tracker = len(trackers) > 0
            else:
                if use_tracker and trackers:
                    trackers, tracked = update_trackers(trackers, frame)
                    if tracked:
                        last_boxes = tracked

        mosaic_frame = apply_mosaic_array(frame, last_boxes)
        out.write(mosaic_frame)
        idx += 1

    cap.release()
    out.release()
    try:
        shutil.rmtree(temp_dir)
    except Exception:
        pass

# === ffmpeg 후처리 추가 ===
def ensure_h264(src_mp4: str) -> str:
    dst_mp4 = src_mp4.replace(".mp4", "_h264.mp4")
    cmd = [
        "ffmpeg", "-y",
        "-i", src_mp4,
        "-movflags", "+faststart",
        "-vcodec", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "veryfast",
        "-crf", "23",
        "-an",
        dst_mp4
    ]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        os.replace(dst_mp4, src_mp4)
    except Exception as e:
        print("[warn] ffmpeg h264 변환 실패:", e, file=sys.stderr)
    return src_mp4

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("사용법: python video_mosaic.py input.mp4 '[\"faces\",\"phones\"]'", file=sys.stderr)
        sys.exit(1)

    video_path = sys.argv[1]
    selected_keys = json.loads(sys.argv[2])

    fixed_boxes = []
    if len(sys.argv) >= 4:
        try:
            fixed_boxes = json.loads(sys.argv[3]) or []
        except Exception:
            fixed_boxes = []

    output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static"))
    os.makedirs(output_dir, exist_ok=True)
    stamp = int(time.time())
    output_path = os.path.join(output_dir, f"mosaic_{stamp}.mp4")

    mosaic_video(video_path, selected_keys, fixed_boxes, output_path)

    # ✅ ffmpeg 변환 호출
    output_path = ensure_h264(output_path)

    final_name = os.path.basename(output_path)
    print(json.dumps({"url": f"/static/{final_name}"}))
