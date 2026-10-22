"""Compose the Clip Engine icon set from the 3D-rendered mark (mark.png, RGBA, 2048px).

Usage: python3 compose.py mark.png OUT_DIR
Adds: dark gradient background, neon bloom, holographic scanlines, squircle mask, exports.
"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
N = 2048  # working resolution

mark = Image.open(SRC).convert('RGBA').resize((N, N), Image.LANCZOS)
M = np.asarray(mark).astype(np.float32) / 255.0
rgb, a = M[..., :3], M[..., 3:4]
prem = rgb * a  # premultiplied

def hexc(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255.0

yy, xx = np.mgrid[0:N, 0:N].astype(np.float32) / N

def radial(cx, cy, r, col, k=1.0):
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / r
    w = np.clip(1 - d, 0, 1) ** 2 * k
    return w[..., None] * hexc(col)

def background():
    bg = np.zeros((N, N, 3), np.float32) + hexc('#07080c')
    # vertical base gradient: deep indigo-navy top -> near black bottom
    t = yy[..., None]
    bg = bg * t + (hexc('#0f1030') * (1 - t)) + 0 * bg
    bg += radial(0.50, 0.42, 0.62, '#2a2f8a', 0.85)   # indigo halo behind the clip
    bg += radial(0.12, 0.10, 0.55, '#ff3d7f', 0.16)   # pink corner glow
    bg += radial(0.92, 0.85, 0.60, '#3ee0c8', 0.13)   # teal corner glow
    bg += radial(0.85, 0.12, 0.45, '#b18cff', 0.12)   # violet top-right
    # faint holographic scanlines + perspective floor grid hint
    scan = (np.sin(yy * N * np.pi / 6.0) * 0.5 + 0.5) ** 8
    bg += scan[..., None] * 0.012 * hexc('#6d7cff') / hexc('#6d7cff').max()
    # vignette
    d = np.sqrt((xx - 0.5) ** 2 + (yy - 0.47) ** 2)
    bg *= (1 - np.clip((d - 0.35) / 0.5, 0, 1) ** 1.6 * 0.55)[..., None]
    return np.clip(bg, 0, 1)

def blur(arr, r):
    out = np.zeros_like(arr)
    for c in range(arr.shape[2]):
        ch = Image.fromarray(np.clip(arr[..., c] * 255, 0, 255).astype(np.uint8), 'L')
        out[..., c] = np.asarray(ch.filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255.0
    return out

# bloom source: bright + saturated parts (neon) of the premultiplied mark
def bloom_src(p):
    mx = p.max(axis=2, keepdims=True); mn = p.min(axis=2, keepdims=True)
    sat = (mx - mn) / np.maximum(mx, 1e-4)
    return p * np.clip((mx - 0.45) / 0.4, 0, 1) * (0.25 + 0.75 * sat)
bright = bloom_src(prem)
bloom = blur(bright, 10) * 1.0 + blur(bright, 34) * 1.0 + blur(bright, 90) * 0.85
# soft cast shadow under the object onto background
shadow = blur(a * 1.0, 40)[..., 0:1]

def screen(base, add):
    return 1 - (1 - base) * (1 - np.clip(add, 0, 1))

def full_icon():
    bg = background()
    bg = bg * (1 - shadow * 0.35)
    bg = screen(bg, bloom)                       # glow behind
    out = prem + bg * (1 - a)                    # object over
    out = screen(out, bloom * 0.35)              # glow over (bloom bleed)
    return np.clip(out, 0, 1)

def to_img(arr, alpha=None):
    arr = (np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8)
    if alpha is None:
        return Image.fromarray(arr, 'RGB')
    al = (np.clip(alpha, 0, 1) * 255 + 0.5).astype(np.uint8)
    return Image.fromarray(np.dstack([arr, al]), 'RGBA')

def squircle_mask(size, n=5.0, ss=4):
    s = size * ss
    y, x = np.mgrid[0:s, 0:s].astype(np.float32)
    u = (x + 0.5) / s * 2 - 1; v = (y + 0.5) / s * 2 - 1
    m = (np.abs(u) ** n + np.abs(v) ** n) <= 1.0
    return Image.fromarray((m * 255).astype(np.uint8), 'L').resize((size, size), Image.LANCZOS)

def save(img, name):
    p = os.path.join(OUT, name)
    if img.mode == 'RGBA':
        img.save(p, optimize=True)
    else:
        img.save(p, optimize=True)
    # quantize large ones if needed to keep size down
    print(name, img.size, os.path.getsize(p))

full = to_img(full_icon())                                     # 2048 opaque full-bleed

save(full.resize((1024, 1024), Image.LANCZOS), 'icon-1024.png')
save(full.resize((180, 180), Image.LANCZOS), 'apple-touch-icon.png')

for sz, name in ((512, 'icon-512.png'), (192, 'icon-192.png')):
    im = full.resize((sz, sz), Image.LANCZOS).convert('RGBA')
    im.putalpha(squircle_mask(sz))
    save(im, name)

# maskable: mark scaled down into central safe zone over the same (full-bleed) background
def maskable():
    scale = 0.72
    small = mark.resize((int(N * scale), int(N * scale)), Image.LANCZOS)
    canvas = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    off = (N - small.width) // 2
    canvas.paste(small, (off, off + int(N * 0.01)))
    global M
    Mm = np.asarray(canvas).astype(np.float32) / 255.0
    am = Mm[..., 3:4]; pm = Mm[..., :3] * am
    br = bloom_src(pm)
    bl = blur(br, 9) * 1.0 + blur(br, 30) * 1.0 + blur(br, 80) * 0.85
    sh = blur(am, 36)[..., 0:1]
    bg = background() * (1 - sh * 0.35)
    bg = screen(bg, bl)
    out = pm + bg * (1 - am)
    return to_img(screen(out, bl * 0.35))
save(maskable().resize((512, 512), Image.LANCZOS), 'icon-maskable-512.png')

# splash: transparent, mark + glow (glow carries its own alpha = brightness)
glow = np.clip(bloom * 1.1, 0, 1)
ga = glow.max(axis=2, keepdims=True)
glow_rgb = np.where(ga > 1e-4, glow / np.maximum(ga, 1e-4), 0)
out_a = a + ga * (1 - a)
out_rgb = (prem + glow * (1 - a)) / np.maximum(out_a, 1e-4)
splash = to_img(out_rgb, out_a[..., 0]).resize((512, 512), Image.LANCZOS)
save(splash, 'splash-logo.png')
