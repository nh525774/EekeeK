# video_mosaic.py
import os, sys, json, time, shutil, subprocess, tempfile, uuid
import cv2
from detect_utils import detect_personal_info

# OpenCV 튜닝(선택)
try:
    cv2.setNumThreads(0)
    cv2.ocl.setUseOpenCL(False)
except Exception:
    pass

# ── (유틸 함수들: 네 기존 내용 그대로 사용) ─────────────────────────────
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
    out=[]
    for k in selected:
        key = KEY_ALIASES.get(str(k).strip())
        if key and key not in out: out.append(key)
    return out or ALL_KEYS[:]

def polygon_to_box(poly):
    try:
        xs, ys = [], []
        for p in poly:
            if isinstance(p, dict):
                xs.append(float(p["x"])); ys.append(float(p["y"]))
            else:
                xs.append(float(p[0]));   ys.append(float(p[1]))
        x1, y1, x2, y2 = min(xs), min(ys), max(xs), max(ys)
        return [int(round(x1)), int(round(y1)), int(round(x2 - x1)), int(round(y2 - y1))]
    except Exception:
        return [0, 0, 0, 0]

def extract_box(b):
    if b is None: return [0,0,0,0]
    if isinstance(b, dict):
        if "box" in b: return extract_box(b["box"])
        if all(k in b for k in ("x","y","w","h")): return [int(b["x"]),int(b["y"]),int(b["w"]),int(b["h"])]
        if all(k in b for k in ("x1","y1","x2","y2")): return [int(b["x1"]),int(b["y1"]),int(b["x2"]),int(b["y2"])]
        if "x" in b and "y" in b: return [int(b["x"]),int(b["y"]),0,0]
    if isinstance(b,(list,tuple)) and len(b)>=4 and (isinstance(b[0],(list,tuple)) or isinstance(b[0],dict)):
        return polygon_to_box(b)
    if isinstance(b,(list,tuple)) and len(b)==4 and all(isinstance(v,(int,float)) for v in b):
        return list(b)
    return [0,0,0,0]

def normalize_box(arr):
    if not isinstance(arr,(list,tuple)) or len(arr)!=4: return (0,0,0,0)
    a,b,c,d = arr
    try:
        a,b,c,d = float(a),float(b),float(c),float(d)
        if c>a and d>b: # x1,y1,x2,y2
            x1,y1,x2,y2 = a,b,c,d
            if x2<x1: x1,x2 = x2,x1
            if y2<y1: y1,y2 = y2,y1
            return (int(round(x1)),int(round(y1)),int(round(x2-x1)),int(round(y2-y1)))
        x,y,w,h = a,b,c,d
        if w<0 or h<0:
            x2,y2 = x+w, y+h
            if x2<x: x,x2 = x2,x
            if y2<y: y,y2 = y2,y
            w,h = x2-x, y2-y
        return (int(round(x)),int(round(y)),int(round(w)),int(round(h)))
    except Exception:
        return (0,0,0,0)

def clip_box_xywh(box, W, H):
    x,y,w,h = [int(v) for v in box]
    if w<=0 or h<=0: return (0,0,0,0)
    x = max(0, min(x, W-1)); y = max(0, min(y, H-1))
    x2 = max(x+1, min(x+w, W)); y2 = max(y+1, min(y+h, H))
    return (x, y, x2-x, y2-y)

def _new_tracker():
    for name in ["TrackerMIL_create","TrackerDaSiamRPN_create","TrackerNano_create","TrackerGOTURN_create","TrackerCSRT_create","TrackerKCF_create","TrackerMOSSE_create","TrackerMedianFlow_create"]:
        if hasattr(cv2, name): return getattr(cv2, name)()
    return None

def build_trackers(frame, boxes_xywh):
    ts=[]
    for (x,y,w,h) in boxes_xywh:
        if w<=0 or h<=0: continue
        tr=_new_tracker()
        if tr is None: return []
        tr.init(frame,(int(x),int(y),int(w),int(h)))
        ts.append(tr)
    return ts

