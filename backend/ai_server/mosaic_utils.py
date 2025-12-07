from PIL import Image, ImageOps

def apply_mosaic(image_path, boxes, save_path, block_size=None):
    """
    boxes: [[x1,y1,x2,y2], ...] (xyxy)
    block_size: 모자이크 강도에 쓰는 정수값 (클수록 약해짐 — 예전 방식)
    """
    img = ImageOps.exif_transpose(Image.open(image_path)).convert("RGB")
    W, H = img.size

    def clamp_xyxy(x1, y1, x2, y2):
        x1 = max(0, min(int(x1), W - 1))
        y1 = max(0, min(int(y1), H - 1))
        x2 = max(x1 + 1, min(int(x2), W))
        y2 = max(y1 + 1, min(int(y2), H))
        return x1, y1, x2, y2

    bs = int(block_size) if block_size else 15
    bs = max(1, bs)  # 1이하는 무의미

    for b in boxes:
        x1, y1, x2, y2 = clamp_xyxy(*b)
        region = img.crop((x1, y1, x2, y2))
        small = region.resize((bs, bs), resample=Image.BILINEAR)
        mosaic = small.resize(region.size, Image.NEAREST)
        img.paste(mosaic, (x1, y1, x2, y2))

    img.save(save_path)
    return save_path
