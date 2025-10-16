from PIL import Image, ImageOps
import cv2


def apply_mosaic(image_path, boxes, save_path, block_size=None):
    """
    공통 모자이크 처리 (대상 상관없이 모두 Pillow 기반 모자이크)
    :param image_path: 원본 이미지 경로
    :param boxes: 모자이크할 영역 리스트 [(x1, y1, x2, y2), ...]
    :param block_size: (옵션) 전체 박스에 적용할 픽셀화 블록 크기(정수, 홀수 권장)
    :param save_path: 저장 경로
    :return: 저장된 이미지 경로
    """
    img = Image.open(image_path).convert('RGB')
    img = ImageOps.exif_transpose(img).convert("RGB")

    for box in boxes:
        left, upper, right, lower = [int(v) for v in box]
        region = img.crop((left, upper, right, lower))
        box_width = right - left
        box_height = lower - upper
        # 전달받은 block_size가 있으면 그 값을, 없으면 기존 방식으로 계산
        bs = int(block_size) if block_size else int(max(8, min(box_width, box_height) // 2))
        # 모자이크는 홀수일 때 더 깔끔한 경우가 많음
        if bs % 2 == 0:
            bs += 1
        bs = max(3, bs)

        small = region.resize((bs, bs), resample=Image.BILINEAR)
        mosaic = small.resize(region.size, Image.NEAREST)
        img.paste(mosaic, (left, upper, right, lower))

    img.save(save_path)
    return save_path
