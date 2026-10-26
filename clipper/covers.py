"""Cover frames: which moment of a finished clip makes the best thumbnail, and a branded cover image.

  best_cover_ms(video)                      -> (timestamp in ms, report)   for Zernio's video_cover_timestamp_ms
  cover_image(clip_path, title, campaign)   -> Path of a 1080x1920 JPG (frame + hook title + logo)

How a frame is scored (all heuristics, no learned model):
  sharpness   variance of the Laplacian: motion blur and compression smear score low
  exposure    mean brightness 55-200 (not a dark or blown-out frame)
  face        OpenCV Haar frontal-face cascade (if cv2 is installed): a big, roughly centred face is best
  stillness   the lower half of the face box barely changed since the previous sampled frame = mouth not mid-word
              (a closed / neutral mouth reads better than a half-open one). Without a face, whole-frame stillness.
Frames from the first 2.6 s are skipped when the clip is longer than 8 s: the hook title is on screen there.
"""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

import numpy as np

SAMPLE_FPS = 4
FRAME_W, FRAME_H = 360, 640


def _frames(video: Path, ffmpeg: str, start: float, dur: float):
    """Gray frames at SAMPLE_FPS as a (n, FRAME_H, FRAME_W) uint8 array, plus their timestamps in seconds."""
    cmd = [ffmpeg, "-v", "error", "-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", str(video),
           "-vf", f"fps={SAMPLE_FPS},scale={FRAME_W}:{FRAME_H}:force_original_aspect_ratio=increase,"
                  f"crop={FRAME_W}:{FRAME_H},format=gray", "-f", "rawvideo", "-"]
    r = subprocess.run(cmd, capture_output=True, timeout=300)
    n = len(r.stdout) // (FRAME_W * FRAME_H)
    if n == 0:
        return np.zeros((0, FRAME_H, FRAME_W), np.uint8), []
    arr = np.frombuffer(r.stdout[: n * FRAME_W * FRAME_H], np.uint8).reshape(n, FRAME_H, FRAME_W)
    return arr, [start + (i + 0.5) / SAMPLE_FPS for i in range(n)]


def _sharp(g: np.ndarray) -> float:
    g = g.astype(np.float32)
    lap = g[1:-1, 1:-1] * 4 - g[:-2, 1:-1] - g[2:, 1:-1] - g[1:-1, :-2] - g[1:-1, 2:]
    return float(lap.var())