def update_trackers(trackers, frame):
    out, alive = [], []
    for tr in trackers:
        ok, box = tr.update(frame)
        if ok:
            x,y,w,h = box
            out.append((int(x),int(y),int(w),int(h)))
            alive.append(tr)
    return alive, out

def apply_mosaic_array(image, boxes, block_size=15):
    if image is None: return image
    H,W = image.shape[:2]; out=image.copy(); bs=max(1,int(block_size) if block_size else 15)
    for (x,y,w,h) in boxes:
        x,y,w,h = clip_box_xywh((x,y,w,h),W,H)
        if w<=0 or h<=0: continue
        roi = out[y:y+h, x:x+w]
        if roi.size==0: continue
        small = cv2.resize(roi,(bs,bs))
        mosaic = cv2.resize(small,(w,h), interpolation=cv2.INTER_NEAREST)
        out[y:y+h, x:x+w] = mosaic
    return out

def get_video_rotation(path):
    try:
        out = subprocess.check_output(
            ["ffprobe","-v","error","-select_streams","v:0","-show_entries","stream_tags=rotate","-of","default=nk=1:nw=1", path],
            stderr=subprocess.STDOUT).decode().strip()
        return int(out) if out else 0
    except Exception:
        return 0

def rotate_frame(frame, rotation):
    if rotation == 90:   return cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
    if rotation == 180:  return cv2.rotate(frame, cv2.ROTATE_180)
    if rotation in (270,-90): return cv2.rotate(frame, cv2.ROTATE_90_COUNTERCLOCKWISE)
    return frame

def smooth_boxes(prev, curr, alpha=0.4):
    if not prev or not curr or len(prev)!=len(curr): return curr
    out=[]
    for (x1,y1,w1,h1),(x2,y2,w2,h2) in zip(prev,curr):
        x=int(round(alpha*x1+(1-alpha)*x2))
        y=int(round(alpha*y1+(1-alpha)*y2))
        w=int(round(alpha*w1+(1-alpha)*w2))
        h=int(round(alpha*h1+(1-alpha)*h2))
        out.append((x,y,w,h))
    return out
# ───────────────────────────────────────────────────────────────

MAX_DET_W = 640

