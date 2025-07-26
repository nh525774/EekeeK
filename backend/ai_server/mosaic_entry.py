# ✅ 통합된 mosaic_entry.py
import sys, json, os
from detect_utils import detect_personal_info
from mosaic_utils import apply_mosaic
import contextlib


# ✅ 입력 인자 처리
image_paths = sys.argv[1:-1]
selected = json.loads(sys.argv[-1])

# ✅ static 디렉토리 준비
static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static"))
os.makedirs(static_dir, exist_ok=True)

def to_box(poly):
    if isinstance(poly[0], (int, float)):
        return tuple(map(int, poly))  # [x1, y1, x2, y2]
    return (
        int(min(p['x'] for p in poly)),
        int(min(p['y'] for p in poly)),
        int(max(p['x'] for p in poly)),
        int(max(p['y'] for p in poly))
    )

output_map = {}

#with suppress_stdout():
for image_path in image_paths:
        result = detect_personal_info(image_path)
        all_boxes = []

        # ✅ 일반 개인정보 모자이크 (true인 항목만)
        for key in selected:
            if key == "faces":
                continue
            all_boxes.extend(result.get(key, []))

        # ✅ 얼굴 ID 기반 모자이크
        if "faces" in selected:
            face_infos = result.get("faces", [])
            face_boxes = [face["box"] for face in face_infos]
            all_boxes.extend(face_boxes)

        # ✅ 박스 변환 및 저장
        boxes = []
        for p in all_boxes :
           x1, y1, x2, y2 = to_box(p)
           w, h = x2 - x1, y2 - y1
           if w <= 0 or h <= 0:
                print(f"⚠️ 건너뜀: 잘못된 박스 w={w}, h={h}, 원본={p}")
                continue
           boxes.append((x1, y1, x2, y2)) 
        
        if not boxes:
            print(json.dumps({ "error": "No mosaic targets found" }))
            continue

        filename = f"mosaic_{os.path.basename(image_path)}"
        output_path = os.path.join(static_dir, filename)
        apply_mosaic(image_path, boxes, output_path)
        output_map[image_path] = f"/static/{filename}"

# ✅ 결과 출력 수정
if len(image_paths) == 1:
    only_value = list(output_map.values())[0]
    print(json.dumps({ "url": only_value }))  # ✅ JS가 data.url로 받게
else:
    print(json.dumps(output_map, indent=2, ensure_ascii=False))