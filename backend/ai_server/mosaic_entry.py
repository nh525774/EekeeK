import sys, json, os
from detect_utils import detect_personal_info
from mosaic_utils import apply_mosaic

# ✅ 입력 인자 처리 (이미지 경로 + [[x1,y1,x2,y2], ...] 박스 좌표 배열)
image_paths = sys.argv[1:-1]
selected_boxes = json.loads(sys.argv[-1])

# ✅ static 디렉토리 준비
static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static"))
os.makedirs(static_dir, exist_ok=True)

def to_box(poly):
    if isinstance(poly[0], (int, float)):
        x1, y1, x2, y2 = map(int, poly)
        x1, x2 = sorted([x1, x2])
        y1, y2 = sorted([y1, y2])
        return (x1, y1, x2, y2)
    return (
        int(min(p['x'] for p in poly)),
        int(min(p['y'] for p in poly)),
        int(max(p['x'] for p in poly)),
        int(max(p['y'] for p in poly))
    )

output_map = {}

for image_path in image_paths:
    final_boxes = []
    for b in selected_boxes:
        try:
            x1, y1, x2, y2 = to_box(b)
            if x2 - x1 <= 0 or y2 - y1 <= 0:
                continue
            final_boxes.append((x1, y1, x2, y2))
        except Exception as e:
            print(f"❌ 박스 오류: {b} / {e}")
            continue

    if not final_boxes:
        print(f"⚠️ {image_path}에 유효한 박스 없음.")
        continue

    filename = f"mosaic_{os.path.basename(image_path)}"
    output_path = os.path.join(static_dir, filename)
    try:
        apply_mosaic(image_path, final_boxes, output_path)
        output_map[image_path] = f"/static/{filename}"
        print(f"✅ 모자이크 성공: {output_map[image_path]}")
    except Exception as e:
        print(f"❌ 모자이크 실패: {image_path} / 오류: {str(e)}")
valid_outputs = [v for v in output_map.values() if v]
if not valid_outputs:
    print(json.dumps({ "error": "No valid mosaic results" }))
    sys.exit(0)

if len(valid_outputs) == 1:
    print(json.dumps({ "url": valid_outputs[0] }))
else:
    print(json.dumps({ "urls": valid_outputs }, indent=2, ensure_ascii=False))
