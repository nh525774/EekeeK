# model.py  — modified apply_delta_base64 to use deepfake1125_(1) test-style postprocessing
import os, torch, torch.nn as nn, torch.nn.functional as F
from functools import lru_cache
from PIL import Image
from io import BytesIO
import requests
import torchvision.transforms as T
import numpy as np
import cv2
import mediapipe as mp
import torchvision.transforms.functional as TF

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
EPS = float(os.getenv("DF_EPS", 0.25))
TARGET = int(os.getenv("DF_TARGET", 160))
DF_CKPT = os.getenv("DF_CKPT", os.path.join(os.path.dirname(__file__), "final_adv_generator.pth"))

# ---- UNet ----
class ConvBlock(nn.Module):
    def __init__(self, in_c, out_c, k=3, s=1, p=1, norm="bn"):
        super().__init__()
        self.conv = nn.Conv2d(in_c, out_c, k, s, p, bias=False)
        self.norm = nn.BatchNorm2d(out_c) if norm == "bn" else nn.Identity()
        self.relu = nn.ReLU(True)
    def forward(self, x): return self.relu(self.norm(self.conv(x)))

class UNetGenerator(nn.Module):
    def __init__(self, in_c=3, out_c=3, base=64):
        super().__init__()
        self.enc1 = nn.Sequential(ConvBlock(in_c, base), ConvBlock(base, base))
        self.enc2 = nn.Sequential(nn.AvgPool2d(2), ConvBlock(base, base*2), ConvBlock(base*2, base*2))
        self.enc3 = nn.Sequential(nn.AvgPool2d(2), ConvBlock(base*2, base*4), ConvBlock(base*4, base*4))
        self.bottle = nn.Sequential(nn.AvgPool2d(2), ConvBlock(base*4, base*8), ConvBlock(base*8, base*8), nn.Dropout(0.2))
        self.dec3 = nn.Sequential(nn.Upsample(scale_factor=2, mode='bilinear', align_corners=False), ConvBlock(base*8, base*4), ConvBlock(base*4, base*4))
        self.dec2 = nn.Sequential(nn.Upsample(scale_factor=2, mode='bilinear', align_corners=False), ConvBlock(base*4, base*2), ConvBlock(base*2, base*2))
        self.dec1 = nn.Sequential(nn.Upsample(scale_factor=2, mode='bilinear', align_corners=False), ConvBlock(base*2, base), ConvBlock(base, base))
        self.out_conv = nn.Conv2d(base, out_c, 3, padding=1)
        self.tanh = nn.Tanh()
    def forward(self, x):
        e1=self.enc1(x); e2=self.enc2(e1); e3=self.enc3(e2); b=self.bottle(e3)
        d3=self.dec3(b); d2=self.dec2(d3+e3); d1=self.dec1(d2+e2)
        out=self.out_conv(d1+e1); return self.tanh(out)

@lru_cache(maxsize=1)
def get_generator():
    g = UNetGenerator().to(DEVICE)
    if os.path.exists(DF_CKPT):
        ckpt = torch.load(DF_CKPT, map_location=DEVICE)
        state = ckpt.get("model_state_dict", ckpt)
        try:
            g.load_state_dict(state)
        except Exception:
            if isinstance(ckpt, dict) and "model_state_dict" in ckpt:
                g.load_state_dict(ckpt["model_state_dict"])
            else:
                raise
    else:
        print(f"[Warning] DF_CKPT not found at {DF_CKPT}. Generator randomly initialized.")
    g.eval()
    return g


mp_face_mesh = mp.solutions.face_mesh.FaceMesh(
    static_image_mode=True,
    refine_landmarks=True,
    max_num_faces=1,
)

def build_face_mask_bhw(image_bgr: np.ndarray, blur_ksize: int = 41):
    h, w, _ = image_bgr.shape

    img_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    results = mp_face_mesh.process(img_rgb)

    if not results.multi_face_landmarks:
        mask = np.zeros((h, w), dtype=np.float32)
    else:
        landmarks = results.multi_face_landmarks[0]
        pts = []
        for lm in landmarks.landmark:
            x = int(lm.x * w)
            y = int(lm.y * h)
            pts.append([x, y])
        pts = np.array(pts, dtype=np.int32)

        hull = cv2.convexHull(pts)
        mask = np.zeros((h, w), dtype=np.float32)
        cv2.fillConvexPoly(mask, hull, 1.0)

        if blur_ksize > 0:
            if blur_ksize % 2 == 0:
                blur_ksize += 1
            mask = cv2.GaussianBlur(mask, (blur_ksize, blur_ksize), 0)

    mask_t = torch.from_numpy(mask).unsqueeze(0).unsqueeze(0)  # [1,1,H,W]
    return mask_t.to(torch.float32)

