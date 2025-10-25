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
from facenet_pytorch import MTCNN
from dotenv import load_dotenv
from pathlib import Path


# ✅ 로그 제거용 context manager
@contextlib.contextmanager
def suppress_output():
    with open(os.devnull, 'w') as devnull:
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        sys.stdout = devnull
        sys.stderr = devnull
        try:
            yield
        finally:
            sys.stdout = old_stdout
            sys.stderr = old_stderr

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# ✅ 환경설정
secret_key = os.environ.get('OCR_SECRET_KEY')
api_url = os.environ.get('OCR_API_URL')
naver_client_id = os.environ.get('NAVER_CLIENT_ID')
naver_client_secret = os.environ.get('NAVER_CLIENT_SECRET')

# ✅ YOLO 모델 로드 (로그 suppress 포함)
def load_model():
    DEFAULT_LOCAL = os.path.join(os.path.dirname(__file__), "license_plate_detector.pt")
    model_path = os.getenv("LICENSE_PLATE_MODEL", DEFAULT_LOCAL)

    if not Path(model_path).exists():
        raise FileNotFoundError(f"model not found: {model_path}")

    print(f"[license-plate] using model: {model_path}")
    return YOLO(model_path)

with suppress_output():
    lp_model = load_model()

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

def is_valid_location_query(text):
    text = text.strip()
    return len(text) >= 2 and not text.isdigit() and not re.fullmatch(r'[^\w가-힣]+', text)

def is_searchable_in_map(text):
    url = "https://openapi.naver.com/v1/search/local.json"
    headers = {"X-Naver-Client-Id": naver_client_id, "X-Naver-Client-Secret": naver_client_secret}
    params = {"query": text.strip(), "display": 1}
    r = requests.get(url, headers=headers, params=params)
    return r.status_code == 200 and len(r.json().get("items", [])) > 0

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

def detect_location_sensitive(fields):
    boxes = []
    for field in fields:
        text = field['inferText']
        if is_valid_location_query(text) and is_searchable_in_map(text):
            boxes.append(field['boundingPoly']['vertices'])
    return boxes

def detect_license_plate(image_path):
    results = lp_model.predict(source=image_path, conf=0.25, verbose=False)
    boxes = results[0].boxes.xyxy.cpu().numpy()
    return [list(map(int, box[:4])) for box in boxes]

def detect_faces(image_path):
    img = Image.open(image_path).convert("RGB")
    mtcnn = MTCNN(keep_all=True, device='cpu')
    boxes, _ = mtcnn.detect(img)
    face_data = []
    if boxes is not None:
        for idx, box in enumerate(boxes):
            x1, y1, x2, y2 = map(int, box)
            face_data.append({"id": idx, "box": [x1, y1, x2, y2]})
    return face_data

def detect_personal_info(image_path, keys=None):
    # keys: ["license_plates","faces","phones","emails","addresses","location_sensitive"] 중 일부
    keys = set([k.strip() for k in (keys or []) if k and isinstance(k, str)])

    out = {
        "phones": [],
        "emails": [],
        "addresses": [],
        "location_sensitive": [],
        "license_plates": [],
        "faces": [],
    }

    # OCR 계열
    if not keys or keys & {"phones","emails","addresses","location_sensitive"}:
        try:
            ocr_result = run_ocr(image_path)
            fields = ocr_result.get('images', [{}])[0].get('fields', [])
            if (not keys) or ("phones" in keys or "emails" in keys):
                p, e = detect_phones_emails(fields)
                if "phones" in keys or not keys: out["phones"] = p
                if "emails" in keys or not keys: out["emails"] = e
            if (not keys) or ("addresses" in keys):
                out["addresses"] = detect_addresses(fields)
            if (not keys) or ("location_sensitive" in keys):
                out["location_sensitive"] = detect_location_sensitive(fields)
        except Exception as e:
            print(f"[OCR] skip: {e}", file=sys.stderr)

    # 번호판
    if (not keys) or ("license_plates" in keys):
        try:
            out["license_plates"] = detect_license_plate(image_path) or []
        except Exception as e:
            print(f"[LP] skip: {e}", file=sys.stderr)

    # 얼굴
    if (not keys) or ("faces" in keys):
        try:
            out["faces"] = detect_faces(image_path) or []
        except Exception as e:
            print(f"[FACE] skip: {e}", file=sys.stderr)

    return out