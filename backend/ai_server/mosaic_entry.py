import sys, json, os, tempfile, uuid
from mosaic_utils import apply_mosaic

def to_box(poly):
    if isinstance(poly, (list, tuple)) and poly and isinstance(poly[0], (int, float)):
        x1, y1, x2, y2 = map(int, poly)
        if x2 < x1: x1, x2 = x2, x1
        if y2 < y1: y1, y2 = y2, y1
        return (x1, y1, x2, y2)
    return (
        int(min(p['x'] for p in poly)),
        int(min(p['y'] for p in poly)),
        int(max(p['x'] for p in poly)),
        int(max(p['y'] for p in poly))
    )

if __name__ == "__main__":
    try:
        if len(sys.argv) < 4:
            print(json.dumps({"error": "usage: mosaic_entry.py <image_path> <selected(json)> <selectedBoxes(json)> [block_size]"}, ensure_ascii=False))
            sys.exit(0)

        image_path = sys.argv[1]

        try:
            selected = json.loads(sys.argv[2])  # 사용 안 해도 유지
        except Exception:
            selected = []

        try:
            selected_boxes = json.loads(sys.argv[3]) or []
        except Exception:
            selected_boxes = []

        block_size = int(sys.argv[4]) if len(sys.argv) > 4 else 15

        final_boxes = []
        for b in selected_boxes:
            try:
                x1, y1, x2, y2 = to_box(b)
                if x2 - x1 > 0 and y2 - y1 > 0:
                    final_boxes.append((x1, y1, x2, y2))
            except Exception:
                continue

        if not final_boxes:
            print(json.dumps({"error": "no valid boxes"}, ensure_ascii=False))
            sys.exit(0)

        ext = os.path.splitext(image_path)[1] or ".jpg"
        out_dir = tempfile.gettempdir()
        out_path = os.path.join(out_dir, f"mosaic_{uuid.uuid4().hex}{ext}")

        apply_mosaic(image_path, final_boxes, out_path, block_size=block_size)
        print(json.dumps({"out_path": out_path}, ensure_ascii=False), flush=True)

    except Exception as e:
        print(json.dumps({"error": f"mosaic failed: {str(e)}"}, ensure_ascii=False), flush=True)