def fetch_image(url: str) -> Image.Image:
    r = requests.get(url, timeout=30); r.raise_for_status()
    return Image.open(BytesIO(r.content)).convert("RGB")

to_tensor = T.ToTensor()

def apply_delta_base64(source_url: str) -> tuple[str, bytes]:
    """
    Fetch image from source_url, run generator to make delta (on TARGET size),
    upsample + blur delta, then apply face soft-mask blending & smoothing
    (bilateral smoothing inside face, two-stage blend) and return JPEG bytes.

    Returns: (mime_type, bytes)
    """
    # 1) fetch & prep
    img_orig_pil = fetch_image(source_url)
    H, W = img_orig_pil.height, img_orig_pil.width

    img_orig = to_tensor(img_orig_pil).unsqueeze(0).to(DEVICE)  # [1,3,H,W]
    img_160 = to_tensor(img_orig_pil.resize((TARGET, TARGET), Image.BICUBIC)).unsqueeze(0).to(DEVICE)

    # 2) get generator and produce delta on 160x160
    g = get_generator()
    with torch.no_grad():
        delta_160 = g(img_160) * EPS  # scaled delta

    # 3) upsample delta to original resolution and smooth it
    delta_up = F.interpolate(delta_160, size=(H, W), mode='bicubic', align_corners=False)
    try:
        delta_up = TF.gaussian_blur(delta_up, kernel_size=9, sigma=3)
    except Exception:
        tmp = (delta_up[0].permute(1,2,0).cpu().numpy() * 255.0).astype(np.uint8)
        tmp = cv2.GaussianBlur(tmp, (9,9), 3)
        tmp = torch.from_numpy(tmp.astype(np.float32) / 255.0).permute(2,0,1).unsqueeze(0).to(DEVICE)
        delta_up = tmp

    img_adv_full = torch.clamp(img_orig + delta_up, 0.0, 1.0)

    img_adv_np = (img_adv_full[0].permute(1, 2, 0).detach().cpu().numpy() * 255.0)
    img_adv_np = np.clip(img_adv_np, 0, 255).astype(np.uint8)
    img_bgr_for_mask = cv2.cvtColor(img_adv_np, cv2.COLOR_RGB2BGR)

    
    face_mask = build_face_mask_bhw(img_bgr_for_mask, blur_ksize=31).to(img_adv_full.device) 
    face_mask3 = face_mask.repeat(1, 3, 1, 1)

    img_orig_np = (img_orig[0].permute(1,2,0).detach().cpu().numpy() * 255.0).astype(np.uint8)
    bgr_orig = cv2.cvtColor(img_orig_np, cv2.COLOR_RGB2BGR)
    bgr_smooth = cv2.bilateralFilter(bgr_orig, d=15, sigmaColor=50, sigmaSpace=50)
    rgb_smooth = cv2.cvtColor(bgr_smooth, cv2.COLOR_BGR2RGB)
    smooth_adv = (
        torch.from_numpy(rgb_smooth.astype(np.float32) / 255.0).permute(2, 0, 1)
        .unsqueeze(0).to(DEVICE)
    )
    alpha = 0.25 
    blend_mask = face_mask3 * alpha
    img_blend = img_adv_full * (1.0 - blend_mask) + smooth_adv * blend_mask

    gamma = 0.30
    orig_blend_mask = face_mask3 * gamma
    img_final = img_blend * (1.0 - orig_blend_mask) + img_orig * orig_blend_mask
    img_final = img_final.clamp(0.0, 1.0)

    arr = (img_final.squeeze(0).cpu().numpy().transpose(1,2,0))
    arr = np.clip(arr * 255.0, 0, 255).astype("uint8")
    out_img = Image.fromarray(arr, mode="RGB")
    buf = BytesIO()
    out_img.save(buf, format="JPEG", quality=92)
    return "image/jpeg", buf.getvalue()
