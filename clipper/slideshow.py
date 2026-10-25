"""
TikTok photo-carousel (slideshow) generator.

Builds 5-7 slide decks (1080x1920, 9:16) for a campaign from a podcast transcript plus a few
built-in rule-breakdown / myth-buster decks, and renders them as premium dark slides.

  python slideshow.py build --campaign campaigns/tradever.json --transcript podcast.txt --out out/ [--limit N] [--mine N]

API
  render(slides, out_dir, logo_path, theme=None) -> [Path]      one PNG per slide
  render_slide(slide, index, total, logo_path, theme=None) -> (Image, boxes)
  decks_from_transcript(transcript_text, campaign, mine=40) -> [deck]   hand-written decks first, then mined ones
  mine_decks(transcript_text, campaign, existing_ids=(), limit=40) -> [deck]   automatic miner (any transcript)
                                                                  deck = {id, angle, title, caption, slides}
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
    max_w = max_w - 6                                   # ink can overhang the advance width by a pixel or two
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
    "mistake": "#tradever #propfirm #tradingmistakes #futurestrading",
    "advice": "#tradever #propfirm #tradingtips #daytrading",
}
TAG_FOR_ANGLE = {"ceo_quote": "CEO QUOTE", "payout_story": "PAYOUT STORY", "myth_buster": "MYTH BUSTER",
                 "rule_breakdown": "RULE BREAKDOWN",
                 "mistake": "MISTAKE", "advice": "ADVICE"}


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


def decks_from_transcript(transcript_text: str, campaign: dict, mine: int = 40, existing_ids=()) -> list[dict]:
    """All decks whose quotes/numbers check out against the transcript, plus the built-in rule decks.
    Order rotates hook angles (ceo quote, myth buster, rule breakdown, payout story...). The hand-written decks come
    first, then up to `mine` automatically mined ones (mine_decks; 0 = none). `existing_ids` are skipped."""
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
    skip = set(existing_ids or ())
    out = [d for d in out if d["id"] not in skip]
    if mine and (transcript_text or "").strip():
        have = {d["id"] for d in out}
        out += [d for d in mine_decks(transcript_text, campaign, existing_ids=skip, limit=mine) if d["id"] not in have]
    return out


# ----------------------------------------------------------------------------------------------- miner
# Automatic deck miner: sentences -> scored spans -> decks. No network, no AI; deterministic.
# Every text taken from the transcript is a word-for-word substring (after the campaign spelling fixes); the miner
# re-checks that itself, then verify_deck() re-checks quotes, numbers, banned phrases, structure.
_FILLER_PHRASES = ["i mean", "you know", "at the end of the day"]
_FILLER = {"100%", "so", "and", "but", "well", "now", "okay", "ok", "yeah", "yes", "oh", "ooh", "look", "honestly", "basically",
           "actually", "obviously", "essentially", "absolutely", "like", "right", "um", "uh", "hey", "man", "then",
           "also", "personally", "definitely", "literally"}
_BAD_START = {"about", "before", "probably", "me", "understanding", "no", "yes", "meaning", "another", "either", "both",
              "such", "and", "but", "or", "because", "which", "who", "whom", "that", "it", "they", "them", "those",
              "these", "he", "she", "so", "then", "also", "plus", "however", "though", "although", "to", "of",
              "whatever", "like", "than"}
_BAD_END = {"and", "but", "or", "the", "a", "an", "to", "of", "in", "with", "that", "is", "are", "was", "were", "for",
            "on", "at", "as", "if", "so", "because", "my", "your", "our", "their", "i", "you", "we", "it", "this",
            "by", "from", "be", "been", "have", "has", "had", "do", "does", "not", "very", "more", "than", "into",
            "about", "just", "really", "gonna", "wanna", "can", "will", "would", "could", "should", "what", "who"}
_CONJ = {"and", "but", "because", "so", "which", "where", "when", "while", "then", "that"}
_ANSWER_OPEN = re.compile(r"^(ooh|oh yeah|oh|absolutely|yeah|definitely|okay|exactly|that's a (great|good|really)|"
                          r"hey, look)\b", re.I)
_HOST_HINT = re.compile(r"\b(tell (me|us)|you mentioned|like you (said)|introduce yourself|"
                        r"your (company|job|favorite|biggest|worst|firm)|do you|did you|are you|were you|have you)\b", re.I)
# anything that reads like a promise / income claim / other brand / rant is never mined
_NO_MINE = re.compile(
    r"promise|guarant|sky'?s the limit|will continue to receive|replace your job|thousands of dollars a day|"
    r"can ensure|\bROI\b|million|crypto|\bNFTs?\b|penny|sykes|\bGNC\b|affiliate|scams?\b|shady|"
    r"freaking|\bhell\b|stupid|dumb|\bsucks?\b|\bcrap\b|\bass\b|taking that|\bfake|screenshots|"
    r"you will (then )?(make|earn|get|receive|be able)|you('ll| will) (end up )?find|definitely earn|"
    r"money (fast|quick)|get rich|as fast as possible|outrageous|obsessed|life\W*changing|"
    r"more better|put pro firms|out of business|haven't looked back|never give up and I never did|"
    r"\bmentor\b|\bcourses?\b|youtube|\bAI\b|rat race|programmed|nothing against|other firms|"
    r"i'm sure|i'm gonna say|i don't (really )?have|to be honest|i told you|agree with me|i found it|"
    r"you see it|one thing (i|that)|this one's|can agree|wouldn't|somewhere around|"
    r"my name is|way to living|made me\b|made a lot|profited about|gonna hurt|here\.$|i would definitely|"
    r"let me|for instance|question|decent living|\$[\d,. ]+\w*[^.?!]*\b(a|per|each) (day|week|month|year)\b|"
    r"\b(a|per|each) (day|week|month)\b[^.?!]*\$|\bgrand amount|^100%", re.I)
_MONEY = re.compile(r"\$|\d|\bpayouts?\b|\bprofit|\bearn|\bmade\b|\bpaid\b|\bwithdraw|\blost\b|\bwin\b|\bwins\b", re.I)
_RULES = re.compile(r"\brules?\b|consistency|drawdown|profit target|minimum|qualify|activation|buffer|evaluation|"
                    r"\bevals?\b|max loss|risk management|\b\d+ ?%|accounts? (are|is)|live (account|program)", re.I)
_FIRST = re.compile(r"\b(i|i've|i'm|i'd|my|me)\b", re.I)
_EMOTION = ["scared", "fear", "greedy", "victim", "disciplin", "psycholog", "gambl", "spiral", "lose", "lost",
            "losing", "hurt", "trust", "failing", "mistake", "problem", "hard", "easy", "best", "worst", "biggest",
            "only", "every", "nothing", "furthest", "truth", "reality", "patient", "overthink", "greed", "revenge",
            "blow", "wrong", "stop", "never", "always", "mindset", "emotional", "business", "risk", "probability",
            "marathon", "process", "variance", "diversify", "edge"]
_CONTRAST = re.compile(r"\b(but|not|never|instead|rather|versus|than|actually|no|nothing|without|don't|do not|"
                       r"isn't|aren't|wasn't|doesn't|won't|can't)\b", re.I)
_ADVICE = re.compile(r"\b(make sure|don't|do not|never|stop|always|treat|avoid|watch out|focus|remember|aim|"
                     r"you want to|you need|you have to|you should|you gotta|space out|spacing out|pay attention)\b", re.I)
_MISTAKE = re.compile(r"mistake|revenge|greedy|losing|\blost\b|\blose\b|spiral|blowing|overthink|scared|gambl|hedg|"
                      r"downfall|wrong|victim", re.I)
_MYTH = re.compile(r"\bmyth|actually|truth|furthest|not easy|harder|glorified|red flag|reality|misconception|"
                   r"\bnot\b.*\bbut\b|smart|intelligen|\bIQ\b", re.I)
_PAYOUT = re.compile(r"payout|paid out|get paid|withdraw|profit split|profited|funded", re.I)
_WEAK = re.compile(r"\b(kind of|sort of|you know|stuff|things?|whatever|somewhere around|probably|maybe|i guess|"
                   r"um|uh|a lot of times|basically)\b", re.I)

TOPICS = [  # (label, regex) most specific first
    ("revenge trading", r"revenge"), ("hedging", r"hedg"), ("the consistency rule", r"consistency"),
    ("discipline", r"disciplin"), ("risk management", r"risk management"), ("gambling", r"gambl|full port"),
    ("leverage", r"leverage"), ("your mindset", r"mindset|psycholog|scared to lose|emotional|\bEQ\b|perceived value"),
    ("prop evals", r"evaluation|\bevals?\b|profit target|max loss"), ("variance", r"variance"),
    ("live accounts", r"live account|live program|real funds|real money"), ("payouts", r"payout|paid out|withdraw"),
    ("your stack", r"\bstack\b"), ("trusting a firm", r"trustpilot|red flag|reviews|moving the goalpost|change the rules"),
    ("futures", r"futures"), ("beginners", r"beginner|newbie"), ("nine-to-fives", r"nine to five|five to nine"),
    ("losing streaks", r"losses in a row|call it a day"), ("the process", r"process|marathon|probability"),
    ("prop firms", r"prop firm"), ("day trading", r"day trad|trading"),
]
HOOK_SUBS = {
    "ceo_quote": ["Tradever's CEO, in his own words.", "Layth, Tradever's CEO, on camera.", "Straight from Tradever's CEO."],
    "myth_buster": ["A prop firm myth, busted by Tradever's CEO.", "Tradever's CEO sets the record straight."],
    "rule_breakdown": ["Prop firm rules, explained by Tradever's CEO.", "Read your account's full rules first."],
    "payout_story": ["Layth on payouts. His own history, not a promise.", "From Layth's own trading history."],
    "mistake": ["A mistake Tradever's CEO says to avoid.", "Layth on what goes wrong."],
    "advice": ["Advice from Tradever's CEO.", "What Layth tells his students."],
}
TOPIC_HOOKS = {
    "ceo_quote": ["Tradever's CEO on *{t}*.", "What Layth says about *{t}*."],
    "myth_buster": ["Think you understand *{t}*?", "The truth about *{t}*."],
    "rule_breakdown": ["Rule breakdown: *{t}*.", "*{t}*: know it before you buy."],
    "payout_story": ["Payouts, straight from the CEO's *own story*."],
    "mistake": ["A *{t}* mistake to avoid.", "Where traders slip on *{t}*."],
    "advice": ["Advice on *{t}* from Tradever's CEO.", "Do this about *{t}*."],
}
CAPTION_BITS = {
    "ceo_quote": ["Tradever's CEO Layth in his own words.", "Layth, Tradever's CEO, on what he has learned trading."],
    "myth_buster": ["A common prop firm and trading myth, answered by Tradever's CEO.",
                    "Tradever's CEO busts a trading myth."],
    "rule_breakdown": ["Rule breakdown from Tradever's CEO. Read the full rules of your account before you buy.",
                       "Prop firm rules explained. Always check your account's own rules."],
    "payout_story": ["Layth on payouts, from his own trading history. Not a promise of results.",
                     "A payout story from Tradever's CEO. His own history, not a promise."],
    "mistake": ["A trading mistake Tradever's CEO says to avoid.", "Layth on a mistake that costs traders."],
    "advice": ["Advice from Tradever's CEO for prop firm traders.", "What Layth tells his students."],
}
POINT_LABELS = {
    "ceo_quote": ["Layth, Tradever's CEO", "In his words"],
    "myth_buster": ["Myth busted", "The reality"],
    "rule_breakdown": ["Know the rule", "Check your account's rules"],
    "payout_story": ["Layth's own history", "His own trading, not a promise"],
    "mistake": ["Avoid this", "What goes wrong"],
    "advice": ["His advice", "Do this instead"],
}
HEDGE_OWN = "On his own trading. Not a promise of results."
HEDGE_RULES = "As Layth describes it. Check the rules of your own account."
ANGLE_ORDER = ["ceo_quote", "myth_buster", "rule_breakdown", "payout_story", "mistake", "advice"]
_ANGLE_SLUG = {"ceo_quote": "ceo", "myth_buster": "myth", "rule_breakdown": "rule", "payout_story": "payout",
               "mistake": "mistake", "advice": "advice"}
QUOTE_MAX, POINT_MAX, HOOK_MAX = 215, 72, 118
_SEG = re.compile(r"^\s*(?:\[\s*([\d.:]+)\]\s*)?(.*)$")
_LABELLED = re.compile(r"^([A-Za-z][A-Za-z .'-]{0,20}?)\s*:\s+(.+)$")
_HOST_LABELS = {"host", "interviewer", "interviewer 1", "q", "question", "moderator", "interviewer 2"}
_CEO_LABELS = {"layth", "ceo", "guest", "layth banks", "answer", "a"}


def _h(*parts) -> int:
    return int(hashlib.sha1("|".join(map(str, parts)).encode("utf-8")).hexdigest()[:8], 16)


def _sentences(text: str) -> list[dict]:
    """Sentences of the cleaned transcript with their timestamp; host lines/questions are flagged, not dropped."""
    out = []
    for li, raw in enumerate((text or "").splitlines()):
        m = _SEG.match(raw)
        ts = None
        try:
            ts = float((m.group(1) or "").split(":")[-1]) if m and m.group(1) else None
        except ValueError:
            pass
        body = clean_transcript(raw)
        if not body:
            continue
        host_line = False
        lab = _LABELLED.match(body)
        if lab and lab.group(1).strip().lower() in _HOST_LABELS | _CEO_LABELS:
            host_line = lab.group(1).strip().lower() in _HOST_LABELS
            body = lab.group(2)
        parts = [p.strip() for p in re.split(r"(?<=[.!?])\s+", body) if p.strip()]
        for k, p in enumerate(parts):
            host = host_line or p.endswith("?") or bool(_HOST_HINT.search(p))
            if k == 0 and len(parts) > 1 and not p.endswith("?") and _ANSWER_OPEN.match(parts[1]):
                host = True                                  # the host's tail fragment right before "Ooh, ..." / "Absolutely"
            out.append({"i": len(out), "ts": ts, "line": li, "k": k, "text": p, "host": host})
    return out


_STOP = set("a an the and or but if so of to in on at for with from by as is are was were be been it its this that these "
            "those you he she we they me my your our their them his her does did have has had not just very really can "
            "could would should will than then there here what which who whom when where why how about into over up out "
            "down all any some more most too also only own same such".split())


def _words_info(s: str):
    return [w for w in s.split()]


def _wclean(w: str) -> str:
    return re.sub(r"^[^\w$]+|[^\w%]+$", "", w).lower()


def _first_index(words: list[str]) -> int:
    """Skip leading filler ("So", "Yeah,", "I mean", "I think") so the span starts on content."""
    i = 0
    while i < len(words):
        low = " ".join(_wclean(w) for w in words[i:i + 4])
        hit = next((p for p in _FILLER_PHRASES if low.startswith(p)), None)
        if hit:
            i += len(hit.split())
            continue
        if _wclean(words[i]) in _FILLER:
            i += 1
            continue
        break
    return i


_MEANING = re.compile(r"\b(not|no|never|but|if|unless|only|without|however|nobody|nothing|except)\b|n't", re.I)
_SUBORD = {"if", "when", "because", "while", "although", "since", "as", "whenever", "unless", "after", "before"}


def _spans(sentence: str) -> list[str]:
    """The sentence as a quote: whole (minus leading filler like "So" / "Yeah,"), or - when it is too long - its
    first clause(s) ending in an ellipsis. Dropped words may never carry a negation, condition, contrast or number."""
    words = _words_info(sentence)
    i0 = _first_index(words)
    seg = words[i0:]
    if len(seg) < 5 or _wclean(seg[0]) in _BAD_START or _wclean(seg[-1]) in _BAD_END:
        return []
    txt = " ".join(seg).strip()
    if len(txt) <= QUOTE_MAX and re.search(r"[.!]$", txt):
        return [txt[0].upper() + txt[1:]]
    out = []
    for j in range(8, len(seg)):
        if not (re.search(r"[,;]$", seg[j - 1]) or _wclean(seg[j]) in ("and", "so", "which", "because")):
            continue
        part = " ".join(seg[:j]).rstrip(",;:")
        dropped = " ".join(seg[j:])
        if (len(part) > QUOTE_MAX or _wclean(seg[j - 1]) in _BAD_END or _wclean(seg[0]) in _SUBORD
                or _MEANING.search(dropped) or re.search(r"\d", dropped) or _SUBORD & {_wclean(w) for w in seg[:j][-3:]}):
            continue
        out.append(part[0].upper() + part[1:] + "\u2026")
    return out[-1:]


def _span_score(t: str) -> float:
    low = t.lower()
    nw = len(t.split())
    sc = 0.0
    nums = re.findall(r"\$?\d[\d,.]*[kK%]?", t)
    if nums:
        sc += 1.5 + (1.0 if "$" in t else 0.0)
    sc += min(3.0, 1.5 * len(_CONTRAST.findall(t)))
    if re.search(r"\byou(r|'re|'ll)?\b", low):
        sc += 1.0
    if _ADVICE.search(t):
        sc += 2.0
    hits = [e for e in _EMOTION if e in low]
    sc += min(3.0, 1.0 * len(hits))
    if _RULES.search(t) or _PAYOUT.search(t):
        sc += 1.0
    if _MISTAKE.search(t):
        sc += 1.0
    sc += 2.0 if 6 <= nw <= 15 else 1.0 if 16 <= nw <= 22 else -1.0 if nw > 26 else 0.0
    if len(t) <= 90:
        sc += 1.0
    sc -= 1.0 * len(_WEAK.findall(t))
    if re.search(r"\b(this|that|those|these|it)\b", low) and not re.search(r"\b(this is|that's|it's|it is)\b", low):
        sc -= 0.5
    if re.search(r"[.!]$", t):
        sc += 0.5
    return sc


def _angle_of(t: str) -> str:
    first = bool(_FIRST.search(t))
    you = bool(re.search(r"\byou('re|'ll|r)?\b", t, re.I))
    contrast = len(_CONTRAST.findall(t))
    scores = {
        "payout_story": (2.0 * len(_PAYOUT.findall(t)) + 1.0) if first and _PAYOUT.search(t) else 0.0,
        "rule_breakdown": 1.5 * len(_RULES.findall(t)) + (1.0 if _PAYOUT.search(t) else 0.0),
        "myth_buster": 1.5 * len(_MYTH.findall(t)) + (1.0 * contrast if not first else 0.5 * contrast)
                       + (1.0 if re.search(r"\b(trading|traders?|prop|accounts?)\b", t, re.I) else 0.0),
        "mistake": 1.5 * len(_MISTAKE.findall(t)) + (1.0 if re.search(r"\bstop\b|\bloss(es)?\b", t, re.I) else 0.0),
        "advice": 0.0 if first else (2.0 * len(_ADVICE.findall(t)) + (1.5 if you else 0.0)
                                     + (1.0 if re.search(r"\bif you\b", t, re.I) else 0.0)),
        "ceo_quote": 1.2 + (0.8 if first else 0.0),
    }
    return max(ANGLE_ORDER, key=lambda a: (scores[a], -ANGLE_ORDER.index(a)))


def _content(t: str) -> set:
    return {w[:5] for w in re.findall(r"[a-z]{4,}", t.lower()) if w not in _STOP}


def _shingles(texts, n=3) -> set:
    toks = norm(" ".join(texts)).split()
    return {" ".join(toks[i:i + n]) for i in range(max(0, len(toks) - n + 1))}


def _jaccard(a: set, b: set) -> float:
    return len(a & b) / len(a | b) if a and b else 0.0


def _topic(texts, angle) -> str:
    blob = " ".join(texts)
    best, bs = "", 0
    for label, rx in TOPICS:
        c = len(re.findall(rx, blob, re.I)) * (1 if label in _GENERIC else 3)
        if c > bs:
            best, bs = label, c
    return best


_GENERIC = {"prop firms", "day trading"}


def _topics(q: str) -> set:
    return {label for label, rx in TOPICS if label not in _GENERIC and re.search(rx, q, re.I)}


def _star(text: str) -> str:
    """Paint the punchiest 1-3 words green (numbers/money are painted automatically when there are no stars)."""
    if re.search(r"\d", text):
        return text
    words = text.split()
    for i, w in enumerate(words):
        wc = _wclean(w)
        if any(wc.startswith(e) for e in ("disciplin", "scared", "revenge", "gambl", "mistake", "greed", "fear",
                                         "spiral", "psycholog", "trust", "never", "stop", "probab", "marathon",
                                         "hedg", "variance", "emotional", "consistency", "risk")):
            j = i + 1
            if wc in ("never", "stop") and i + 1 < len(words):
                j = min(len(words), i + 3)
            elif i + 1 < len(words) and _wclean(words[i + 1]) in ("management", "rule", "trading", "intelligence", "to"):
                j = i + 2 + (1 if _wclean(words[i + 1]) == "to" and i + 2 < len(words) else 0)
            seg = " ".join(words[i:j])
            tail = re.search(r"[.,!?:;]+$", seg)
            core = seg[:tail.start()] if tail else seg
            words[i:j] = [("*" + core + "*" + (tail.group(0) if tail else ""))]
            return " ".join(words)
    return text


_VERBISH = re.compile(r"\b(is|are|was|were|am|be|been|have|has|had|do|does|did|can|could|will|would|should|get|got|make|"
                      r"makes|made|take|want|wanna|need|know|go|goes|see|think|feel|say|lose|lost|win|pass|pay|paid|"
                      r"trade|trades|work|works|allows?|means?|matters?|comes?|learn|understand|use|treat|stop|try|"
                      r"aim|keep|start|become|has|hit|follow|add|launch|started|built|build|move|spend)\b|"
                      r"'(s|re|m|ve|ll|d)\b|n't\b", re.I)
_DEPENDENT = re.compile(r"^\W*(for example|so for example)|\bhonestly\b|\bleverage\b|\b(i mentioned|i said|like i|as i|earlier|before,|this one|that one|you guys|so that way|"
                        r"that way|the thing is|this has|these people|this is based)\b|^\W*(this|that|it|they|these|those)\b",
                        re.I)


_JUNK = re.compile(r"\b(this|these|those)\b(?! is\b)|as well|clocking|strive|forefront|age of information|for all i care|"
                   r"people, when|myself\.$|that's cool|with me\b", re.I)


def _self_contained(q: str) -> bool:
    body = q.rstrip("\u2026")
    return (6 <= len(body.split()) <= 36 and not _DEPENDENT.search(body) and not _JUNK.search(body)
            and len(_content(body)) >= 4)


def _mk_cand(i, ts, q, cov, whole=True, text_len=0):
    short = q if len(q) <= HOOK_MAX and len(q.split()) >= 4 and q[-1] in ".!" else ""
    qs = _span_score(q) + (1.5 if whole else 0.0)
    return {"i": i, "ts": ts, "q": q, "qs": qs, "p": short, "ps": _span_score(short) if short else -9.0,
            "angle": _angle_of(q), "cov": frozenset(cov)}


_SUBJ = {"i", "i've", "i'm", "i'd", "you", "you're", "you've", "we", "we're", "there", "there's", "it's", "the", "a",
         "my", "your", "our", "no", "nobody", "every", "trading", "prop", "most", "many", "people", "that's"}
_STARTER = re.compile(r"^(if|when|whenever|while|because|although|since|unless|after|before)\b", re.I)


def _clauses(sentence: str) -> list[str]:
    """Independent clauses of a compound sentence, each a verbatim substring that stands alone."""
    words = _words_info(sentence)
    i0 = _first_index(words)
    seg = words[i0:]
    if len(seg) < 12 or _STARTER.match(seg[0]) or _wclean(seg[0]) in _BAD_START:
        return []
    cuts = [j for j in range(6, len(seg) - 5) if _wclean(seg[j]) in ("and", "but", "so")]
    out = []
    for j in cuts[:2]:
        conj = _wclean(seg[j])
        pre, post = seg[:j], seg[j + 1:]
        if conj != "but" and not _MEANING.search(" ".join(pre)) and not re.search(r"\d", " ".join(post)):
            out.append(" ".join(pre).rstrip(",;:"))
        if post and _wclean(post[0]) in _SUBJ and not _MEANING.search(" ".join(pre)) or conj == "but" and post and _wclean(post[0]) in _SUBJ:
            out.append(" ".join(post))
    res = []
    for t in out:
        t = t.rstrip(",;:").rstrip(".!") + "."
        w = t.split()
        if len(w) >= 5 and _wclean(w[-1].rstrip(".")) not in _BAD_END and _wclean(w[0]) not in _BAD_START:
            res.append(t[0].upper() + t[1:])
    return res


def _mine_candidates(sents, campaign):
    """Quote candidates: one per sentence (whole, or its first clauses) plus pairs of adjacent sentences.
    Rejects the host, risky/unverifiable text, banned phrases, profanity."""
    blocked_words = banned_list(campaign)
    bad = lambda x: bool(_NO_MINE.search(x)) or any(b in x.lower() for b in blocked_words)
    singles = {}
    for s in sents:
        if s["host"]:
            continue
        sp = [x for x in _spans(s["text"]) if not bad(x)]
        if not sp:
            continue
        sp = [x for x in sp if _self_contained(x)]
        if not sp:
            continue
        q = max(sp, key=lambda x: (len(x) <= QUOTE_MAX, _span_score(x), -len(x)))
        singles[s["i"]] = (s, q)
    cands = {}
    for i, (s, q) in singles.items():
        cands[i] = _mk_cand(i, s["ts"], q, {i}, whole=not q.endswith("\u2026"))
    # independent clauses of long compound sentences ("A, and B" -> A / B; "A, but B" -> B only)
    for s in sents:
        if s["host"] or s["i"] in singles and len(singles[s["i"]][1]) <= 110:
            continue
        for n, piece in enumerate(_clauses(s["text"])):
            if bad(piece) or not _self_contained(piece):
                continue
            c = _mk_cand(s["i"], s["ts"], piece, {s["i"]}, whole=False)
            c["qs"] = _span_score(piece) + 0.5
            cands[s["i"] + 0.1 * (n + 1)] = c
    for i, (s, q) in singles.items():
        n = singles.get(i + 1)
        if not n or n[0]["line"] != s["line"] or q.endswith("\u2026") or n[1].endswith("\u2026"):
            continue
        pair = q + " " + n[1]
        if len(pair) <= QUOTE_MAX + 20 and _span_score(q) >= 2.0 and _span_score(n[1]) >= 2.0:
            c = _mk_cand(i, s["ts"], pair, {i, i + 1})
            c["qs"] = (cands[i]["qs"] + cands[i + 1]["qs"]) / 2 + 1.0
            c["p"], c["ps"] = "", -9.0
            cands[i + 0.5] = c
    return cands


_OWN_RESULT = re.compile(r"\$\s?\d|\bpayouts?\b|\bprofit(ed|able)?\b|\bpaid\b|\bmade\b|\bearn|(lost|losing|making|make|made) (a lot of |more |even more )?money", re.I)
_RULE_MONEY = re.compile(r"\$\s?\d|\d\s?%|\bpayout|\bwithdraw|\bprofit target|\bconsistency|\bsplit\b", re.I)


def _hedge(txt: str) -> str:
    """Income / results text stays attributed to his own history; rule amounts point to the account's own rules."""
    if re.search(r"\bfor the money\b", txt, re.I):
        return ""
    if _FIRST.search(txt) and _OWN_RESULT.search(txt):
        return HEDGE_OWN
    if _RULE_MONEY.search(txt) and re.search(r"\d", txt):
        return HEDGE_RULES
    return ""