def _face_boxes(frames: np.ndarray):
    try:
        import cv2
        import os
        casc = cv2.CascadeClassifier(os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml"))
        if casc.empty():
            return None
    except Exception:  # noqa: BLE001
        return None
    out = []
    for g in frames:
        fs = casc.detectMultiScale(g, 1.15, 5, minSize=(40, 40))
        out.append(max(fs, key=lambda f: f[2] * f[3]) if len(fs) else None)
    return out


def score_frames(frames: np.ndarray) -> list[dict]:
    """Per-frame scores 0..1 and their parts."""
    n = len(frames)
    sharp = [_sharp(g) for g in frames]
    smax = max(sharp) if sharp else 1.0
    faces = _face_boxes(frames)
    rows = []
    for i, g in enumerate(frames):
        mean = float(g.mean())
        expo = 1.0 if 55 <= mean <= 200 else max(0.0, 1 - min(abs(mean - 55), abs(mean - 200)) / 55)
        sh = min(sharp[i] / (smax or 1.0), 1.0)
        prev = frames[i - 1] if i > 0 else (frames[i + 1] if n > 1 else g)
        box = faces[i] if faces else None
        if box is not None:
            x, y, w, h = [int(v) for v in box]
            lower = (slice(y + h // 2, y + h), slice(x, x + w))
            diff = float(np.abs(g[lower].astype(np.float32) - prev[lower].astype(np.float32)).mean())
            still = max(0.0, 1 - diff / 18)
            size = min((w * h) / (FRAME_W * FRAME_H * 0.07), 1.0)
            centre = 1 - min(abs((x + w / 2) / FRAME_W - 0.5) / 0.5, 1)
            face = 0.6 * size + 0.4 * centre
        else:
            diff = float(np.abs(g.astype(np.float32) - prev.astype(np.float32)).mean())
            still = max(0.0, 1 - diff / 12)
            face = 0.0
        has_cv = faces is not None
        total = (0.30 * sh + 0.15 * expo + 0.30 * still + (0.25 * face if has_cv else 0.25 * still))
        rows.append({"sharp": round(sh, 3), "expo": round(expo, 3), "still": round(still, 3),
                     "face": round(face, 3), "has_face": box is not None, "score": round(total, 4)})
    return rows


def best_cover_ms(video, ffmpeg: str = "ffmpeg", skip_title_s: float = 2.6, duration: float | None = None) -> tuple[int, dict]:
    """(timestamp_ms, report) of the best still. Always returns a valid timestamp inside the video."""
    video = Path(video)
    if duration is None:
        r = subprocess.run([ffmpeg.replace("ffmpeg", "ffprobe") if ffmpeg.endswith("ffmpeg") else "ffprobe", "-v", "error",
                            "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(video)],
                           capture_output=True, text=True, timeout=60)
        try:
            duration = float(r.stdout.strip())
        except ValueError:
            duration = 0.0
    if duration <= 0.5:
        return 0, {"reason": "unreadable duration"}
    start = skip_title_s if duration > 8 else 0.2
    span = max(0.5, duration - start - 0.3)
    frames, ts = _frames(video, ffmpeg, start, span)
    if len(frames) == 0:
        return int(min(duration * 0.4, duration - 0.2) * 1000), {"reason": "no frames, used 40% mark"}
    rows = score_frames(frames)
    i = max(range(len(rows)), key=lambda k: rows[k]["score"])
    ms = int(min(ts[i], duration - 0.1) * 1000)
    return ms, {"frame": i, "of": len(rows), **rows[i], "face_detector": any(r["has_face"] for r in rows)}


def cover_image(clip_path, title: str, campaign: dict | None = None, out: str | Path | None = None,
                ts_ms: int | None = None, ffmpeg: str = "ffmpeg") -> Path:
    """Branded 1080x1920 cover: the best frame, a dark gradient, the hook title in big type, the campaign logo.
    The title is only ever placed as given (callers pass a verbatim hook, see hooks.make_hook)."""
    from PIL import Image, ImageDraw
    import slideshow as ss
    clip_path = Path(clip_path)
    if ts_ms is None:
        ts_ms, _ = best_cover_ms(clip_path, ffmpeg)
    out = Path(out) if out else clip_path.with_suffix(".cover.jpg")
    with tempfile.TemporaryDirectory() as td:
        png = Path(td) / "f.png"
        subprocess.run([ffmpeg, "-y", "-v", "error", "-ss", f"{ts_ms / 1000:.3f}", "-i", str(clip_path), "-frames:v", "1",
                        "-vf", f"scale={ss.W}:{ss.H}:force_original_aspect_ratio=increase,crop={ss.W}:{ss.H}", str(png)],
                       capture_output=True, timeout=120)
        base = Image.open(png).convert("RGBA") if png.exists() else Image.new("RGBA", (ss.W, ss.H), (8, 10, 12, 255))
    # gradient: dark at the top (title) and bottom (UI), clear in the middle
    ys = np.linspace(0, 1, ss.H, dtype=np.float32)
    a = np.clip(1.0 - np.minimum(ys / 0.42, 1.0), 0, 1) * 0.78 + np.clip((ys - 0.78) / 0.22, 0, 1) * 0.65
    grad = np.zeros((ss.H, ss.W, 4), np.uint8)
    grad[..., 3] = (a[:, None] * 255).astype(np.uint8)
    base.alpha_composite(Image.fromarray(grad, "RGBA"))
    th = dict(ss.DEFAULT_THEME)
    brand = ((campaign or {}).get("style") or {}).get("brand_color")
    if brand:
        h = brand.lstrip("#")
        th["accent"] = (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
    glow = Image.new("RGBA", (ss.W, ss.H), (0, 0, 0, 0))
    x0, y0, x1, y1 = ss.SAFE
    logo_rel = ((campaign or {}).get("on_screen") or {}).get("logo")
    top = y0 + 10
    if logo_rel:
        lp = Path(logo_rel)
        if not lp.is_absolute() and (campaign or {}).get("_path"):
            lp = Path(campaign["_path"]).parent / lp
        if lp.is_file():
            _, core = ss.logo_parts(lp)
            box = ss.paste_logo(base, core, 520, x0, top)
            top = box[3] + 40
    if title:
        f, lines, lh, hgt = ss.fit(title.upper(), "display", x1 - x0, 560, 120, min_size=56, lh=1.04)
        d = ImageDraw.Draw(base)
        d.rounded_rectangle((x0, top, x0 + 110, top + 10), 5, fill=th["accent"])
        ss.draw_lines(base, glow, lines, f, x0, top + 40, lh, (255, 255, 255), th["accent"])
    out.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(out, "JPEG", quality=90)
    return out
