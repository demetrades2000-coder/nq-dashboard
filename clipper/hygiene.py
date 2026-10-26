"""Output hygiene: how a finished clip is encoded and checked before anyone posts it.

  encode_args(dur, cap_mb_per_30s, ...)  -> ffmpeg output args (H.264 high, 30 fps, AAC, faststart, no metadata)
  validate_output(path, ...)             -> report dict {"ok", "problems", "warnings", "stats"}
  shrink_to_cap(path, cap_bytes, ...)    -> re-encode an oversize file once; True when it now fits
  has_faststart(path)                    -> moov atom before mdat

"ok" is False only for things that make a post worthless or rejected: wrong size / codec / fps, mostly black video,
silent audio, under 7 s. Slow bits (a 1.3 s silence) are warnings. No fingerprint tricks: the encode is the same plain
H.264/AAC for every clip (the brief bans duplicate clips; making them look different is not our job and not allowed).
"""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

OUT_W, OUT_H, FPS = 1080, 1920, 30
CAP_MB_PER_30S = 8.0
AUDIO_KBPS = 128
# stream "encoder" = "Lavc libx264" (bitexact short form, no version / settings) cannot be removed by ffmpeg
OK_TAGS = {"major_brand", "minor_version", "compatible_brands", "handler_name", "vendor_id", "language", "encoder"}


def video_kbps_cap(dur: float, cap_mb_per_30s: float = CAP_MB_PER_30S) -> int:
    """Largest average video bitrate that keeps the file near `cap_mb_per_30s` per 30 s (audio included)."""
    total_kbps = cap_mb_per_30s * 8 * 1024 * 1024 / 30 / 1000   # MB per 30 s -> kbit/s
    return max(600, int(total_kbps * 0.96 - AUDIO_KBPS))


def encode_args(dur: float, preset: str = "veryfast", crf: int = 20, has_audio: bool = True,
                cap_mb_per_30s: float = CAP_MB_PER_30S, threads: int | None = None) -> list[str]:
    """Constrained-quality x264: crf keeps simple scenes cheap, maxrate/bufsize stop busy scenes from blowing the
    size cap. Metadata is stripped (-map_metadata -1, bitexact: no encoder string, no creation time)."""
    vk = video_kbps_cap(dur, cap_mb_per_30s)
    a = ["-map_metadata", "-1", "-fflags", "+bitexact", "-flags:v", "+bitexact", "-flags:a", "+bitexact",
         "-c:v", "libx264", "-profile:v", "high", "-level", "4.1", "-preset", preset, "-crf", str(crf),
         "-maxrate", f"{vk}k", "-bufsize", f"{vk * 2}k", "-r", str(FPS), "-pix_fmt", "yuv420p",
         "-x264-params", "no-info=1", "-movflags", "+faststart"]
    if threads:
        a += ["-threads", str(threads)]
    if has_audio:
        a += ["-c:a", "aac", "-b:a", f"{AUDIO_KBPS}k", "-ar", "48000"]
    return a


def _run(cmd, timeout=300):
    return subprocess.run(cmd, capture_output=True, text=True, errors="replace", timeout=timeout)


def has_faststart(path: Path) -> bool:
    """True when the 'moov' box comes before 'mdat' (the video can start playing before it is fully downloaded)."""
    try:
        with open(path, "rb") as f:
            pos = 0
            for _ in range(32):
                f.seek(pos)
                hdr = f.read(16)
                if len(hdr) < 8:
                    return False
                size = int.from_bytes(hdr[:4], "big")
                typ = hdr[4:8]
                if size == 1:
                    size = int.from_bytes(hdr[8:16], "big")
                if typ == b"moov":
                    return True
                if typ == b"mdat":
                    return False
                if size < 8:
                    return False
                pos += size
    except OSError:
        pass
    return False


def probe_streams(path: Path, ffprobe: str = "ffprobe") -> dict:
    r = _run([ffprobe, "-v", "error", "-show_entries",
              "format=duration,size:format_tags:stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt:stream_tags",
              "-of", "json", str(path)], 60)
    return json.loads(r.stdout or "{}")


def _fps(s: str) -> float:
    try:
        a, b = s.split("/")
        return float(a) / float(b)
    except Exception:  # noqa: BLE001
        try:
            return float(s)
        except Exception:  # noqa: BLE001
            return 0.0


def scan_av(path: Path, ffmpeg: str = "ffmpeg", has_audio: bool = True, black_s: float = 0.5,
            silence_s: float = 1.2) -> dict:
    """One decode pass: black intervals, silences and mean volume."""
    vf = f"blackdetect=d={black_s}:pix_th=0.12:pic_th=0.98"
    cmd = [ffmpeg, "-hide_banner", "-nostats", "-i", str(path), "-vf", vf]
    if has_audio:
        cmd += ["-af", f"silencedetect=n=-45dB:d={silence_s},volumedetect"]
    cmd += ["-f", "null", "-"]
    r = _run(cmd, 600)
    err = r.stderr
    black = [(float(a), float(b)) for a, b in re.findall(r"black_start:([\d.]+)\s+black_end:([\d.]+)", err)]
    sil = [(float(a), float(b)) for a, b in re.findall(r"silence_start: ([\d.-]+)[\s\S]*?silence_end: ([\d.]+)", err)]
    open_sil = re.findall(r"silence_start: ([\d.-]+)", err)
    mean = re.search(r"mean_volume: ([-\d.]+) dB", err)
    mx = re.search(r"max_volume: ([-\d.]+) dB", err)
    return {"black": black, "silences": sil, "open_silences": len(open_sil) - len(sil),
            "mean_db": float(mean.group(1)) if mean else None, "max_db": float(mx.group(1)) if mx else None}


