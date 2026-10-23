"""
TikTok photo-carousel (slideshow) generator.

Builds 5-7 slide decks (1080x1920, 9:16) for a campaign from a podcast transcript plus a few
built-in rule-breakdown / myth-buster decks, and renders them as premium dark slides.

  python slideshow.py build --campaign campaigns/tradever.json --transcript podcast.txt --out out/ [--limit N]

API
  render(slides, out_dir, logo_path, theme=None) -> [Path]      one PNG per slide
  render_slide(slide, index, total, logo_path, theme=None) -> (Image, boxes)
  decks_from_transcript(transcript_text, campaign) -> [deck]     deck = {id, angle, title, caption, slides}
  verify_deck(deck, campaign, transcript_text) -> [problem]      empty list = deck is clean

Slide dict: {"text": str, "sub": optional str, "kind": "hook"|"point"|"quote"|"cta", "tag": optional str}
Mark words with *stars* to paint them in the brand green; $ amounts / percents / big numbers are painted
green automatically when a slide has no stars. Deterministic: no network, no AI, seeded noise.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
W, H = 1080, 1920
# TikTok UI keeps the top ~220 px, the bottom ~420 px and the right ~140 px; text stays inside this box.
SAFE = (80, 220, W - 140, H - 420)          # x0, y0, x1, y1

DEFAULT_THEME = {
    "bg": (5, 7, 8),
    "accent": (22, 222, 74),                 # sampled from the official Tradever logo
    "text": (255, 255, 255),
    "muted": (160, 168, 172),
    "glow": 0.16,
    "grid": 7,
    "noise": 5.0,
    "ceo": "Layth, Tradever CEO",
    "cta_text": "Get funded with *Tradever*",
    "cta_sub": "Use code *LAYTH* for 40% off",
    "cta_button": "LINK IN BIO",
    "cta_features": "Weekly payouts \u00b7 EOD drawdown \u00b7 Futures",
    "brand": "Tradever",
}

KIND_TAGS = {"hook": "", "point": "", "quote": "CEO QUOTE", "cta": ""}

# ----------------------------------------------------------------------------------------------- fonts
_FONT_CANDIDATES = {
    "display": [
        HERE / "fonts" / "InterDisplay-ExtraBold.otf",
        "/usr/share/fonts/opentype/inter/InterDisplay-ExtraBold.otf",
        "C:/Windows/Fonts/seguibl.ttf", "C:/Windows/Fonts/arialbd.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ],
    "body": [
        HERE / "fonts" / "Inter-SemiBold.otf",
        "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf",
        "C:/Windows/Fonts/seguisb.ttf", "C:/Windows/Fonts/arialbd.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ],
}
_font_cache: dict = {}


def font(role: str, size: int) -> ImageFont.FreeTypeFont:
    key = (role, int(size))
    if key not in _font_cache:
        for cand in _FONT_CANDIDATES[role]:
            if Path(cand).is_file():
                _font_cache[key] = ImageFont.truetype(str(cand), int(size))
                break
        else:
            _font_cache[key] = ImageFont.load_default(int(size))
    return _font_cache[key]


# ----------------------------------------------------------------------------------------------- text
_AUTO_HI = re.compile(r"^(\$[\d,.]+[KkMm]?|\d[\d,.]*%|\d{1,3}(,\d{3})+|\d+[Kk])[.,!?:;]*$")


def tokens(text: str) -> list[tuple[str, bool]]:
    """Split into (word, highlighted). *a b* marks green; without marks, money/percent/big numbers go green."""
    out, hi = [], False
    starred = "*" in text
    for raw in text.split():
        w = raw
        start = w.startswith("*")
        if start:
            hi, w = True, w[1:]
        end = w.rstrip(".,!?:;'\")").endswith("*")
        if end:
            i = w.rfind("*")
            w = w[:i] + w[i + 1:]
        flag = hi or (not starred and bool(_AUTO_HI.match(w)))
        if w:
            out.append((w, flag))
        if end:
            hi = False
    return out


def plain(text: str) -> str:
    return " ".join(w for w, _ in tokens(text or ""))


def wrap(toks, fnt, max_w) -> list[list[tuple[str, bool]]]:
    space = fnt.getlength(" ")
    lines, cur, cur_w = [], [], 0.0
    for w, hi in toks:
        ww = fnt.getlength(w)
        if cur and cur_w + space + ww > max_w:
            lines.append(cur)
            cur, cur_w = [], 0.0
        cur_w = ww if not cur else cur_w + space + ww
        cur.append((w, hi))
    if cur:
        lines.append(cur)
    return lines


def fit(text, role, max_w, max_h, max_size, min_size=36, lh=1.1):
    """Largest font size whose wrapped text fits (max_w, max_h). Returns (font, lines, line_h, height)."""
    toks = tokens(text)
    size = max_size
    while True:
        f = font(role, size)
        lines = wrap(toks, f, max_w)
        line_h = int(size * lh)
        widest = max((line_width(l, f) for l in lines), default=0)
        height = line_h * len(lines)
        if (height <= max_h and widest <= max_w) or size <= min_size:
            return f, lines, line_h, height
        size -= 2


def line_width(line, fnt) -> float:
    return sum(fnt.getlength(w) for w, _ in line) + fnt.getlength(" ") * max(0, len(line) - 1)


def draw_lines(img, glow, lines, fnt, x, y, line_h, color, accent, align="left", box_w=0):
    """Draw wrapped rich lines; returns the bounding box actually inked."""
    d = ImageDraw.Draw(img)
    g = ImageDraw.Draw(glow)
    space = fnt.getlength(" ")
    x0s, x1s, y0s, y1s = [], [], [], []
    for i, line in enumerate(lines):
        lw = line_width(line, fnt)
        cx = x + (box_w - lw) / 2 if align == "center" else x
        cx -= min(0, fnt.getbbox(line[0][0])[0])           # glyphs with a negative left bearing stay inside
        cy = y + i * line_h
        for w, hi in line:
            core, tail = w, ""
            if hi:                                   # keep trailing punctuation white: "close." -> close + .
                m = re.match(r"^(.*?[^.,!?:;])([.,!?:;]+)$", w)
                if m:
                    core, tail = m.group(1), m.group(2)
            d.text((cx, cy), core, font=fnt, fill=accent if hi else color)
            if hi:
                g.text((cx, cy), core, font=fnt, fill=accent + (150,))
                if tail:
                    d.text((cx + fnt.getlength(core), cy), tail, font=fnt, fill=color)
            bb = d.textbbox((cx, cy), w, font=fnt)
            x0s.append(bb[0]); y0s.append(bb[1]); x1s.append(bb[2]); y1s.append(bb[3])
            cx += fnt.getlength(w) + space
    if not x0s:
        return (x, y, x, y)
    return (min(x0s), min(y0s), max(x1s), max(y1s))


# ----------------------------------------------------------------------------------------------- art
def _seed(*parts) -> int:
    return int(hashlib.sha1("|".join(map(str, parts)).encode()).hexdigest()[:8], 16)


def _smooth_field(theme, index, kind) -> np.ndarray:
    """Glows + vignette (smooth, so computed at 1/4 size and upscaled). Returns H x W x 3 float32."""
    q = 4
    h, w = H // q, W // q
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    xx, yy = xx * q, yy * q
    base = np.zeros((h, w, 3), np.float32) + np.array(theme["bg"], np.float32)
    acc = np.array(theme["accent"], np.float32)
    # soft brand glow, its corner alternates per slide so a swipe feels alive
    spots = [(0.85, 0.12), (0.1, 0.3), (0.9, 0.55), (0.15, 0.75), (0.8, 0.85)]
    gx, gy = spots[index % len(spots)] if kind != "cta" else (0.5, 0.32)
    r = np.sqrt(((xx - gx * W) / (W * 0.75)) ** 2 + ((yy - gy * H) / (H * 0.42)) ** 2)
    base += (np.clip(1 - r, 0, 1) ** 2.2 * theme["glow"] * (1.6 if kind == "cta" else 1.0))[..., None] * acc
    # cool counter-glow for depth
    r2 = np.sqrt(((xx - (1 - gx) * W) / (W * 0.9)) ** 2 + ((yy - (1 - gy) * H) / (H * 0.5)) ** 2)
    base += (np.clip(1 - r2, 0, 1) ** 2.5 * 0.05)[..., None] * np.array([60, 110, 160], np.float32)
    # grid fade (stored in a 4th channel) and vignette
    fade = np.clip(1.15 - np.sqrt(((xx - W / 2) / (W * 0.7)) ** 2 + ((yy - H * 0.45) / (H * 0.6)) ** 2), 0, 1)
    vig = np.clip(1.25 - 0.55 * np.sqrt(((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H / 2) / (H * 0.62)) ** 2),
                  0.35, 1)
    chans = [base[..., 0], base[..., 1], base[..., 2], fade, vig]
    up = [np.asarray(Image.fromarray(c.astype(np.float32), "F").resize((W, H), Image.BILINEAR)) for c in chans]
    return np.stack(up, axis=-1)


def background(theme, index, total, kind, seed_text="") -> Image.Image:
    rng = np.random.default_rng(_seed(index, total, kind, seed_text))
    f = _smooth_field(theme, index, kind)
    base = f[..., :3].copy()
    # faint grid that fades toward the edges
    step = 72
    ax = (np.arange(W) % step) < 1.5
    ay = (np.arange(H) % step) < 1.5
    grid = (ax[None, :] | ay[:, None]).astype(np.float32)
    base += (grid * f[..., 3] * theme["grid"])[..., None]
    base *= f[..., 4:5]
    # film grain (one channel, so it stays neutral)
    base += rng.normal(0, theme["noise"], (H, W, 1)).astype(np.float32)
    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    if kind != "cta":
        img.alpha_composite(chart_layer(theme, rng))
    return img


def chart_layer(theme, rng) -> Image.Image:
    """A faint random-walk price line with an area fill across the lower third (finance texture)."""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    n = 46
    steps = rng.normal(0.35, 1.0, n).cumsum()
    steps = (steps - steps.min()) / max(1e-6, steps.max() - steps.min())
    top, bottom = H * 0.66, H * 0.84
    pts = [(int(i * W / (n - 1)), int(bottom - s * (bottom - top))) for i, s in enumerate(steps)]
    fill = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(fill).polygon(pts + [(W, H), (0, H)], fill=theme["accent"] + (255,))
    grad = np.linspace(0, 1, H, dtype=np.float32)
    grad = np.clip((grad - 0.64) / 0.36, 0, 1)
    alpha = (np.sin(grad * np.pi) * 16).astype(np.uint8)
    a = np.array(fill)[..., 3].astype(np.float32) / 255 * alpha[:, None]
    fill.putalpha(Image.fromarray(a.astype(np.uint8)))
    layer.alpha_composite(fill)
    line = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(line).line(pts, fill=theme["accent"] + (70,), width=4, joint="curve")
    layer.alpha_composite(line.filter(ImageFilter.GaussianBlur(6)))
    layer.alpha_composite(line)
    return layer


_logo_cache: dict = {}


def logo_parts(logo_path):
    """(full logo, core crop without the long side lines) as RGBA."""
    key = str(logo_path)
    if key not in _logo_cache:
        im = Image.open(logo_path).convert("RGBA")
        bbox = im.getbbox() or (0, 0, im.width, im.height)
        im = im.crop(bbox)
        core = im
        if im.width / max(1, im.height) > 6:
            # wide banner: keep the columns that hold the mark + wordmark + promo line (skip faint side lines)
            a = np.array(im)[..., 3]
            rows_hit = (a > 200).sum(axis=0)          # the glowing side lines are only a few px tall
            cols = np.where(rows_hit > max(8, im.height * 0.035))[0]
            if len(cols):
                pad = int(im.height * 0.08)
                core = im.crop((max(0, cols[0] - pad), 0, min(im.width, cols[-1] + pad), im.height))
        _logo_cache[key] = (im, core)
    return _logo_cache[key]


def paste_logo(img, logo, width, x, y, center=False):
    h = int(logo.height * width / logo.width)
    lg = logo.resize((int(width), h), Image.LANCZOS)
    px = int(x - width / 2) if center else int(x)
    img.alpha_composite(lg, (px, int(y)))
    return (px, int(y), px + int(width), int(y) + h)


def pill(img, text, x, y, theme, filled=False, size=30, center=False):
    """Rounded label. Translucent parts are drawn on their own layer and composited (RGBA-safe)."""
    f = font("body", size)
    tw = f.getlength(text)
    pw, ph = int(tw + size * 1.4), int(size * 1.9)
    px = int(x - pw / 2) if center else int(x)
    d = ImageDraw.Draw(img)
    if filled:
        sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle((px, y, px + pw, y + ph), ph // 2, fill=theme["accent"] + (140,))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(22)))
        d.rounded_rectangle((px, y, px + pw, y + ph), ph // 2, fill=theme["accent"])
        d.text((px + pw / 2, y + ph / 2), text, font=f, fill=(4, 12, 6), anchor="mm")
    else:
        ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(ov).rounded_rectangle((px, y, px + pw, y + ph), ph // 2, fill=theme["accent"] + (30,),
                                             outline=theme["accent"] + (170,), width=2)
        img.alpha_composite(ov)
        d.text((px + pw / 2, y + ph / 2), text, font=f, fill=theme["accent"], anchor="mm")
    return (px, y, px + pw, y + ph)


def dots(img, index, total, theme, y):
    ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    gap, r, active_w = 26, 7, 46
    widths = [active_w if i == index else 2 * r for i in range(total)]
    tw = sum(widths) + gap * (total - 1)
    x = (SAFE[0] + SAFE[2]) / 2 - tw / 2
    for i, w in enumerate(widths):
        col = theme["accent"] + (255,) if i == index else (255, 255, 255, 70)
        d.rounded_rectangle((x, y - r, x + w, y + r), r, fill=col)
        x += w + gap
    img.alpha_composite(ov)
    return (int((SAFE[0] + SAFE[2]) / 2 - tw / 2), y - r, int((SAFE[0] + SAFE[2]) / 2 + tw / 2), y + r)


# ----------------------------------------------------------------------------------------------- slides
def render_slide(slide: dict, index: int, total: int, logo_path, theme=None):
    """Render one slide. Returns (RGB image, boxes) where boxes maps element -> (x0, y0, x1, y1)."""
    th = dict(DEFAULT_THEME, **(theme or {}))
    kind = slide.get("kind", "point")
    img = background(th, index, total, kind, slide.get("text", ""))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    boxes = {}
    x0, y0, x1, y1 = SAFE
    bw = x1 - x0
    full, core = logo_parts(logo_path)

    if kind == "cta":
        # measure first, then centre the whole block (logo, headline, code line, button) in the safe area
        logo_h = int(core.height * bw / core.width)
        f, lines, lh, h = fit(slide.get("text") or th["cta_text"], "display", bw, 340, 120, lh=1.08)
        sub = slide.get("sub") or th["cta_sub"]
        fs, sl, slh, sh = fit(sub, "body", bw, 150, 54, lh=1.25)
        btn_h = int(44 * 1.9)
        total_h = logo_h + 140 + h + 50 + sh + 80 + btn_h + 100
        top = y0 + max(0, (y1 - 90 - y0 - total_h) // 2)
        boxes["logo"] = paste_logo(img, core, bw, (x0 + x1) / 2, top, center=True)
        y = boxes["logo"][3] + 70
        ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(ov).line((x0 + bw * 0.3, y, x1 - bw * 0.3, y), fill=(255, 255, 255, 40), width=2)
        img.alpha_composite(ov)
        boxes["text"] = draw_lines(img, glow, lines, f, x0, y + 70, lh, th["text"], th["accent"], "center", bw)
        y = boxes["text"][3] + 50
        boxes["sub"] = draw_lines(img, glow, sl, fs, x0, y, slh, (225, 230, 228), th["accent"], "center", bw)
        y = boxes["sub"][3] + 80
        boxes["button"] = pill(img, slide.get("button") or th["cta_button"], (x0 + x1) / 2, y, th,
                               filled=True, size=44, center=True)
        feats = slide.get("features", th.get("cta_features", ""))
        if feats:
            ff = font("body", 34)
            fy = boxes["button"][3] + 60
            ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
            ImageDraw.Draw(ov).text(((x0 + x1) / 2, fy), feats, font=ff, fill=(255, 255, 255, 150), anchor="mt")
            img.alpha_composite(ov)
            fw = ff.getlength(feats)
            boxes["features"] = (int((x0 + x1) / 2 - fw / 2), fy, int((x0 + x1) / 2 + fw / 2), fy + 40)
    else:
        # header: small logo, slide counter
        boxes["logo"] = paste_logo(img, core, 400, x0, y0 + 30)
        d = ImageDraw.Draw(img)
        cnt = f"{index + 1:02d} / {total:02d}"
        fc = font("body", 28)
        ly = (boxes["logo"][1] + boxes["logo"][3]) / 2
        ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(ov).text((x1, ly), cnt, font=fc, fill=(255, 255, 255, 130), anchor="rm")
        img.alpha_composite(ov)
        tag = slide.get("tag") or KIND_TAGS.get(kind, "")
        top = boxes["logo"][3] + 90
        if tag:
            boxes["tag"] = pill(img, tag.upper(), x0, top, th, size=28)
            top = boxes["tag"][3] + 46
        bottom = y1 - 110                                  # room for dots
        sub = slide.get("sub") or ""

        if kind == "quote":
            # block = big quote mark (+ context to its right) / quote / attribution, centred in the free space
            fq = font("display", 300)
            mark_h, attr_h = 190, 46
            avail = bottom - top - mark_h - 50 - attr_h
            f, lines, lh, h = fit(slide["text"], "display", bw, avail, 96, lh=1.16)
            qy = top + max(0, (avail - h) * 2 // 5) - 40
            d.text((x0 - 12, qy), "\u201c", font=fq, fill=th["accent"])
            ImageDraw.Draw(glow).text((x0 - 12, qy), "\u201c", font=fq, fill=th["accent"] + (120,))
            boxes["mark"] = (x0, qy + 40, x0 + 150, qy + mark_h)
            if sub:
                fsub, subl, sublh, sub_h = fit(sub, "body", bw - 190, 110, 36, lh=1.3)
                sy = qy + 40 + (mark_h - 40 - sub_h) // 2 - 10
                boxes["sub"] = draw_lines(img, glow, subl, fsub, x0 + 190, sy, sublh, th["muted"], th["accent"])
            boxes["text"] = draw_lines(img, glow, lines, f, x0, qy + mark_h + 10, lh, th["text"], th["accent"])
            ay = boxes["text"][3] + 50
            fa = font("body", 42)
            d.text((x0, ay + 23), "\u2014 " + th["ceo"], font=fa, fill=th["accent"], anchor="lm")
            boxes["attribution"] = (x0, ay, int(x0 + fa.getlength("\u2014 " + th["ceo"])), ay + attr_h)
        else:
            max_size = 150 if kind == "hook" else 112
            sub_h = 0
            if sub:
                fsub, subl, sublh, sub_h = fit(sub, "body", bw, 260, 48, lh=1.3)
            avail = bottom - top - (sub_h + 50 if sub else 0) - 40
            f, lines, lh, h = fit(slide["text"], "display", bw, avail, max_size, lh=1.06)
            block = 40 + h + (sub_h + 50 if sub else 0)
            ty = top + max(0, (bottom - top - block) * 9 // 20)
            d.rounded_rectangle((x0, ty, x0 + 110, ty + 10), 5, fill=th["accent"])
            boxes["bar"] = (x0, ty, x0 + 110, ty + 10)
            boxes["text"] = draw_lines(img, glow, lines, f, x0, ty + 50, lh, th["text"], th["accent"])
            if sub:
                boxes["sub"] = draw_lines(img, glow, subl, fsub, x0, boxes["text"][3] + 50, sublh,
                                          th["muted"], th["accent"])
        if index == 0 and total > 1:
            fsw = font("body", 32)
            ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
            ImageDraw.Draw(ov).text((x1, y1 - 40), "swipe \u2192", font=fsw, fill=(255, 255, 255, 160), anchor="rm")
            img.alpha_composite(ov)

    boxes["dots"] = dots(img, index, total, th, y1 - 40)
    small = glow.resize((W // 2, H // 2), Image.BILINEAR).filter(ImageFilter.GaussianBlur(9))
    blurred = small.resize((W, H), Image.BILINEAR)
    # soft glow behind the green words (added on top: it only brightens green over green)
    glyphs = Image.alpha_composite(img, blurred)
    return glyphs.convert("RGB"), boxes


def render(slides: list[dict], out_dir, logo_path, theme=None) -> list[Path]:
    """Render every slide to out_dir/slide_NN.png (1080x1920). Returns the paths in order."""
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    paths = []
    for i, s in enumerate(slides):
        img, _ = render_slide(s, i, len(slides), logo_path, theme)
        p = out / f"slide_{i + 1:02d}.png"
        img.save(p, "PNG", compress_level=6)
        paths.append(p)
    return paths


# ----------------------------------------------------------------------------------------------- content
FIXES = [
    (r"\bLace Samara\b", "Layth"),
    (r"\bTrade ?Ever\b", "Tradever"),
    (r"\bTredever\b", "Tradever"),
    (r"\bprompt form\b", "prop firm"),
    (r"\bpro firms?\b", lambda m: "prop firm" + ("s" if m.group(0).endswith("s") else "")),
    (r"\bmake a seem\b", "make it seem"),
    (r"\btrust pilot\b", "Trustpilot"),
    (r"(\d) ,(\d)", r"\1,\2"),
    (r"(\d) \.(\d)", r"\1.\2"),
    (r"(\d) -(\d)", r"\1-\2"),
    (r"(\d) %", r"\1%"),
]

PROFANITY = ["fuck", "shit", "damn", "hell,", "bitch"]
ALWAYS_BANNED = ["guarantee", "risk free", "risk-free", "get rich", "can't lose", "cannot lose", "no risk",
                 "financial advice", "100% win", "passive income"]


def clean_transcript(text: str) -> str:
    """Drop timestamps, fix Whisper mishearings, return one line per segment."""
    out = []
    for line in (text or "").splitlines():
        line = re.sub(r"^\s*\[\s*[\d.:]+\]\s*", "", line).strip()
        if not line:
            continue
        for pat, rep in FIXES:
            line = re.sub(pat, rep, line, flags=re.I)
        out.append(line)
    return "\n".join(out)


def norm(text: str) -> str:
    t = (text or "").lower().replace("\u2019", "'")
    t = re.sub(r"(\d)\s*,\s*(\d)", r"\1\2", t)
    t = re.sub(r"[^a-z0-9]+", " ", t)
    return " ".join(t.split())


def quote_in(quote: str, transcript_norm: str) -> bool:
    """Every fragment of the quote (split on ellipses) must appear word for word in the transcript."""
    parts = [p for p in re.split(r"\s*(?:\u2026|\.\.\.)\s*", plain(quote)) if norm(p)]
    return bool(parts) and all(norm(p) in transcript_norm for p in parts)


_NUM_WORDS = {w: str(i) for i, w in enumerate(
    "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen "
    "seventeen eighteen nineteen twenty".split())}


def numbers(text: str, words: bool = False) -> set[str]:
    """Numbers in a text (commas dropped). words=True also counts spelled-out numbers (one..twenty)."""
    t = re.sub(r"(\d)\s*,\s*(\d)", r"\1\2", text or "")
    found = set(re.findall(r"\d+(?:\.\d+)?", t))
    if words:
        found |= {_NUM_WORDS[w] for w in re.findall(r"[a-z]+", t.lower()) if w in _NUM_WORDS}
    return found


# Decks built from the CEO podcast. Every "quote" slide must be found word for word in the transcript
# (after the Whisper fixes); every number on any slide must be one the CEO said. Decks that fail are dropped.
Q, P, HK = "quote", "point", "hook"

TRANSCRIPT_DECKS = [
    {"id": "ceo-why-he-built-tradever", "angle": "ceo_quote",
     "title": "He missed out on payouts, so he built his own prop firm",
     "caption": "Tradever's CEO Layth on why he started a prop firm: he was the trader who didn't get paid.",
     "slides": [
         (HK, "He missed out on *hundreds of thousands* in payouts.", "So he built his own prop firm."),
         (Q, "I've been a victim of trading on a prop firm and not getting payouts.", "On why Tradever exists"),
         (Q, "If you don't pay people out, you're not staying in business for a long time.", ""),
         (Q, "The reason why I launched my own prop firm is to mitigate people from not getting a payout.", ""),
     ]},
    {"id": "myth-9-out-of-100-pass", "angle": "myth_buster",
     "title": "Only about 9 out of 100 prop accounts pass",
     "caption": "The prop firm stat nobody talks about, and what it actually means for you.",
     "slides": [
         (HK, "Out of *100* prop accounts, only about *9* pass.", "Here's what that number really means."),
         (P, "And about *4* of them get funded.", "Layth, citing a 2025 study of the general public."),
         (Q, "If you're a profitable day trader, you will probably pass a lot of those 100 accounts.", "The catch:"),
         (Q, "Trading is way harder than what most people make it seem online.", ""),
     ]},
    {"id": "ceo-iq-vs-eq", "angle": "ceo_quote",
     "title": "You don't need a high IQ to trade",
     "caption": "Tradever's CEO on what actually matters in day trading. Spoiler: it's not your IQ.",
     "slides": [
         (HK, "You don't need a *high IQ* to trade.", "Tradever's CEO says it comes down to something else."),
         (Q, "What really matters when it comes to day trading is not having a high IQ, it's about having a high EQ, "
             "which is emotional intelligence.", ""),
         (P, "Strategy or *discipline*?", "His answer: \u201cDiscipline, 100%.\u201d"),
         (Q, "You could have the best strategy in the world, but if you are not disciplined and use proper risk "
             "management, nine times out of 10, you will find yourself failing.", ""),
     ]},
    {"id": "payout-story-121k", "angle": "payout_story",
     "title": "His biggest payout ever: $121,000",
     "caption": "Layth's biggest prop payout, and the years it took to get there.",
     "slides": [
         (HK, "His biggest payout ever: *$121,000*.", "The part nobody posts comes next."),
         (Q, "The biggest payout I ever received was $121,000 with an 80-20 profit split.", "On his own trading, before Tradever"),
         (P, "*15 years* of trading. Unprofitable for the first *four*.", "Overnight success takes a while."),
         (Q, "I was unprofitable for four years day trading.", ""),
         (Q, "I'm the kind of person where I just never give up and I never did.", ""),
     ]},
    {"id": "myth-eval-like-live-account", "angle": "myth_buster",
     "title": "Stop treating your prop eval like a live account",
     "caption": "The mindset shift Tradever's CEO teaches for prop evaluations.",
     "slides": [
         (HK, "Treating your eval like a *live account*?", "Layth calls it one of the most common prop firm mistakes."),
         (Q, "What you're trying to do is \u2026 figure out how fast you can make the profit target before you hit the "
             "max loss limit.", "On prop evaluations"),
         (Q, "Treat these accounts like a business and an investment.", ""),
         (P, "How fast can you make *$3,000* before you lose *$2,000* on a *50K* account?",
          "The question he has his students ask."),
     ]},
    {"id": "myth-revenge-trading", "angle": "myth_buster",
     "title": "The revenge-trading spiral that cost him $600,000",
     "caption": "Tradever's CEO on his worst trading mistake, and the rule he follows now.",
     "slides": [
         (HK, "He lost over *$600,000* in about *two weeks*.", "One mistake. Here's which one."),
         (Q, "My worst trading mistake was probably whenever I would go into episodes of revenge trading.", ""),
         (Q, "I was up $150,000 and I didn't take profit and within a minute the market flipped back.", ""),
         (Q, "Once you lose like two or three losses in a row, you got to just stop.",
          "His rule now. There's always another day to trade."),
     ]},
    {"id": "myth-hedging-accounts", "angle": "myth_buster",
     "title": "Hedging two prop accounts is not a strategy",
     "caption": "Why Tradever's CEO has zero patience for hedging across prop accounts.",
     "slides": [
         (HK, "Hedging two prop accounts is *not* a strategy.", "Tradever's CEO explains."),
         (Q, "You're buying on one and selling on another, there is no strategy in that.", ""),
         (Q, "You're literally just throwing it away and you're hoping that one of these accounts end up passing.", ""),
         (Q, "I would definitely use proper risk management and make sure that you're following the rules of your "
             "prop firm.", "What to do instead"),
     ]},
    {"id": "ceo-red-flags", "angle": "myth_buster",
     "title": "How to spot a prop firm red flag",
     "caption": "Three checks Tradever's CEO runs before trusting any prop firm.",
     "slides": [
         (HK, "How to spot a prop firm *red flag*.", "Three checks from Tradever's CEO."),
         (Q, "They like to change the rules as they go and that's something I would watch out for as a red flag.", ""),
         (Q, "Look at the Trustpilot reviews \u2026 see if people are getting paid out.", ""),
         (Q, "Make sure that you know who you're trading with, you wanna know the company, you wanna know the owner.", ""),
     ]},
    {"id": "rule-payout-qualify", "angle": "rule_breakdown",
     "title": "No consistency rule once funded, $100 minimum withdrawal",
     "caption": "Layth breaks down one of his favorite Tradever accounts. Read the full rules before you buy.",
     "slides": [
         (HK, "*No consistency rule* once funded.", "Layth on one of his favorite Tradever accounts."),
         (Q, "It has no consistency rule when funded.", ""),
         (P, "Three days of *$150* profit to qualify for a payout.", "As Layth describes the payout rule."),
         (P, "Minimum withdrawal: *$100*.", "No need to chase one huge day."),
         (Q, "You can withdraw as soon as you hit that buffer and you hit that $100 profit target.", ""),
     ]},
    {"id": "ceo-not-scared-to-lose", "angle": "ceo_quote",
     "title": "What his best trading students have in common",
     "caption": "Tradever's CEO on the one trait he sees in his most successful students.",
     "slides": [
         (HK, "His best students have *one thing* in common.", ""),
         (Q, "They are not scared to lose.", "On what he sees in his students"),
         (Q, "If you're coming in and you're already scared to lose and you got a scarcity mindset \u2026 you start to "
             "go downward in a downward spiral.", ""),
         (Q, "Onto the next, it's okay, no problem. We'll make it back on the next one.", ""),
     ]},
    {"id": "ceo-why-futures", "angle": "ceo_quote",
     "title": "Why Tradever's CEO went all in on futures",
     "caption": "Penny stocks, forex, CFDs, equities... and why Layth ended up trading futures.",
     "slides": [
         (HK, "Why Tradever's CEO went all in on *futures*.", "After penny stocks, forex, CFDs and equities."),
         (Q, "Futures, in my opinion, is a lot better.", ""),
         (Q, "There's no spreads and the commissions are very, very low.", ""),
         (Q, "It's more regulated, which I do like.", ""),
     ]},
    {"id": "ceo-five-to-nine", "angle": "ceo_quote",
     "title": "It's what you do from five to nine that matters",
     "caption": "Tradever's CEO on 9-to-5s, side hustles and learning a skill.",
     "slides": [
         (HK, "Your *nine to five* isn't the problem.", "It's what comes after."),
         (Q, "It's what you do from your five to nine that matters.", ""),
         (Q, "You can make a lot more money by learning a skill set and giving yourself that time.", ""),
         (Q, "There is not a skill set in the world that I think is better than learning how to day trade.", ""),
     ]},
    {"id": "ceo-marathon-not-sprint", "angle": "ceo_quote",
     "title": "Trading is a marathon, not a sprint",
     "caption": "Layth on chasing money vs learning the process.",
     "slides": [
         (HK, "Chasing *big payouts*? Read this first.", ""),
         (Q, "This is a marathon and not a sprint.", ""),
         (Q, "If you focus too much on the money, you tend to forget the process.", ""),
         (Q, "This is a game of probability.", ""),
     ]},
    {"id": "ceo-build-a-stack", "angle": "ceo_quote",
     "title": "Pros don't trade one prop firm, they build a stack",
     "caption": "Why Tradever's CEO trades several firms, and where Tradever fits in.",
     "slides": [
         (HK, "Pros don't trade one prop firm. They build a *stack*.", ""),
         (Q, "I trade on multiple prop firms and I utilize that in my stack.", ""),
         (Q, "You want to be able to have multiple firms that pay out on different days.", ""),
         (Q, "What it adds to the marketplace is another firm that you can trust.", "On Tradever"),
     ]},
]

# Built-in rule breakdowns / myth busters: only facts from the campaign brief (weekly payouts, no consistency
# rule, EOD drawdown), written as features, no numbers.
BUILTIN_DECKS = [
    {"id": "rule-weekly-payouts", "angle": "rule_breakdown",
     "title": "Weekly payouts: why the payout cycle matters",
     "caption": "Rule breakdown: Tradever pays out weekly. Always read your account's full payout rules.",
     "slides": [
         (HK, "Still waiting *weeks* for a payout?", "Read this before you pick a prop firm."),
         (P, "Tradever runs *weekly payouts*.", "A futures prop firm built around a weekly payout cycle."),
         (P, "Plan your week around *payday*.", "Trade your plan, qualify, request. Then go again next week."),
         (P, "Smaller, *regular* withdrawals add up.", "No sitting on profits waiting for a month-end window."),
     ]},
    {"id": "rule-no-consistency-rule", "angle": "rule_breakdown",
     "title": "The consistency rule, explained",
     "caption": "Rule breakdown: what a consistency rule is and how Tradever handles it. Check your account's rules.",
     "slides": [
         (HK, "The rule that quietly *delays payouts*.", "It's called the consistency rule."),
         (P, "A consistency rule caps how much of your profit can come from *one day*.",
          "One big day can push your payout back."),
         (P, "Tradever: *no consistency rule* once funded.", "On select accounts. Check the rules of yours."),
         (P, "Trade your plan, not a *daily quota*.", "Take the good days when the market gives them."),
     ]},
    {"id": "rule-eod-drawdown", "angle": "rule_breakdown",
     "title": "Intraday vs end-of-day drawdown",
     "caption": "Rule breakdown: intraday trailing vs end-of-day (EOD) drawdown, and what Tradever uses.",
     "slides": [
         (HK, "*Intraday* or *end-of-day* drawdown?", "Know which one your account uses."),
         (P, "Intraday trailing drawdown follows your *open profit*, tick by tick.",
          "A winner that pulls back can still tighten your limit."),
         (P, "End-of-day drawdown updates once, at the *close*.", "Swings during the session don't move it."),
         (P, "Tradever uses *EOD drawdown*.", "Always read the full rules for your account."),
     ]},
    {"id": "myth-three-rules-to-check", "angle": "myth_buster",
     "title": "3 rules to check before you buy a prop account",
     "caption": "Most traders skip the rules page. Check these three first.",
     "slides": [
         (HK, "*Three rules* to check before you buy a prop account.", "Most traders skip this page."),
         (P, "How often does it *pay out*?", "Tradever: weekly payouts."),
         (P, "Is there a *consistency rule*?", "Tradever: none once funded, on select accounts."),
         (P, "Is drawdown *intraday* or *end-of-day*?", "Tradever: EOD drawdown."),
     ]},
]

HASHTAGS = {
    "ceo_quote": "#tradever #propfirm #daytrading #futurestrading",
    "payout_story": "#tradever #propfirm #payout #futurestrading",
    "myth_buster": "#tradever #propfirm #tradingtips #futurestrading",
    "rule_breakdown": "#tradever #propfirm #fundedtrader #futurestrading",
}
TAG_FOR_ANGLE = {"ceo_quote": "CEO QUOTE", "payout_story": "PAYOUT STORY", "myth_buster": "MYTH BUSTER",
                 "rule_breakdown": "RULE BREAKDOWN"}


def _caption(spec, campaign) -> str:
    cap = campaign.get("caption") or {}
    mentions = cap.get("required_mentions") or ["@tradeverfunding", "@laythbanks"]
    tags = HASHTAGS.get(spec["angle"], "#tradever #propfirm")
    extra = " ".join(cap.get("required_hashtags") or [])
    ad = (campaign.get("disclosure") or {}).get("caption", "")
    parts = [spec["caption"], tags, extra, ad, " ".join(mentions)]
    return " ".join(p.strip() for p in parts if p and p.strip())


def _slides(spec) -> list[dict]:
    out = []
    for kind, text, sub in spec["slides"]:
        s = {"kind": kind, "text": text}
        if sub:
            s["sub"] = sub
        if kind == "point":
            s["tag"] = TAG_FOR_ANGLE.get(spec["angle"], "")
        if kind == "hook":
            s["tag"] = TAG_FOR_ANGLE.get(spec["angle"], "")
        out.append(s)
    out.append({"kind": "cta", "text": DEFAULT_THEME["cta_text"], "sub": DEFAULT_THEME["cta_sub"],
                "button": DEFAULT_THEME["cta_button"]})
    return out


def banned_list(campaign) -> list[str]:
    return sorted(set(p.lower() for p in (campaign.get("banned_phrases") or [])) | set(ALWAYS_BANNED) | set(PROFANITY))


def verify_deck(deck, campaign, transcript_text=None, from_transcript=False) -> list[str]:
    """Problems with a deck (empty = clean): slide count, CTA last, caption tags, banned words, quotes/numbers."""
    probs = []
    slides = deck["slides"]
    if not 5 <= len(slides) <= 7:
        probs.append(f"{len(slides)} slides")
    if slides[-1]["kind"] != "cta" or any(s["kind"] == "cta" for s in slides[:-1]):
        probs.append("CTA must be the last slide only")
    mentions = (campaign.get("caption") or {}).get("required_mentions") or []
    if mentions and not deck["caption"].rstrip().endswith(" ".join(mentions)):
        probs.append("caption must end with " + " ".join(mentions))
    if len(deck["title"]) > 90:
        probs.append("title too long")
    blob = " ".join([deck["title"], deck["caption"]] + [plain(s.get("text", "")) + " " + plain(s.get("sub", ""))
                                                         for s in slides]).lower()
    for b in banned_list(campaign):
        if b in blob:
            probs.append(f"banned phrase: {b}")
    if from_transcript and transcript_text is not None:
        tn = norm(clean_transcript(transcript_text))
        said = numbers(clean_transcript(transcript_text), words=True)
        for s in slides:
            if s["kind"] == "quote" and not quote_in(s["text"], tn):
                probs.append("quote not in transcript: " + s["text"][:60])
            if s["kind"] != "cta":
                for n in numbers(plain(s["text"]) + " " + plain(s.get("sub", ""))):
                    if n not in said:
                        probs.append(f"number {n} not said: " + s["text"][:50])
    return probs


def decks_from_transcript(transcript_text: str, campaign: dict) -> list[dict]:
    """All decks whose quotes/numbers check out against the transcript, plus the built-in rule decks.
    Order rotates hook angles (ceo quote, myth buster, rule breakdown, payout story...)."""
    decks = []
    for spec, from_tx in [(s, True) for s in TRANSCRIPT_DECKS] + [(s, False) for s in BUILTIN_DECKS]:
        deck = {"id": spec["id"], "angle": spec["angle"], "title": spec["title"],
                "caption": _caption(spec, campaign), "slides": _slides(spec)}
        if from_tx and not (transcript_text or "").strip():
            continue
        if verify_deck(deck, campaign, transcript_text, from_transcript=from_tx):
            continue
        decks.append(deck)
    # rotate angles so --limit N gives a mix
    buckets: dict[str, list] = {}
    for d in decks:
        buckets.setdefault(d["angle"], []).append(d)
    order = ["ceo_quote", "myth_buster", "rule_breakdown", "payout_story"]
    order += [a for a in buckets if a not in order]
    out = []
    while any(buckets.values()):
        for a in order:
            if buckets.get(a):
                out.append(buckets[a].pop(0))
    return out


# ----------------------------------------------------------------------------------------------- CLI
def _resolve(p: str, base: Path) -> Path:
    q = Path(p)
    if q.is_file() or q.is_absolute():
        return q
    for b in (base, HERE):
        if (b / p).exists():
            return b / p
    return q


def build(campaign_path, transcript_path, out_dir, limit=None, only=None) -> list[dict]:
    cpath = _resolve(campaign_path, Path.cwd())
    campaign = json.loads(Path(cpath).read_text(encoding="utf-8"))
    logo_rel = (campaign.get("on_screen") or {}).get("logo") or ""
    logo = _resolve(logo_rel, Path(cpath).parent) if logo_rel else None
    if not logo or not Path(logo).is_file():
        logo = Path(cpath).parent / logo_rel
    if not Path(logo).is_file():
        raise SystemExit(f"logo not found: {logo_rel}")
    text = Path(transcript_path).read_text(encoding="utf-8") if transcript_path else ""
    decks = decks_from_transcript(text, campaign)
    if only:
        decks = [d for d in decks if d["id"] in only]
    if limit:
        decks = decks[:limit]
    out = Path(out_dir)
    for d in decks:
        folder = out / d["id"]
        paths = render(d["slides"], folder, logo)
        meta = dict(d, images=[p.name for p in paths], size=[W, H])
        (folder / "deck.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"{d['id']:32s} {len(paths)} slides  {d['angle']}")
    return decks


def main(argv=None):
    ap = argparse.ArgumentParser(description="TikTok photo-carousel generator")
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("build", help="build decks and render their slides")
    b.add_argument("--campaign", required=True)
    b.add_argument("--transcript", default="")
    b.add_argument("--out", required=True)
    b.add_argument("--limit", type=int, default=None)
    b.add_argument("--only", nargs="*", default=None, help="deck ids to render")
    ls = sub.add_parser("list", help="list the decks without rendering")
    ls.add_argument("--campaign", required=True)
    ls.add_argument("--transcript", default="")
    a = ap.parse_args(argv)
    if a.cmd == "build":
        decks = build(a.campaign, a.transcript, a.out, a.limit, a.only)
        print(f"{len(decks)} decks -> {a.out}")
    else:
        campaign = json.loads(_resolve(a.campaign, Path.cwd()).read_text(encoding="utf-8"))
        text = Path(a.transcript).read_text(encoding="utf-8") if a.transcript else ""
        for d in decks_from_transcript(text, campaign):
            print(f"{d['id']:32s} {len(d['slides'])} {d['angle']:15s} {d['title']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
