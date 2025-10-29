import os, torch, torch.nn as nn, torch.nn.functional as F
from functools import lru_cache
from PIL import Image
from io import BytesIO
import requests
import torchvision.transforms as T

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
EPS = float(os.getenv("DF_EPS", 5.0/255.0))
TARGET = int(os.getenv("DF_TARGET", 160))
DF_CKPT = os.getenv("DF_CKPT", os.path.join(os.path.dirname(__file__), "generator_epoch_0046.pth"))

# ---- UNet (testcode 기반) ----
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
        self.out_conv = nn.Conv2d(base, out_c, 1)
        self.tanh = nn.Tanh()
    def forward(self, x):
        e1=self.enc1(x); e2=self.enc2(e1); e3=self.enc3(e2); b=self.bottle(e3)
        d3=self.dec3(b); d2=self.dec2(d3+e3); d1=self.dec1(d2+e2)
        out=self.out_conv(d1+e1); return self.tanh(out)

@lru_cache(maxsize=1)
def get_generator():
    g = UNetGenerator().to(DEVICE)
    ckpt = torch.load(DF_CKPT, map_location=DEVICE)
    state = ckpt.get("model_state_dict", ckpt)
    g.load_state_dict(state)
    g.eval()
    return g

def fetch_image(url: str) -> Image.Image:
    r = requests.get(url, timeout=30); r.raise_for_status()
    return Image.open(BytesIO(r.content)).convert("RGB")

to_tensor = T.ToTensor()

def apply_delta_base64(source_url: str) -> tuple[str, bytes]:
    img = fetch_image(source_url)
    H, W = img.height, img.width

    g = get_generator()
    x_160 = to_tensor(img.resize((TARGET, TARGET))).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        delta_160 = g(x_160) * EPS

    x_full = to_tensor(img).unsqueeze(0).to(DEVICE)
    delta_up = F.interpolate(delta_160, size=(H, W), mode='bicubic', align_corners=False)
    x_adv = torch.clamp(x_full + delta_up, 0.0, 1.0)

    arr = (x_adv.squeeze(0).cpu().clamp(0,1).numpy().transpose(1,2,0) * 255).astype("uint8")
    out = Image.fromarray(arr, mode="RGB")
    buf = BytesIO(); out.save(buf, format="JPEG", quality=92)
    return "image/jpeg", buf.getvalue()
