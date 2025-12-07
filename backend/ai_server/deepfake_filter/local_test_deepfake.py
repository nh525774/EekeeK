import os
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import cv2
from PIL import Image
from torchvision import transforms
import torchvision.transforms.functional as TF

# =========================
# 0. 설정값
# =========================
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
EPS =0.20
TARGET_SIZE = 160    # UNet 입력 크기

# 🔧 네 환경에 맞게 아래 3개만 수정하면 됨!
IMG_PATH = r"C:\Users\User\TripleS2\backend\ai_server\deepfake_filter\test_input.jpg"
CKPT_PATH = os.path.join(os.path.dirname(__file__), "final_adv_generator.pth")
OUT_PATH = os.path.join(os.path.dirname(__file__), "output_adv_filter.png")

# =========================
# 1. UNet Generator
# =========================
class ConvBlock(nn.Module):
    def __init__(self, in_c, out_c, kernel_size=3, stride=1, padding=1, norm="bn"):
        super().__init__()
        self.conv = nn.Conv2d(in_c, out_c, kernel_size, stride, padding, bias=False)
        self.norm = nn.BatchNorm2d(out_c) if norm == "bn" else nn.Identity()
        self.relu = nn.ReLU(True)

    def forward(self, x):
        return self.relu(self.norm(self.conv(x)))


class UNetGenerator(nn.Module):
    def __init__(self, in_c=3, out_c=3, base_c=64):
        super().__init__()
        self.enc1 = nn.Sequential(
            ConvBlock(in_c, base_c),
            ConvBlock(base_c, base_c),
        )
        self.enc2 = nn.Sequential(
            nn.AvgPool2d(2),
            ConvBlock(base_c, base_c * 2),
            ConvBlock(base_c * 2, base_c * 2),
        )
        self.enc3 = nn.Sequential(
            nn.AvgPool2d(2),
            ConvBlock(base_c * 2, base_c * 4),
            ConvBlock(base_c * 4, base_c * 4),
        )
        self.bottle = nn.Sequential(
            nn.AvgPool2d(2),
            ConvBlock(base_c * 4, base_c * 8),
            ConvBlock(base_c * 8, base_c * 8),
            nn.Dropout(0.2),
        )
        self.dec3 = nn.Sequential(
            nn.Upsample(scale_factor=2, mode="bilinear", align_corners=False),
            ConvBlock(base_c * 8, base_c * 4),
            ConvBlock(base_c * 4, base_c * 4),
        )
        self.dec2 = nn.Sequential(
            nn.Upsample(scale_factor=2, mode="bilinear", align_corners=False),
            ConvBlock(base_c * 4, base_c * 2),
            ConvBlock(base_c * 2, base_c * 2),
        )
        self.dec1 = nn.Sequential(
            nn.Upsample(scale_factor=2, mode="bilinear", align_corners=False),
            ConvBlock(base_c * 2, base_c),
            ConvBlock(base_c, base_c),
        )

        # 반드시 3x3 Conv로! (너의 checkpoint 구조)
        self.out_conv = nn.Conv2d(base_c, out_c, kernel_size=3, padding=1)
        self.tanh = nn.Tanh()

    def forward(self, x):
        e1 = self.enc1(x)
        e2 = self.enc2(e1)
        e3 = self.enc3(e2)
        b = self.bottle(e3)

        d3 = self.dec3(b)
        d2 = self.dec2(d3 + e3)
        d1 = self.dec1(d2 + e2)

        out = self.out_conv(d1 + e1)
        delta_normalized = self.tanh(out)
        return delta_normalized


# =========================
# 2. 얼굴 soft mask (MediaPipe)
# =========================
import mediapipe as mp
mp_face_mesh = mp.solutions.face_mesh.FaceMesh(
    static_image_mode=True,
    refine_landmarks=True,
    max_num_faces=1,
)