def mosaic_video(video_path, selected_keys, fixed_boxes, output_path, block_size=15):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("cannot open video", file=sys.stderr); sys.exit(1)

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    rot = get_video_rotation(video_path)

    ok, f0 = cap.read()
    if not ok:
        print("first frame read fail", file=sys.stderr); sys.exit(1)
    f0 = rotate_frame(f0, rot)
    outH, outW = f0.shape[:2]
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

    selected_keys = norm_selected(selected_keys)
    fixed_boxes = [normalize_box(extract_box(b)) for b in (fixed_boxes or [])]
    fixed_boxes = [clip_box_xywh(b, outW, outH) for b in fixed_boxes if b and b[2] > 0 and b[3] > 0]

    out = cv2.VideoWriter(output_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (outW, outH))
    if not out or not out.isOpened():
        print("videowriter open fail", file=sys.stderr); sys.exit(1)

    DETECT_EVERY = 8
    SMOOTH_ALPHA = 0.4
    last_boxes=[]; trackers=[]; use_tracker=True; need_redetect=False

    idx=0
    temp_dir = os.path.join(tempfile.gettempdir(), "video_temp")
    os.makedirs(temp_dir, exist_ok=True)
    temp_img_path = os.path.join(temp_dir, "detect_frame.jpg")

    while True:
        ret, frame = cap.read()
        if not ret: break
        frame = rotate_frame(frame, rot)
        H,W = frame.shape[:2]

        if fixed_boxes:
            if not trackers and fixed_boxes:
                trackers = build_trackers(frame, fixed_boxes)
                use_tracker = len(trackers)>0
                last_boxes = fixed_boxes[:]
            elif use_tracker and trackers:
                trackers, tracked = update_trackers(trackers, frame)
                if tracked:
                    tracked = [clip_box_xywh(b, W, H) for b in tracked]
                    last_boxes = smooth_boxes(last_boxes, tracked, alpha=SMOOTH_ALPHA)
                else:
                    need_redetect = True
            if need_redetect:
                trackers = build_trackers(frame, fixed_boxes)
                use_tracker = len(trackers)>0
                last_boxes = fixed_boxes[:]
                need_redetect = False
        else:
            do_detect = (idx % DETECT_EVERY == 0) or need_redetect or (not trackers)
            if do_detect:
                det_img = frame
                scale = 1.0
                if W > MAX_DET_W:
                    scale = W / float(MAX_DET_W)
                    det_img = cv2.resize(frame, (MAX_DET_W, int(H/scale)))
                cv2.imwrite(temp_img_path, det_img)

                result = detect_personal_info(temp_img_path)

                boxes=[]
                def _sb(b):
                    x,y,w,h = normalize_box(extract_box(b))
                    if scale != 1.0:
                        x,y,w,h = int(round(x*scale)),int(round(y*scale)),int(round(w*scale)),int(round(h*scale))
                    return (x,y,w,h)

                if "faces" in selected_keys: boxes += [_sb(f) for f in (result.get("faces") or [])]
                if "phones" in selected_keys: boxes += [_sb(p) for p in (result.get("phones") or [])]
                if "addresses" in selected_keys: boxes += [_sb(a) for a in (result.get("addresses") or [])]
                if "location_sensitive" in selected_keys: boxes += [_sb(l) for l in (result.get("location_sensitive") or [])]
                if "license_plates" in selected_keys: boxes += [_sb(lp) for lp in (result.get("license_plates") or [])]

                boxes = [clip_box_xywh(b, W, H) for b in boxes if b and b[2]>0 and b[3]>0]
                boxes = smooth_boxes(last_boxes, boxes, alpha=SMOOTH_ALPHA) if last_boxes else boxes
                last_boxes = boxes
                trackers = build_trackers(frame, last_boxes)
                use_tracker = len(trackers)>0
                need_redetect = False
            else:
                if use_tracker and trackers:
                    trackers, tracked = update_trackers(trackers, frame)
                    if tracked:
                        tracked = [clip_box_xywh(b, W, H) for b in tracked]
                        last_boxes = smooth_boxes(last_boxes, tracked, alpha=SMOOTH_ALPHA)
                    else:
                        need_redetect = True

        mosaic_frame = apply_mosaic_array(frame, last_boxes, block_size=block_size)
        out.write(mosaic_frame)
        idx += 1

    cap.release()
    out.release()
    try: shutil.rmtree(temp_dir)
    except Exception: pass

def ensure_h264(src_mp4: str) -> str:
    dst_mp4 = src_mp4.replace(".mp4", "_h264.mp4")
    cmd = ["ffmpeg","-y","-i",src_mp4,"-movflags","+faststart","-vcodec","libx264","-pix_fmt","yuv420p","-preset","veryfast","-crf","23","-an",dst_mp4]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        os.replace(dst_mp4, src_mp4)
    except Exception as e:
        print(json.dumps({"warn": f"ffmpeg convert failed: {e}"}))
    return src_mp4

if __name__ == "__main__":
    try:
        if len(sys.argv) < 3:
            print(json.dumps({"error":"usage: video_mosaic.py <video_path> <selected(json)> [fixed_boxes_json] [block_size]"}))
            sys.exit(0)

        video_path = sys.argv[1]
        try:
            selected_keys = json.loads(sys.argv[2]) or []
        except Exception:
            selected_keys = []

        fixed_boxes = []
        if len(sys.argv) >= 4:
            try: fixed_boxes = json.loads(sys.argv[3]) or []
            except Exception: fixed_boxes = []

        block_size = int(sys.argv[4]) if len(sys.argv) >= 5 else 15

        out_dir = tempfile.gettempdir()
        output_path = os.path.join(out_dir, f"mosaic_{uuid.uuid4().hex}.mp4")

        mosaic_video(video_path, selected_keys, fixed_boxes, output_path, block_size=block_size)
        output_path = ensure_h264(output_path)

        # protectRoutes가 마지막 줄만 파싱
        print(json.dumps({"out_path": output_path}), flush=True)

    except Exception as e:
        print(json.dumps({"error": f"video mosaic failed: {e}"}), flush=True)
