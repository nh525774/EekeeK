# detect_utils.import contextlib

import contextlib
import sys
import os
import re
import time
import json
import base64
import requests
from PIL import Image
import cv2
import numpy as np
from ultralytics import YOLO
from ultralytics.cfg import get_cfg

# ✅ 환경설정
secret_key = 'RElNcktLcW5rakhXWVphV1NPZmtFS3lEaFBLTk5UUks='
api_url = 'https://p3o6sbw2ma.apigw.ntruss.com/custom/v1/39564/51ee37fdd65c08539ab63f1680a9536314dc641489c1669d99a4fa86ece05f7d/general'
naver_client_id = '6ZYK12BlEbyZVUKH_qi9'
naver_client_secret = 'RQy2zgooVG'

def load_model():
    model_path = os.path.join(os.path.dirname(__file__), "license_plate_detector.pt")
    cfg = get_cfg(overrides={'verbose': False})  # ← 로그 꺼짐
    with contextlib.redirect_stdout(sys.stderr):  # 로딩 시 찍히는 로그도 차단
        return YOLO(model_path, verbose=False)

lp_model = load_model()

# ✅ OCR 실행 함수
def run_ocr(image_path):
    with open(image_path, 'rb') as f:
        image_data = f.read()
        encoded = base64.b64encode(image_data).decode('utf-8')
    payload = {
        'version': 'V2',
        'requestId': str(int(time.time())),
        'timestamp': int(time.time() * 1000),
        'images': [{'format': 'jpg', 'name': 'test_image', 'data': encoded}]
    }
    headers = {'X-OCR-SECRET': secret_key, 'Content-Type': 'application/json'}
    response = requests.post(api_url, headers=headers, data=json.dumps(payload))
    return response.json()

# ✅ 위치 텍스트 검색 여부 판단
def is_valid_location_query(text):
    text = text.strip()
    return len(text) >= 2 and not text.isdigit() and not re.fullmatch(r'[^\w가-힣]+', text)

def is_searchable_in_map(text):
    url = "https://openapi.naver.com/v1/search/local.json"
    headers = {"X-Naver-Client-Id": naver_client_id, "X-Naver-Client-Secret": naver_client_secret}
    params = {"query": text.strip(), "display": 1}
    r = requests.get(url, headers=headers, params=params)
    return r.status_code == 200 and len(r.json().get("items", [])) > 0

# ✅ 연락처 및 이메일 감지
def detect_phones_emails(fields):
    phone_pattern = re.compile(r'\b\d{2,4}(?:[-.\s]?\d{3,4}){1,2}\b')
    email_pattern = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')

    phone_boxes = []
    email_boxes = []

    for i, field in enumerate(fields):
        text = field['inferText']
        if phone_pattern.search(text):
            phone_boxes.append(field['boundingPoly']['vertices'])

    for i in range(len(fields)):
        for win in range(2, 6):
            if i + win > len(fields): continue
            chunk = ''.join(f['inferText'] for f in fields[i:i+win])
            if email_pattern.fullmatch(chunk):
                email_boxes.append(fields[i]['boundingPoly']['vertices'])

    return phone_boxes, email_boxes

# ✅ 주소 텍스트 감지
def is_address(text):
    if len(text.strip()) < 3: return False
    if re.search(r'(시|구|동|읍|면|리|가|길|로|거리|역|대교)$', text): return True
    if re.search(r'(dong$|gil$|ga$|station$)', text.lower()): return True
    return False

def detect_addresses(fields):
    boxes = []
    for field in fields:
        text = field['inferText']
        if is_address(text):
            boxes.append(field['boundingPoly']['vertices'])
    return boxes

# ✅ 위치 노출 위험 정보 감지
def detect_location_sensitive(fields):
    boxes = []
    for field in fields:
        text = field['inferText']
        if is_valid_location_query(text) and is_searchable_in_map(text):
            boxes.append(field['boundingPoly']['vertices'])
    return boxes

# ✅ 번호판 감지
def detect_license_plate(image_path):
    import contextlib
    import sys
    with contextlib.redirect_stdout(sys.stderr):
        results = lp_model(image_path)
    boxes = results[0].boxes.xyxy.cpu().numpy()
    return [list(map(int, box[:4])) for box in boxes]

# ✅ 전체 감지 통합

def detect_personal_info(image_path):
    ocr_result = run_ocr(image_path)
    fields = ocr_result['images'][0]['fields']

    phones, emails = detect_phones_emails(fields)
    addresses = detect_addresses(fields)
    locations = detect_location_sensitive(fields)
    plates = detect_license_plate(image_path)

    return {
        "phones": phones,
        "emails": emails,
        "addresses": addresses,
        "location_sensitive": locations,
        "license_plates": plates
    }

# 이후 얼굴 인식은 별도 함수에서 처리 예정
