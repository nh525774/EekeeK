import sys, json, os
from detect_utils import detect_personal_info
from mosaic_utils import apply_mosaic

# ===== 공통 경로/URL 설정 =====
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
STATIC_DIR = os.path.join(PROJECT_ROOT, "static")
os.makedirs(STATIC_DIR, exist_ok=True)

# 절대 URL 생성기: BACKEND_BASE_URL이 정의되어 있으면 https://example.com + /static/.. 형태로 반환
BACKEND_BASE_URL = os.environ.get("BACKEND_BASE_URL", "").rstrip("/")

def abs_url(path_fragment: str) -> str:
    """
    path_fragment: '/static/xxx.jpg' 형태
    """
    if not path_fragment.startswith("/"):
        path_fragment = "/" + path_fragment
    if BACKEND_BASE_URL:
        return f"{BACKEND_BASE_URL}{path_fragment}"
    return path_fragment  # 환경변수 없으면 기존처럼 상대 경로 반환(프론트에서 baseUrl 붙여서 사용)


# ✅ 입력 인자 처리 (이미지 경로 + [[x1,y1,x2,y2], ...] 박스 좌표 배열)
image_path = sys.argv[1] 
selected = json.loads(sys.argv[2])           # 지금은 쓰지 않아도 OK
selected_boxes = json.loads(sys.argv[3])
block_size = int(sys.argv[4]) if len(sys.argv) > 4 else 15


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

for image_path in [image_path]:
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
        apply_mosaic(image_path, final_boxes, output_path, block_size=block_size)
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