def _window_angle(cs) -> str:
    votes = {a: 0.0 for a in ANGLE_ORDER}
    for c in cs:
        votes[_angle_of(c["q"])] += max(1.0, c["qs"])
    best = max(ANGLE_ORDER, key=lambda a: (votes[a], -ANGLE_ORDER.index(a)))
    return best


_MEANING_STARTS = re.compile(r"^(if|when|whenever)\b.*,\s*(it'?s|that'?s) (cool|great|fine)", re.I)


def _deck_for(chosen, campaign, angle=None, avoid=frozenset()):
    """chosen: candidates of one passage, any order. Hook = punchiest short line (or a framed topic hook),
    body = 3-5 of the remaining lines in the order they were said."""
    by_score = sorted(chosen, key=lambda c: (-c["qs"], c["i"]))
    angle = angle or _window_angle(by_score[:4])
    claims = [c for c in by_score if norm(c["q"]) not in avoid and c["p"] and c["ps"] >= 4.5
              and len(c["p"]) <= HOOK_MAX and not _MEANING_STARTS.match(c["p"])]
    if not claims:                                   # no punchy line: settle for a plain short one
        claims = [c for c in by_score if norm(c["q"]) not in avoid and c["p"] and c["ps"] >= 2.5
                  and len(c["p"]) <= HOOK_MAX]
    claims.sort(key=lambda c: (c is not chosen[0], -c["ps"]))
    anchor = claims[0] if claims else chosen[0]
    if claims:
        angle = anchor["angle"]
    h = _h(norm(anchor["q"]))
    topic = _topic([c["q"] for c in by_score], angle)
    if topic and sum(1 for c in by_score[:5] if topic in c["topics"] or topic in _GENERIC) < 3:
        topic = ""
    hook = {"kind": "hook", "tag": TAG_FOR_ANGLE.get(angle, "")}
    hook_sub = HOOK_SUBS[angle][h % len(HOOK_SUBS[angle])]
    rest = [c for c in by_score if c is not anchor]
    if claims:
        hook["text"] = _star(anchor["p"])
        hook["verbatim"] = True
        title = anchor["p"].rstrip(".")
        hook_sub = _hedge(anchor["p"]) or hook_sub
        body_src = rest
    else:
        tpl = TOPIC_HOOKS[angle][h % len(TOPIC_HOOKS[angle])]
        if "{t}" in tpl and not topic:
            tpl = "Tradever's CEO, *in his own words*."
        hook["text"] = tpl.replace("{t}", topic)
        title = plain(hook["text"]).rstrip(".")
        body_src = by_score
    hook["sub"] = hook_sub
    n_body = 3 + (1 if h % 3 == 1 else 0) + (1 if h % 11 == 0 else 0)
    body = sorted(body_src[:n_body], key=lambda c: c["i"])
    if len(body) < 3:
        return None, set()
    patterns = ["QQQQQ", "QPQPQ", "PQQPQ", "QQPQP", "PQPQQ", "QPPQQ"]
    pat = patterns[(h >> 4) % len(patterns)]
    labels = POINT_LABELS[angle]
    slides = [hook]
    for n, c in enumerate(body):
        if pat[n % len(pat)] == "P" and c["p"] and len(c["p"]) <= POINT_MAX and c["ps"] >= 2.5:
            sl = {"kind": "point", "text": _star(c["p"]), "verbatim": True, "tag": TAG_FOR_ANGLE.get(angle, ""),
                  "sub": labels[(h + n) % len(labels)]}
            txt = c["p"]
        else:
            sl = {"kind": "quote", "text": c["q"]}
            txt = c["q"]
            if n == 0 and topic:
                sl["sub"] = "On " + topic
        sl_h = _hedge(txt)
        if sl_h:
            sl["sub"] = sl_h
        slides.append(sl)
    slides.append({"kind": "cta", "text": DEFAULT_THEME["cta_text"], "sub": DEFAULT_THEME["cta_sub"],
                   "button": DEFAULT_THEME["cta_button"]})
    cap_bits = CAPTION_BITS[angle]
    spec = {"angle": angle, "caption": cap_bits[h % len(cap_bits)]}
    title = (title[0].upper() + title[1:]) if title else "Tradever's CEO"
    if len(title) > 90:
        title = title[:86].rsplit(" ", 1)[0].rstrip(",;: ") + "..."
    deck = {"id": f"mined-{_ANGLE_SLUG[angle]}-{hashlib.sha1(norm(anchor['q']).encode()).hexdigest()[:8]}",
            "angle": angle, "title": title, "caption": _caption(spec, campaign), "slides": slides}
    used = set(anchor["cov"]) if claims else set()
    for c in body:
        used |= set(c["cov"])
    return deck, used