def validate_output(path: Path, *, ffmpeg: str = "ffmpeg", ffprobe: str = "ffprobe", expect_audio: bool = True,
                    min_dur: float = 7.0, cap_mb_per_30s: float = CAP_MB_PER_30S, intended_silence: float = 1.2,
                    deep: bool = True) -> dict:
    path = Path(path)
    problems, warnings = [], []
    stats: dict = {}
    try:
        d = probe_streams(path, ffprobe)
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "problems": [f"ffprobe failed: {e}"], "warnings": [], "stats": {}}
    streams = d.get("streams", [])
    v = next((s for s in streams if s.get("codec_type") == "video"), None)
    a = next((s for s in streams if s.get("codec_type") == "audio"), None)
    fmt = d.get("format", {})
    dur = float(fmt.get("duration") or 0)
    size = int(fmt.get("size") or (path.stat().st_size if path.exists() else 0))
    stats.update(duration=round(dur, 2), size=size)
    if not v:
        return {"ok": False, "problems": ["no video stream"], "warnings": warnings, "stats": stats}
    w, h = int(v.get("width") or 0), int(v.get("height") or 0)
    stats.update(width=w, height=h, fps=round(_fps(v.get("r_frame_rate", "0")), 2), codec=v.get("codec_name"))
    if (w, h) != (OUT_W, OUT_H):
        problems.append(f"size {w}x{h}, need {OUT_W}x{OUT_H}")
    if v.get("codec_name") != "h264":
        problems.append(f"video codec {v.get('codec_name')}, need h264")
    if v.get("pix_fmt") != "yuv420p":
        warnings.append(f"pixel format {v.get('pix_fmt')}")
    if abs(_fps(v.get("r_frame_rate", "0")) - FPS) > 0.6:
        problems.append(f"{_fps(v.get('r_frame_rate', '0')):.1f} fps, need {FPS}")
    if expect_audio:
        if not a:
            problems.append("no audio stream")
        elif a.get("codec_name") != "aac":
            problems.append(f"audio codec {a.get('codec_name')}, need aac")
    if dur < min_dur:
        problems.append(f"{dur:.1f}s is under the {min_dur:.0f}s minimum")
    cap = cap_mb_per_30s * 1024 * 1024 * max(dur, 30.0) / 30.0 if dur else 0
    stats["cap_bytes"] = int(cap)
    if cap and size > cap * 1.1:
        warnings.append(f"{size / 1e6:.1f} MB is over the {cap / 1e6:.1f} MB target")
    if not has_faststart(path):
        warnings.append("moov atom is not at the front (no faststart)")
    tags = {k.lower() for k in (fmt.get("tags") or {})}
    for s in streams:
        tags |= {k.lower() for k in (s.get("tags") or {}) if k.lower() not in OK_TAGS}
    extra = tags - OK_TAGS
    if extra:
        warnings.append("metadata left in the file: " + ", ".join(sorted(extra)))
    if deep and dur > 0:
        try:
            sc = scan_av(path, ffmpeg, has_audio=bool(a), silence_s=intended_silence)
            black_total = sum(b - a_ for a_, b in sc["black"])
            stats["black_s"] = round(black_total, 2)
            if black_total > 0.4 * dur:
                problems.append(f"{black_total:.1f}s of black frames")
            elif black_total > 0.8:
                warnings.append(f"{black_total:.1f}s of black frames")
            if a:
                stats["mean_db"] = sc["mean_db"]
                if sc["mean_db"] is None or sc["mean_db"] < -55 or (sc["max_db"] is not None and sc["max_db"] < -40):
                    problems.append("audio is silent")
                long_sil = [x for x in sc["silences"] if x[1] - x[0] > intended_silence]
                if long_sil or sc["open_silences"] > 0:
                    warnings.append(f"{len(long_sil) + max(sc['open_silences'], 0)} silence(s) longer than {intended_silence}s")
                stats["long_silences"] = len(long_sil)
        except Exception as e:  # noqa: BLE001
            warnings.append(f"deep scan skipped: {e}")
    return {"ok": not problems, "problems": problems, "warnings": warnings, "stats": stats}


def shrink_to_cap(path: Path, cap_bytes: int, *, ffmpeg: str = "ffmpeg", preset: str = "veryfast") -> bool:
    """Re-encode `path` in place to fit `cap_bytes` (one pass at a computed bitrate). The picture is the clip
    already rendered, so this only costs a little sharpness on the oversize files, which is rare with maxrate."""
    path = Path(path)
    if path.stat().st_size <= cap_bytes:
        return True
    try:
        dur = float(json.loads(_run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json",
                                     str(path)], 60).stdout)["format"]["duration"])
    except Exception:  # noqa: BLE001
        return False
    vk = max(500, int(cap_bytes * 8 / max(dur, 1) / 1000 * 0.93 - AUDIO_KBPS))
    tmp = path.with_name(path.stem + ".shrink.mp4")
    r = _run([ffmpeg, "-y", "-v", "error", "-i", str(path), "-map_metadata", "-1", "-fflags", "+bitexact",
              "-c:v", "libx264", "-profile:v", "high", "-preset", preset, "-b:v", f"{vk}k", "-maxrate", f"{vk}k",
              "-bufsize", f"{vk * 2}k", "-pix_fmt", "yuv420p", "-r", str(FPS), "-c:a", "copy",
              "-movflags", "+faststart", str(tmp)], 900)
    if r.returncode == 0 and tmp.exists() and 10_000 < tmp.stat().st_size < path.stat().st_size:
        tmp.replace(path)
        return path.stat().st_size <= cap_bytes * 1.05
    tmp.unlink(missing_ok=True)
    return False
