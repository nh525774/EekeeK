import sys, json, os
from detect_utils import detect_personal_info
from mosaic_utils import apply_mosaic

image_path = sys.argv[1]
selected = json.loads(sys.argv[2])  # 예: ["phones", "license_plates"]
result = detect_personal_info(image_path)

all_boxes = []
for key in selected:
    all_boxes.extend(result.get(key, []))

def to_box(poly):
    # license_plates 같이 숫자 4개짜리 배열이면 그대로 튜플로 변환
    if isinstance(poly[0], (int, float)):
        return tuple(map(int, poly))  # [x1, y1, x2, y2]
    # 그 외에는 {"x": .., "y": ..} 형태로 처리
    return (
        int(min(p['x'] for p in poly)),
        int(min(p['y'] for p in poly)),
        int(max(p['x'] for p in poly)),
        int(max(p['y'] for p in poly))
    )
static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static"))
os.makedirs(static_dir, exist_ok=True)

boxes = [to_box(p) for p in all_boxes]
output_path = os.path.join(static_dir, f"mosaic_{os.path.basename(image_path)}")
apply_mosaic(image_path, boxes, output_path)
print("/static/mosaic_" + os.path.basename(image_path))