def _verbatim_ok(deck, tn: str) -> bool:
    for s in deck["slides"]:
        if s.get("verbatim") or s["kind"] == "quote":
            if not quote_in(s["text"], tn):
                return False
    return True


def mine_decks(transcript_text, campaign, existing_ids=(), limit=40) -> list[dict]:
    """Automatic deck miner. Scores transcript sentences for hookiness, finds coherent passages (a run of strong,
    self-contained lines said close together on one topic), groups them by angle and builds decks: hook, 3-5
    verified quote/point slides in spoken order, CTA. Deterministic; ids derive from the hook quote's hash so
    they are stable between runs. Returns [] for an empty/short transcript. `existing_ids` are skipped after
    mining, so the other decks never change."""
    if not (transcript_text or "").strip():
        return []
    sents = _sentences(transcript_text)
    if len(sents) < 12:
        return []
    tn = norm(clean_transcript(transcript_text))
    hand_texts = [norm(x[1]) for spec in TRANSCRIPT_DECKS for x in spec["slides"] if x[0] == "quote"]
    hand_shingles = _shingles([x[1] for spec in TRANSCRIPT_DECKS for x in spec["slides"]])
    cands = _mine_candidates(sents, campaign)
    for k in list(cands):                              # lines already used by the hand-written decks stay theirs
        q = norm(cands[k]["q"])
        if any(q in ht or ht in q for ht in hand_texts) or len(_shingles([cands[k]["q"]]) & hand_shingles) >= 4:
            del cands[k]
    for c in cands.values():
        c["topics"] = _topics(c["q"])
    anchors = sorted((c for c in cands.values() if c["qs"] >= 3.5), key=lambda c: (-c["qs"], c["i"]))
    uses: dict = {}
    anchored: set = set()
    decks, used_sets, deck_sh, hooks = [], [], [], set()
    free = lambda c, mu: all(uses.get(x, 0) < mu for x in c["cov"])
    for max_use in (1, 2, 3, 4):
        for a in anchors:
            key = (a["i"], len(a["cov"]))
            if key in anchored or not free(a, max_use):
                continue
            pool = []
            for k, c in cands.items():
                d = abs(c["i"] - a["i"])
                if c["cov"] & a["cov"] or not free(c, max_use) or c["qs"] < 2.5:
                    continue
                shared = len(a["topics"] & c["topics"])
                rel = _jaccard(_content(a["q"]), _content(c["q"]))
                near = 2.0 if d <= 12 else 0.0
                same = 2.0 if c["angle"] == a["angle"] else 0.0
                pool.append((c["qs"] + 3.0 * shared + 12 * rel + near + same
                             - 4.0 * max(uses.get(x, 0) for x in c["cov"]), k))
            pool.sort(key=lambda x: (-x[0], x[1]))
            sup = []
            for _, k in pool:
                if all(not (cands[k]["cov"] & x["cov"]) for x in sup):
                    sup.append(cands[k])
                if len(sup) == 8:
                    break
            made = None
            for skip in range(0, 4):                           # if too close to an earlier deck, swap supports
                pick = [a] + sup[skip:skip + 5]
                if len(pick) < 4:
                    break
                deck, used = _deck_for(pick, campaign, a["angle"], hooks)
                if not deck or not _verbatim_ok(deck, tn):
                    continue
                if verify_deck(deck, campaign, transcript_text, from_transcript=True):
                    continue
                if any(len(used & u) > (1 if max_use <= 1 else 2) for u in used_sets) or any(d0["id"] == deck["id"] for d0, _ in decks):
                    continue
                sh = _shingles([x["text"] for x in deck["slides"] if x["kind"] == "quote" or x.get("verbatim")])
                if any(_jaccard(sh, o) > 0.34 for o in deck_sh):
                    continue
                made = (deck, used, sh)
                break
            if not made:
                continue
            deck, used, sh = made
            for i in used:
                uses[i] = uses.get(i, 0) + 1
            anchored.add(key)
            used_sets.append(used)
            deck_sh.append(sh)
            if deck["slides"][0].get("verbatim"):
                hooks.add(norm(deck["slides"][0]["text"]))
            got = [c for c in pick if c["cov"] & used]
            decks.append((deck, sum(c["qs"] for c in got) / max(1, len(got))
                          + (2.0 if deck["slides"][0].get("verbatim") else 0.0)))
        if len(decks) >= max(limit or 0, 40):
            break
    # rotate angles so any prefix is a mix; inside an angle the best passage first
    buckets: dict = {a: [] for a in ANGLE_ORDER}
    for d, sc in sorted(decks, key=lambda x: (-x[1], x[0]["id"])):
        buckets[d["angle"]].append(d)
    skip = set(existing_ids or ())
    out = []
    while any(buckets.values()):
        for a in ANGLE_ORDER:
            if buckets[a]:
                d = buckets[a].pop(0)
                if d["id"] not in skip:
                    out.append(d)
    return out[:limit] if limit else out


