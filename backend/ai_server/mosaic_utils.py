from PIL import Image
import cv2


def apply_mosaic(image_path, boxes, save_path):
    """
    공통 모자이크 처리 (대상 상관없이 모두 Pillow 기반 모자이크)
    :param image_path: 원본 이미지 경로
    :param boxes: 모자이크할 영역 리스트 [(x1, y1, x2, y2), ...]
    :param save_path: 저장 경로
    :return: 저장된 이미지 경로
    """
    img = Image.open(image_path).convert('RGB')

    for box in boxes:
        left, upper, right, lower = [int(v) for v in box]
        region = img.crop((left, upper, right, lower))
        box_width = right - left
        box_height = lower - upper
        block_size = int(max(8, min(box_width, box_height) // 2))
        small = region.resize((block_size, block_size), resample=Image.BILINEAR)
        mosaic = small.resize(region.size, Image.NEAREST)
        img.paste(mosaic, (left, upper, right, lower))

    img.save(save_path)
    return save_path