def build_face_mask_bhw(image_bgr: np.ndarray, blur_ksize: int = 41):
    """
    얼굴 영역만 1, 나머지는 0인 soft mask 생성.
    return: [1,1,H,W] float32 (0~1)
    """
    h, w, _ = image_bgr.shape

    img_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    results = mp_face_mesh.process(img_rgb)

    if not results.multi_face_landmarks:
        mask = np.zeros((h, w), dtype=np.float32)
    else:
        pts = []
        for lm in results.multi_face_landmarks[0].landmark:
            pts.append([int(lm.x * w), int(lm.y * h)])

        hull = cv2.convexHull(np.array(pts, dtype=np.int32))

        mask = np.zeros((h, w), dtype=np.float32)
        cv2.fillConvexPoly(mask, hull, 1.0)

        if blur_ksize % 2 == 0:
            blur_ksize += 1
        mask = cv2.GaussianBlur(mask, (blur_ksize, blur_ksize), 0)

    mask_t = torch.from_numpy(mask).unsqueeze(0).unsqueeze(0)
    return mask_t.float()


# =========================
# 3. 필터 적용 함수
# =========================
to_tensor = transforms.ToTensor()

def apply_filter(generator_model, pil_img, eps=EPS, target_size=TARGET_SIZE):
    generator_model.eval()

    H, W = pil_img.height, pil_img.width
    img_orig = to_tensor(pil_img).unsqueeze(0).to(DEVICE)

    # 1) 160x160 delta
    img_160 = to_tensor(
        pil_img.resize((target_size, target_size), Image.BICUBIC)
    ).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        delta_160 = generator_model(img_160) * eps

    # 2) 원본 해상도로 업샘플
    delta_up = F.interpolate(delta_160, size=(H, W), mode="bicubic", align_corners=False)
    delta_up = TF.gaussian_blur(delta_up, kernel_size=9, sigma=3)

    # 3) 첫 번째 adversarial 적용
    img_adv_full = torch.clamp(img_orig + delta_up, 0.0, 1.0)

    # 4) numpy 변환 → mask 생성
    img_adv_np = (img_adv_full[0].permute(1, 2, 0).cpu().numpy() * 255).astype(np.uint8)
    img_bgr = cv2.cvtColor(img_adv_np, cv2.COLOR_RGB2BGR)

    face_mask = build_face_mask_bhw(img_bgr, blur_ksize=41).to(img_adv_full.device)
    face_mask3 = face_mask.repeat(1, 3, 1, 1)

    # 5) 얼굴 smoothing
    bgr_smooth = cv2.bilateralFilter(img_bgr, d=15, sigmaColor=50, sigmaSpace=50)
    rgb_smooth = cv2.cvtColor(bgr_smooth, cv2.COLOR_BGR2RGB)
    smooth_adv = (
        torch.from_numpy(rgb_smooth / 255.0)
        .permute(2, 0, 1)
        .unsqueeze(0)
        .float()
        .to(DEVICE)
    )

    # 6) smoothing · adv 블렌딩
    alpha = 0.30
    blend_mask = face_mask3 * alpha
    img_blend = img_adv_full * (1 - blend_mask) + smooth_adv * blend_mask

    # 7) 원본 색감 약간 섞기
    gamma = 0.25
    orig_blend_mask = face_mask3 * gamma
    img_final = img_blend * (1 - orig_blend_mask) + img_orig * orig_blend_mask
    img_final = img_final.clamp(0, 1)

    # 8) PIL 변환
    arr = (img_final[0].cpu().numpy().transpose(1, 2, 0) * 255).astype(np.uint8)
    return Image.fromarray(arr)


# =========================
# 4. 메인 실행
# =========================
def main():
    # 1) 이미지 로드
    if not os.path.exists(IMG_PATH):
        raise FileNotFoundError(f"입력 이미지 없음: {IMG_PATH}")

    pil_img = Image.open(IMG_PATH).convert("RGB")
    print("[1/3] 입력 이미지 로드 완료")

    # 2) 모델 로드
    if not os.path.exists(CKPT_PATH):
        raise FileNotFoundError(f"체크포인트 없음: {CKPT_PATH}")

    print("[2/3] 체크포인트 로드 중…")
    generator = UNetGenerator().to(DEVICE)

    state_dict = torch.load(CKPT_PATH, map_location=DEVICE)
    generator.load_state_dict(state_dict)
    generator.eval()

    # 3) 필터 적용
    print("[3/3] 필터 적용 중…")
    out_img = apply_filter(generator, pil_img)

    out_img.save(OUT_PATH)
    print(f"✅ 완료! 저장됨 → {OUT_PATH}")


if __name__ == "__main__":
    main()