# ----------------------------------------------------------------------------------------------- CLI
def _resolve(p: str, base: Path) -> Path:
    q = Path(p)
    if q.is_file() or q.is_absolute():
        return q
    for b in (base, HERE):
        if (b / p).exists():
            return b / p
    return q


def build(campaign_path, transcript_path, out_dir, limit=None, only=None, mine=40) -> list[dict]:
    cpath = _resolve(campaign_path, Path.cwd())
    campaign = json.loads(Path(cpath).read_text(encoding="utf-8"))
    logo_rel = (campaign.get("on_screen") or {}).get("logo") or ""
    logo = _resolve(logo_rel, Path(cpath).parent) if logo_rel else None
    if not logo or not Path(logo).is_file():
        logo = Path(cpath).parent / logo_rel
    if not Path(logo).is_file():
        raise SystemExit(f"logo not found: {logo_rel}")
    text = Path(transcript_path).read_text(encoding="utf-8") if transcript_path else ""
    decks = decks_from_transcript(text, campaign, mine=mine)
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
    b.add_argument("--mine", type=int, default=40, help="max auto-mined decks after the hand-written ones (0 = none)")
    ls = sub.add_parser("list", help="list the decks without rendering")
    ls.add_argument("--campaign", required=True)
    ls.add_argument("--transcript", default="")
    ls.add_argument("--mine", type=int, default=40, help="max auto-mined decks after the hand-written ones (0 = none)")
    a = ap.parse_args(argv)
    if a.cmd == "build":
        decks = build(a.campaign, a.transcript, a.out, a.limit, a.only, a.mine)
        print(f"{len(decks)} decks -> {a.out}")
    else:
        campaign = json.loads(_resolve(a.campaign, Path.cwd()).read_text(encoding="utf-8"))
        text = Path(a.transcript).read_text(encoding="utf-8") if a.transcript else ""
        for d in decks_from_transcript(text, campaign, mine=a.mine):
            print(f"{d['id']:32s} {len(d['slides'])} {d['angle']:15s} {d['title']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
