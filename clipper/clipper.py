#!/usr/bin/env python3
"""
Money Clipper: turn long streams and podcasts from money-space creators into
ready-to-post 9:16 short-form clips.

Pipeline
  1. fetch       yt-dlp (YouTube, Twitch, Kick, X, Rumble, ...) or a local file
  2. transcribe  uploaded subs > faster-whisper (word timestamps) > openai-whisper
                 > auto subs > audio-energy only
  3. score       hook strength, money density, specifics, emotion, payoff,
                 audio energy, pace, length; optional Claude re-rank
  4. render      jump cuts (dead air removed), face-tracked crop or blurred
                 background reframe, word-by-word captions, title bar, -14 LUFS
  5. package     mp4s + CLIPS.md (titles, captions, hashtags, timestamps) + clips.json

Every stage has a fallback, and each render steps down through simpler ffmpeg
graphs until one succeeds, so a run always ends with clips on disk.

  python clipper.py "https://www.youtube.com/watch?v=..." --clips 8
  python clipper.py podcast.mp4 --layout crop --max 45
  python clipper.py --selftest
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import shutil
import statistics
import subprocess
import sys
import time
import traceback
import wave
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import campaign as cmp  # noqa: E402
import audiofx  # noqa: E402
import captions as capt  # noqa: E402
import hooks  # noqa: E402
import hygiene  # noqa: E402
import scoring  # noqa: E402

VERSION = "1.1.0"
OUT_W, OUT_H, FPS = 1080, 1920, 30

# ---------------------------------------------------------------- logging

_T0 = time.time()


def robust_stdio() -> None:
    """Windows consoles and redirected logs default to cp1252, which can't encode emoji or arrows in captions:
    print a replacement character instead of crashing the run."""
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(errors="replace")  # type: ignore[union-attr]
        except Exception:  # noqa: BLE001  (not a TextIOWrapper, e.g. a test's StringIO)
            pass


def log(msg: str, level: str = "info") -> None:
    tag = {"info": "  ", "ok": "OK", "warn": "!!", "step": "=>", "err": "XX"}.get(level, "  ")
    print(f"[{time.time() - _T0:6.1f}s] {tag} {msg}", flush=True)


def hms(t: float) -> str:
    t = max(0, int(t))
    return f"{t // 3600:d}:{t % 3600 // 60:02d}:{t % 60:02d}"


def slugify(text: str, n: int = 50) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", text or "").strip("-").lower()
    return (s[:n].strip("-") or "clip")


# ---------------------------------------------------------------- dependencies

def pip_install(*pkgs: str, upgrade: bool = False) -> bool:
    base = [sys.executable, "-m", "pip", "install", "-q", "--disable-pip-version-check"]
    if upgrade:
        base.append("-U")
    for extra in ([], ["--user"], ["--break-system-packages"]):
        try:
            r = subprocess.run(base + extra + list(pkgs), capture_output=True, text=True, errors="replace",
                               timeout=900)
            if r.returncode == 0:
                return True
        except Exception:
            pass
    return False


def try_import(module: str, pip_name: str | None = None, allow_install: bool = True):
    import importlib
    try:
        return importlib.import_module(module)
    except Exception:
        pass
    if not allow_install:
        return None
    log(f"installing {pip_name or module} ...")
    if pip_install(pip_name or module):
        try:
            importlib.invalidate_caches()
            return importlib.import_module(module)
        except Exception:
            return None
    return None


class Tools:
    ffmpeg: str = "ffmpeg"
    ffprobe: str | None = "ffprobe"

    @classmethod
    def setup(cls, allow_install: bool) -> None:
        ff = shutil.which("ffmpeg") or installed_ffmpeg()
        if not ff:
            mod = try_import("imageio_ffmpeg", "imageio-ffmpeg", allow_install)
            if mod:
                ff = mod.get_ffmpeg_exe()
        if not ff:
            raise SystemExit(
                "ffmpeg not found and could not be installed automatically.\n"
                "  Windows: winget install ffmpeg   macOS: brew install ffmpeg   "
                "Linux: sudo apt install ffmpeg"
            )
        cls.ffmpeg = ff
        sibling = Path(ff).with_name("ffprobe" + Path(ff).suffix)
        cls.ffprobe = str(sibling) if sibling.is_file() else shutil.which("ffprobe")


def installed_ffmpeg() -> str | None:
    """ffmpeg installed but not on this process's PATH: winget only updates PATH for new windows, and
    Homebrew's bin folder isn't on PATH for scheduled jobs (launchd/cron)."""
    cands: list[Path] = []
    if os.name == "nt":
        roots = [Path(os.environ[v]) / sub for v, sub in (("LOCALAPPDATA", "Microsoft/WinGet"), ("ProgramFiles", "WinGet"))
                 if os.environ.get(v)]  # winget user scope, machine scope
        for root in roots:
            cands.append(root / "Links" / "ffmpeg.exe")
            cands += sorted((root / "Packages").glob("Gyan.FFmpeg*/*/bin/ffmpeg.exe"), reverse=True)
        cands += [Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "ffmpeg" / "bin" / "ffmpeg.exe",
                  Path(r"C:\ffmpeg\bin\ffmpeg.exe")]
    else:
        cands += [Path("/opt/homebrew/bin/ffmpeg"), Path("/usr/local/bin/ffmpeg")]
    for c in cands:
        try:
            if c.is_file():
                return str(c)
        except OSError:
            pass
    return None


def run(cmd: list[str], cwd: Path | None = None, timeout: float | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=str(cwd) if cwd else None, capture_output=True,
                          text=True, errors="replace", timeout=timeout)


@dataclass
class MediaInfo:
    duration: float
    width: int
    height: int
    has_audio: bool


def probe(path: Path) -> MediaInfo:
    if Tools.ffprobe:
        try:
            r = run([Tools.ffprobe, "-v", "error", "-show_entries",
                     "format=duration:stream=codec_type,width,height", "-of", "json", str(path)], timeout=60)
            d = json.loads(r.stdout)
            streams = d.get("streams", [])
            v = next((s for s in streams if s.get("codec_type") == "video"), {})
            dur = float(d.get("format", {}).get("duration") or 0)
            if v and dur > 0:
                return MediaInfo(dur, int(v.get("width") or 0), int(v.get("height") or 0),
                                 any(s.get("codec_type") == "audio" for s in streams))
        except Exception:
            pass
    # ffprobe missing (imageio-ffmpeg ships ffmpeg only): parse the banner
    r = run([Tools.ffmpeg, "-hide_banner", "-i", str(path)], timeout=60)
    err = r.stderr
    m = re.search(r"Duration:\s*(\d+):(\d+):([\d.]+)", err)
    dur = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3)) if m else 0.0
    vm = re.search(r"Video:.*?(\d{2,5})x(\d{2,5})", err)
    w, h = (int(vm.group(1)), int(vm.group(2))) if vm else (0, 0)
    return MediaInfo(dur, w, h, "Audio:" in err)


# ---------------------------------------------------------------- fetch

VIDEO_EXT = {".mp4", ".mkv", ".webm", ".mov", ".m4v", ".flv", ".ts", ".avi"}


def parse_time(s: str) -> float:
    parts = [float(p) for p in s.strip().split(":")]
    t = 0.0
    for p in parts:
        t = t * 60 + p
    return t


def fetch(source: str, work: Path, args) -> tuple[Path, dict]:
    p = Path(source).expanduser()
    if p.exists() and p.is_file():
        log(f"local file: {p}", "ok")
        return p.resolve(), {"title": p.stem, "webpage_url": "", "uploader": ""}

    work.mkdir(parents=True, exist_ok=True)
    existing = [f for f in work.glob("source.*") if f.suffix.lower() in VIDEO_EXT]
    meta_file = work / "meta.json"
    if existing and meta_file.exists():
        log("using cached download", "ok")
        return existing[0], json.loads(meta_file.read_text(encoding="utf-8"))

    yt_dlp = try_import("yt_dlp", "yt-dlp", not args.no_install)
    if not yt_dlp:
        raise RuntimeError("yt-dlp is unavailable; pip install yt-dlp, or pass a local video file")

    base = {
        "outtmpl": str(work / "source.%(ext)s"),
        "noplaylist": True,
        "retries": 15,
        "fragment_retries": 15,
        "extractor_retries": 5,
        "continuedl": True,
        "concurrent_fragment_downloads": 4,
        "merge_output_format": "mp4",
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
    }
    if os.path.isabs(Tools.ffmpeg):  # the ffmpeg we found may not be on PATH (fresh winget install, imageio-ffmpeg)
        base["ffmpeg_location"] = Tools.ffmpeg
    if args.cookies:
        base["cookiefile"] = args.cookies
    if args.cookies_from_browser:
        base["cookiesfrombrowser"] = (args.cookies_from_browser,)
    if args.section:
        a, b = args.section.split("-", 1)
        base["download_ranges"] = yt_dlp.utils.download_range_func(None, [(parse_time(a), parse_time(b))])
        base["force_keyframes_at_cuts"] = True

    formats = [
        "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/bv*[height<=1080]+ba/b[height<=1080]/bv*+ba/b",
        "best[height<=1080]/best",
        "best",
    ]
    info, last_err = None, None
    for attempt in range(2):
        for fmt in formats:
            try:
                log(f"downloading ({fmt.split('/')[0]}) ...")
                with yt_dlp.YoutubeDL({**base, "format": fmt}) as ydl:
                    info = ydl.extract_info(source, download=True)
                break
            except Exception as e:  # noqa: BLE001
                last_err = e
                log(f"download attempt failed: {str(e).splitlines()[0][:200]}", "warn")
        if info:
            break
        if attempt == 0 and not args.no_install:
            log("updating yt-dlp (sites change often) and retrying ...", "warn")
            pip_install("yt-dlp", upgrade=True)
            import importlib
            yt_dlp = importlib.reload(yt_dlp)
    if not info:
        raise RuntimeError(
            f"download failed: {last_err}\n  Tips: --cookies-from-browser chrome (age/bot checks), "
            "or download the video yourself and pass the file path."
        )

    files = [f for f in work.glob("source.*") if f.suffix.lower() in VIDEO_EXT]
    if not files:
        raise RuntimeError("download finished but no video file was produced")
    meta = {k: info.get(k, "") for k in ("title", "uploader", "webpage_url", "duration", "id", "extractor")}
    meta["section_offset"] = parse_time(args.section.split("-", 1)[0]) if args.section else 0.0
    meta_file.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    # Subtitles are a separate, optional request: a 429 on captions must not cost the video.
    if not args.section:
        try:
            with yt_dlp.YoutubeDL({**base, "skip_download": True, "writesubtitles": True,
                                   "writeautomaticsub": True,
                                   "subtitleslangs": [args.lang + ".*" if args.lang else "en.*", "en"],
                                   "subtitlesformat": "json3/vtt/srt/best",
                                   "outtmpl": str(work / "subs.%(ext)s")}) as ydl:
                ydl.download([source])
        except Exception:
            pass
        manual = set((info.get("subtitles") or {}).keys())
        for f in work.glob("subs.*"):
            lang = f.suffixes[0].strip(".") if len(f.suffixes) > 1 else ""
            kind = "manual" if lang in manual else "auto"
            f.replace(work / f"subs_{kind}{''.join(f.suffixes[-1:])}")  # replace: rename fails on Windows if it exists
    log(f"downloaded: {meta['title']}", "ok")
    return files[0], meta


# ---------------------------------------------------------------- transcripts

@dataclass
class Word:
    w: str
    s: float
    e: float
    p: float = 1.0  # recognizer confidence; low values get flagged for review


def _spread(text: str, s: float, e: float) -> list[Word]:
    toks = text.split()
    if not toks:
        return []
    total = sum(len(t) + 1 for t in toks)
    out, t = [], s
    for tok in toks:
        d = (e - s) * (len(tok) + 1) / total
        out.append(Word(tok, t, t + d))
        t += d
    return out


def _ts(s: str) -> float:
    s = s.strip().replace(",", ".")
    parts = s.split(":")
    return sum(float(p) * 60 ** i for i, p in enumerate(reversed(parts)))


def parse_srt_vtt(text: str) -> list[Word]:
    words: list[Word] = []
    prev_lines: list[str] = []
    blocks = re.split(r"\n\n+", text.replace("\r", ""))  # YouTube cues contain whitespace-only lines
    for b in blocks:
        m = re.search(r"([\d:.,]+)\s*-->\s*([\d:.,]+)", b)
        if not m:
            continue
        s, e = _ts(m.group(1)), _ts(m.group(2))
        raw_lines = b.split("\n")
        cue_at = next(i for i, x in enumerate(raw_lines) if "-->" in x)
        lines = [ln for ln in raw_lines[cue_at + 1:] if ln.strip()]
        timed = [ln for ln in lines if re.search(r"<\d+:\d+:[\d.]+>", ln)]
        if timed:  # YouTube auto VTT carries per-word timestamps
            for ln in timed:
                parts = re.split(r"<(\d+:\d+:[\d.]+)>", ln)
                cur_t, cur_txt = s, parts[0]
                chunks = []
                for i in range(1, len(parts), 2):
                    chunks.append((cur_t, cur_txt))
                    cur_t, cur_txt = _ts(parts[i]), parts[i + 1]
                chunks.append((cur_t, cur_txt))
                for j, (t, txt) in enumerate(chunks):
                    clean = re.sub(r"<[^>]+>", "", txt).strip()
                    nxt = chunks[j + 1][0] if j + 1 < len(chunks) else e
                    words.extend(_spread(clean, t, max(nxt, t + 0.05)))
            prev_lines = [re.sub(r"<[^>]+>", "", ln).strip() for ln in lines]
            continue
        clean = [re.sub(r"<[^>]+>|\{[^}]+\}", "", ln).strip() for ln in lines]
        clean = [c for c in clean if c and c not in prev_lines]  # rolling-caption dedupe
        prev_lines = [re.sub(r"<[^>]+>", "", ln).strip() for ln in lines]
        if clean:
            words.extend(_spread(" ".join(clean), s, e))
    return words


def parse_json3(text: str) -> list[Word]:
    d = json.loads(text)
    raw: list[tuple[float, str]] = []
    ends: list[float] = []
    for ev in d.get("events", []):
        if "segs" not in ev:
            continue
        t0 = ev.get("tStartMs", 0) / 1000
        dur = ev.get("dDurationMs", 0) / 1000
        for sg in ev["segs"]:
            txt = (sg.get("utf8") or "").strip()
            if txt:
                raw.append((t0 + sg.get("tOffsetMs", 0) / 1000, txt))
                ends.append(t0 + dur)
    words = []
    for i, (t, txt) in enumerate(raw):
        nxt = raw[i + 1][0] if i + 1 < len(raw) else ends[i]
        e = min(nxt, ends[i]) if nxt > t else ends[i]
        words.extend(_spread(txt, t, max(e, t + 0.08)))
    return words


def load_transcript_file(path: Path) -> list[Word]:
    text = path.read_text(encoding="utf-8", errors="replace")
    if path.suffix == ".json":
        d = json.loads(text)
        if isinstance(d, dict) and "events" in d:
            return parse_json3(text)
        if isinstance(d, dict) and "words" in d:
            d = d["words"]
        if isinstance(d, dict) and "segments" in d:  # openai-whisper style output
            out = []
            for seg in d["segments"]:
                if seg.get("words"):
                    out += [Word(w["word"].strip(), w["start"], w["end"]) for w in seg["words"]]
                else:
                    out += _spread(seg["text"], seg["start"], seg["end"])
            return out
        return [Word(x["w"], float(x["s"]), float(x["e"])) for x in d]
    if path.suffix == ".json3":
        return parse_json3(text)
    return parse_srt_vtt(text)


def wav_samples(wav: Path):
    """16 kHz mono float32 samples from the WAV we extracted with ffmpeg (what Whisper expects)."""
    import numpy as np
    with wave.open(str(wav), "rb") as wf:
        if wf.getframerate() != 16000 or wf.getnchannels() != 1 or wf.getsampwidth() != 2:
            raise RuntimeError("audio must be 16 kHz mono 16-bit (re-extract it)")
        data = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16)
    return data.astype(np.float32) / 32768.0


# Rough speed of faster-whisper int8 on 4 vCPUs, in x real time (audio seconds per wall second), with VAD on.
# HEURISTIC from published faster-whisper benchmarks scaled to a 4-core runner; measure on the real runner and
# adjust (env CLIPPER_WHISPER_SPEED="small,5=2.5;small,1=3.6" overrides).
WHISPER_SPEED = {("small", 5): 3.0, ("small", 1): 4.2, ("base", 1): 8.0, ("tiny", 1): 14.0}


def whisper_plan(duration_s: float, cores: int | None = None, budget_s: float = 600.0, model: str = "small",
                 quality: str = "auto") -> dict:
    """Pick (model, beam) so transcription fits `budget_s` (default 10 min of a ~15 min total for a 33 min podcast).
    quality: best = small / beam 5 always, fast = small / beam 1 always, auto = best that fits the budget,
    stepping down to small beam 1, base, tiny. Only the default model ('small') is ever swapped."""
    cores = cores or os.cpu_count() or 4
    speed = dict(WHISPER_SPEED)
    for part in (os.environ.get("CLIPPER_WHISPER_SPEED") or "").split(";"):
        try:
            k, v = part.split("=")
            m, b = k.split(",")
            speed[(m.strip(), int(b))] = float(v)
        except ValueError:
            pass
    scale = min(cores, 8) / 4.0

    def est(m, b):
        return duration_s / max(speed.get((m, b), 3.0) * scale, 0.1)
    if model != "small" or quality == "best":
        return {"model": model, "beam": 5, "est_s": round(est(model, 5)), "reason": "as requested"}
    if quality == "fast":
        return {"model": "small", "beam": 1, "est_s": round(est("small", 1)), "reason": "fast quality"}
    for m, b in (("small", 5), ("small", 1), ("base", 1), ("tiny", 1)):
        if est(m, b) <= budget_s:
            return {"model": m, "beam": b, "est_s": round(est(m, b)),
                    "reason": "fits the time budget" if (m, b) != ("small", 5) else "best quality fits"}
    return {"model": "tiny", "beam": 1, "est_s": round(est("tiny", 1)), "reason": "very long audio"}


def audio_seconds(audio: Path) -> float:
    try:
        with wave.open(str(audio), "rb") as wf:
            return wf.getnframes() / float(wf.getframerate() or 16000)
    except Exception:  # noqa: BLE001
        return 0.0


def whisper_faster(audio: Path, args) -> list[Word]:
    fw = try_import("faster_whisper", "faster-whisper", not args.no_install)
    if not fw:
        raise RuntimeError("faster-whisper unavailable")
    last: Exception | None = None
    devices = [("cuda", "float16"), ("cpu", "int8")]
    if os.name == "nt" and os.environ.get("CLIPPER_WHISPER_DEVICE", "").lower() != "cuda":
        # Windows PCs with an NVIDIA card but without the cuBLAS/cuDNN DLLs load the model on cuda and then fail
        # (or abort the whole process) once transcription starts; CPU is reliable. Opt in: CLIPPER_WHISPER_DEVICE=cuda
        devices = devices[1:]
    plan = whisper_plan(audio_seconds(audio), model=args.model, quality=getattr(args, "whisper_quality", None) or "auto")
    args._beam = plan["beam"]
    for device, ctype in devices:
        try:
            kw = {"cpu_threads": os.cpu_count() or 4} if device == "cpu" else {}
            model = fw.WhisperModel(plan["model"], device=device, compute_type=ctype, **kw)
            log(f"whisper '{plan['model']}' beam {plan['beam']} on {device} (est {plan['est_s'] // 60} min, {plan['reason']})")
            return _whisper_words(model, audio, args)
        except Exception as e:  # noqa: BLE001  (cuda failures retry on cpu)
            last = e
    raise RuntimeError(f"could not run whisper model: {last}")


def _whisper_words(model, audio: Path, args) -> list[Word]:
    # Pass samples, not a path: decoding a path goes through PyAV, and PyAV 15 removed an argument
    # faster-whisper still passes (open(..., metadata_errors=...)), which breaks fresh installs on Windows.
    # VAD drops silence and music-only stretches before they reach the decoder (the biggest CPU saving on podcasts);
    # condition_on_previous_text=False stops a hallucination loop from spreading and is a little faster.
    segs, info = model.transcribe(wav_samples(audio), language=args.lang or None, word_timestamps=True,
                                  vad_filter=True, beam_size=int(getattr(args, "_beam", 5) or 5),
                                  vad_parameters={"min_silence_duration_ms": 400, "speech_pad_ms": 150},
                                  condition_on_previous_text=False,
                                  initial_prompt=getattr(args, "prompt", None) or None)
    words, last_print = [], 0.0
    total = getattr(info, "duration", 0) or 1
    for seg in segs:
        for w in seg.words or []:
            if w.word.strip():
                words.append(Word(w.word.strip(), float(w.start), float(w.end),
                                  round(float(getattr(w, "probability", 1.0) or 1.0), 3)))
        if seg.end - last_print > 120:
            last_print = seg.end
            log(f"transcribing ... {100 * seg.end / total:4.0f}%")
    return words


def merge_number_parts(words: list[Word]) -> list[Word]:
    """Whisper sometimes splits "$30,000" into "$30" + ",000" (or "3" ",000."): join them back into one word."""
    out: list[Word] = []
    for w in words:
        if out and re.match(r"^[,.]\d{3}\b", w.w) and re.search(r"\d$", out[-1].w):
            p = out[-1]
            out[-1] = Word(p.w + w.w, p.s, w.e, min(p.p, w.p))
        else:
            out.append(w)
    return out


def whisper_openai(audio: Path, args) -> list[Word]:
    import importlib
    whisper = importlib.import_module("whisper")  # only if the user already has it (torch is heavy)
    model = whisper.load_model(args.model)
    res = model.transcribe(str(audio), language=args.lang or None, word_timestamps=True)
    out = []
    for seg in res["segments"]:
        for w in seg.get("words", []):
            out.append(Word(w["word"].strip(), float(w["start"]), float(w["end"])))
    return out


def transcribe(video: Path, audio: Path | None, work: Path, args) -> tuple[list[Word], str]:
    cache = work / "transcript.json"
    if cache.exists() and not args.transcript:
        try:
            d = json.loads(cache.read_text(encoding="utf-8"))
            log(f"using cached transcript ({d['source']})", "ok")
            return merge_number_parts([Word(**w) for w in d["words"]]), d["source"]
        except Exception:
            pass

    attempts = []
    if args.transcript:
        attempts.append(("file", lambda: load_transcript_file(Path(args.transcript))))
    subs = {k: sorted(work.glob(f"subs_{k}.*")) for k in ("manual", "auto")}
    if subs["manual"]:
        attempts.append(("uploaded subtitles", lambda: load_transcript_file(subs["manual"][0])))
    if args.fast and subs["auto"]:
        attempts.append(("auto subtitles", lambda: load_transcript_file(subs["auto"][0])))
    if audio and not args.no_whisper:
        attempts.append(("faster-whisper", lambda: whisper_faster(audio, args)))
        attempts.append(("openai-whisper", lambda: whisper_openai(audio, args)))
    if subs["auto"] and not args.fast:
        attempts.append(("auto subtitles", lambda: load_transcript_file(subs["auto"][0])))

    for name, fn in attempts:
        try:
            log(f"transcript via {name} ...")
            words = merge_number_parts([w for w in fn() if w.w and w.e >= w.s])
            words.sort(key=lambda w: w.s)
            if len(words) >= 10:
                cache.write_text(json.dumps({"source": name, "words": [w.__dict__ for w in words]}), encoding="utf-8")
                log(f"transcript: {len(words)} words via {name}", "ok")
                return words, name
            log(f"{name} returned too little text", "warn")
        except Exception as e:  # noqa: BLE001
            log(f"{name} failed: {str(e).splitlines()[0][:160] if str(e) else type(e).__name__}", "warn")
    log("no transcript available: falling back to audio-energy clipping (no captions)", "warn")
    return [], "none"


# ---------------------------------------------------------------- audio energy

def extract_audio(video: Path, work: Path) -> Path | None:
    wav = work / "audio16k.wav"
    if wav.exists() and wav.stat().st_size > 1000:
        return wav
    r = run([Tools.ffmpeg, "-y", "-v", "error", "-i", str(video), "-vn", "-ac", "1", "-ar", "16000",
             "-c:a", "pcm_s16le", str(wav)])
    if r.returncode != 0 or not wav.exists():
        log(f"audio extraction failed: {r.stderr.strip()[-200:]}", "warn")
        return None
    return wav


def energy_curve(wav: Path | None, hop: float = 0.5):
    """Loudness per hop in z-scores; laughs, yelling and hype moments spike."""
    if not wav:
        return None
    try:
        import numpy as np
        with wave.open(str(wav), "rb") as wf:
            sr = wf.getframerate()
            data = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32)
        n = int(sr * hop)
        frames = len(data) // n
        if frames < 4:
            return None
        rms = np.sqrt((data[: frames * n].reshape(frames, n) ** 2).mean(axis=1) + 1e-6)
        db = 20 * np.log10(rms + 1e-6)
        voiced = db[db > np.percentile(db, 20)]
        mu, sd = float(voiced.mean()), float(voiced.std() or 1)
        return {"hop": hop, "z": ((db - mu) / sd).tolist(),
                "fine_hop": 0.1, "db_fine": audiofx.fine_db(data, sr, 0.1)}   # fine levels: music-under-speech check
    except Exception as e:  # noqa: BLE001
        log(f"energy analysis skipped: {e}", "warn")
        return None


def energy_stats(curve, s: float, e: float) -> tuple[float, float]:
    if not curve:
        return 0.0, 0.0
    z = curve["z"][int(s / curve["hop"]): max(int(e / curve["hop"]), int(s / curve["hop"]) + 1)]
    if not z:
        return 0.0, 0.0
    z_sorted = sorted(z)
    return statistics.fmean(z), z_sorted[int(len(z_sorted) * 0.9)]


# ---------------------------------------------------------------- scoring

from vocab import (MONEY, EMOTION, HOOKS, BAD_START, NUM_RE, TOPICS, norm, Sentence, sentences)  # noqa: E402,F401

@dataclass
class Clip:
    s: float
    e: float
    words: list = field(default_factory=list)
    score: float = 0.0
    reasons: list = field(default_factory=list)
    title: str = ""
    caption: str = ""
    hashtags: list = field(default_factory=list)
    topics: list = field(default_factory=list)

    @property
    def text(self) -> str:
        return " ".join(w.w for w in self.words)


def score_clip(c: Clip, curve, args) -> None:
    """Score one window (scoring.py has the features, weights and penalties; every one is plain English in c.reasons)."""
    dur = c.e - c.s
    mean_e, peak_e = energy_stats(curve, c.s, c.e)
    energy = (mean_e, peak_e) if curve else (None, None)
    music, gap_db = False, None
    if curve and curve.get("db_fine") and c.words:
        music, gap_db = audiofx.music_suspect(curve["db_fine"], curve["fine_hop"], c.words, c.s, c.e)
    c.score, c.reasons, c.features = scoring.score(c.words, dur, args, energy, getattr(args, "camp", None), music)  # type: ignore[attr-defined]
    toks = [norm(w.w) for w in c.words]
    c.topics = [k for k, (vocab, _) in TOPICS.items() if sum(t in vocab for t in toks) >= 2]
    c.music_gap_db = gap_db  # type: ignore[attr-defined]


def candidates_from_words(words: list[Word], args) -> list[Clip]:
    sents = sentences(words)
    out = []
    for i, st in enumerate(sents):
        if len(st.words) < 3:
            continue
        for j in range(i, len(sents)):
            dur = sents[j].e - st.s
            if dur > args.max:
                break
            if dur >= args.min:
                ws = [w for k in range(i, j + 1) for w in sents[k].words]
                out.append(Clip(st.s, sents[j].e, ws))
    if not out:  # sentences longer than --max: fall back to fixed windows
        step = max(args.min / 2, 5)
        t = words[0].s
        while t < words[-1].e:
            ws = [w for w in words if t <= w.s and w.e <= t + args.max]
            if ws:
                out.append(Clip(ws[0].s, ws[-1].e, ws))
            t += step
    return out


def candidates_from_energy(curve, duration: float, args) -> list[Clip]:
    length = (args.min + args.max) / 2
    out, t = [], 0.0
    while t + args.min <= duration:
        out.append(Clip(t, min(t + length, duration)))
        t += 5
    for c in out:
        mean_e, peak_e = energy_stats(curve, c.s, c.e)
        c.score = 50 + 15 * mean_e + 10 * peak_e
        c.reasons = ["audio energy"]
    return out


def pick(cands: list[Clip], k: int, gap: float = 3.0) -> list[Clip]:
    """Top-k windows that do not overlap, do not repeat each other's speech and do not all cover one topic."""
    return scoring.select(cands, k, gap)


select = scoring.select


# ---------------------------------------------------------------- packaging copy

from hooks import DANGLE_END, _headline  # noqa: E402,F401  (moved to hooks.py, kept importable from here)


def best_line(c: Clip) -> str:
    sents = sentences(c.words) if c.words else []
    if not sents:
        return ""
    def line_score(s: Sentence):
        toks = [norm(w.w) for w in s.words]
        return (sum(t in MONEY for t in toks) * 2 + sum(t in EMOTION for t in toks) * 1.5
                + len(NUM_RE.findall(s.text)) * 2 + sum(bool(re.search(p, s.text.lower())) for p in HOOKS)
                + (2 if s.s < c.s + 5 else 0) - abs(len(toks) - 9) * 0.15)
    ranked = sorted(sents[:8], key=line_score, reverse=True)
    for s_ in ranked:   # a headline needs substance: skip "For example" / "Honestly" fragments
        h = _headline(s_.text, strict=True)
        if len(h.split()) >= 5:
            return h
    return _headline(ranked[0].text)


def make_copy(c: Clip, meta: dict, camp: dict | None = None, history=None) -> None:
    """Title (file name / review list), the on-screen hook (c.hook, verbatim words only), the post caption body and
    3-5 rotated hashtags. `history` = the account's earlier captions (see captions.post_caption) so consecutive
    posts differ; without it the choice is still varied per clip (seeded by its text)."""
    if not c.title:
        line = best_line(c)
        c.title = (line.rstrip(".") if line else f"Moment at {hms(c.s)}").strip()
    if getattr(c, "hook", None) is None and c.words:
        c.hook = hooks.make_hook(c.words, camp, fallback=True)  # type: ignore[attr-defined]
    pool = ((camp or {}).get("caption") or {}).get("hashtags") or []
    if pool and c.words and not c.caption and not c.hashtags:
        info = capt.post_caption_info(c, camp, history)
        c.caption, c.hashtags = info["body"], info["hashtags"]
        c.angle = info["angle"]  # type: ignore[attr-defined]
    if not c.caption:
        who = meta.get("uploader") or ""
        c.caption = f"{c.title} {'— ' + who if who else ''}".strip()
    if not c.hashtags and pool:   # the campaign's own niche tags beat the generic topic tags
        c.hashtags = [t if t.startswith("#") else "#" + t for t in pool][:6]
    if not c.hashtags:
        tags = []
        for t in c.topics:
            tags += TOPICS[t][1]
        tags += ["#money", "#entrepreneur", "#finance", "#wealth", "#podcast"]
        c.hashtags = list(dict.fromkeys(tags))[:7]
    c.posts = cmp.platform_posts(camp, c.title, c.caption, c.hashtags)  # type: ignore[attr-defined]


# USD per million tokens (input, output). Unknown models are refused so spend stays bounded.
PRICES = {
    "claude-opus-5-5": (4.00, 20.00),
    "claude-sonnet-5-5": (2.00, 10.00),
    "claude-haiku-5-5": (0.10, 0.50),
}
AI_MAX_TOKENS = 4000


class SpendGuard:
    """Per-run spending cap for the standalone CLI; the pipeline supplies a ledger-backed guard."""

    def __init__(self, cap_usd: float):
        self.cap, self.spent = cap_usd, 0.0

    def allow(self, worst_usd: float) -> tuple[bool, str]:
        if self.cap <= 0:
            return False, "AI ranking is off (no budget approved; pass --ai-max-usd to allow spending)"
        if self.spent + worst_usd > self.cap:
            return False, f"AI call could cost up to ${worst_usd:.3f}; only ${self.cap - self.spent:.3f} of the budget left"
        return True, ""

    def record(self, model: str, usd: float, tokens_in: int, tokens_out: int, purpose: str) -> None:
        self.spent += usd


def call_cost(model: str, tokens_in: int, tokens_out: int) -> float:
    pin, pout = PRICES[model]
    return tokens_in / 1e6 * pin + tokens_out / 1e6 * pout


def ai_rerank(cands: list[Clip], meta: dict, args, guard=None) -> list[Clip]:
    guard = guard or SpendGuard(float(getattr(args, "ai_max_usd", 0) or 0))
    if args.no_ai or not cands:
        return cands
    if args.ai_model not in PRICES:
        log(f"AI ranking skipped: no price on file for '{args.ai_model}', so spend can't be capped "
            f"(known: {', '.join(PRICES)})", "warn")
        return cands
    pool = pick(cands, min(len(cands), max(args.clips * 3, 12)), gap=0)
    listing = "\n\n".join(f"[{i}] ({c.e - c.s:.0f}s) {c.text[:1500]}" for i, c in enumerate(pool))
    prompt = (
        "You help a clipper choose moments from a long video for a creator's official clipping campaign "
        "(vertical short-form clips). "
        f"Source: \"{meta.get('title', '')}\" by {meta.get('uploader') or 'unknown'}.\n"
        "Rate each candidate 0-100 as a standalone clip: does the opening make sense to a new viewer, is there "
        "one clear idea or story, does it end on a complete thought, and does it avoid needing missing context.\n"
        "Titles and captions must describe only what the speaker actually says. Do not invent or exaggerate "
        "claims, do not promise income or results, and attribute any earnings figures to the speaker.\n"
        "Return ONLY a JSON array: [{\"id\": int, \"score\": int, \"title\": \"<=8 word on-screen title\", "
        "\"caption\": \"one-sentence post caption\", \"hashtags\": [\"#tag\", ...]}]\n\n" + listing
    )
    worst = call_cost(args.ai_model, len(prompt) // 3 + 50, AI_MAX_TOKENS)
    ok, why = guard.allow(worst)
    if not ok:
        log(why, "info")
        return cands
    if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
        log("AI ranking skipped: no Anthropic credentials (set ANTHROPIC_API_KEY or use `pipeline.py secrets set`)",
            "warn")
        return cands
    anthropic = try_import("anthropic", "anthropic", not args.no_install)
    if not anthropic:
        return cands
    try:
        client = anthropic.Anthropic(max_retries=2)
        msg = client.messages.create(model=args.ai_model, max_tokens=AI_MAX_TOKENS,
                                     output_config={"effort": "low"},
                                     messages=[{"role": "user", "content": prompt}])
        u = msg.usage
        tin = (u.input_tokens or 0) + int(1.25 * (getattr(u, "cache_creation_input_tokens", 0) or 0)) \
            + int(0.1 * (getattr(u, "cache_read_input_tokens", 0) or 0))
        usd = call_cost(args.ai_model, tin, u.output_tokens or 0)
        guard.record(args.ai_model, usd, tin, u.output_tokens or 0, "rerank")
        log(f"Claude ranking cost ${usd:.4f} ({tin} in / {u.output_tokens} out tokens)")
        if msg.stop_reason == "refusal":
            raise RuntimeError("model declined the request")
        txt = "".join(getattr(b, "text", "") for b in msg.content if getattr(b, "type", "") == "text")
        data = json.loads(txt[txt.index("["): txt.rindex("]") + 1])
        for d in data:
            i = int(d.get("id", -1))
            if 0 <= i < len(pool):
                c = pool[i]
                c.score = 0.4 * c.score + 0.6 * float(d.get("score", c.score))
                c.title = str(d.get("title") or "")[:80]
                c.caption = str(d.get("caption") or "")[:300]
                tags = [t if t.startswith("#") else "#" + t for t in d.get("hashtags") or [] if isinstance(t, str)]
                c.hashtags = tags[:8]
                c.reasons = c.reasons + ["AI pick"]
        log(f"Claude re-ranked {len(pool)} candidates", "ok")
        return pool
    except Exception as e:  # noqa: BLE001
        log(f"AI ranking skipped ({type(e).__name__}: {redact(str(e))[:160]}); using heuristic scores", "warn")
        return cands


SECRET_RE = re.compile(r"(sk-ant-[A-Za-z0-9_\-]{6})[A-Za-z0-9_\-]+|((?:api[_-]?key|token|password|secret)[\"']?\s*[:=]\s*[\"']?)[^\s\"',}]+",
                       re.I)


def redact(text: str) -> str:
    text = str(text)
    for var in ("ZERNIO_API_KEY", "NTFY_TOPIC", "GH_TOKEN", "GITHUB_TOKEN"):   # the exact secret values, wherever they appear
        v = os.environ.get(var, "").strip()
        if len(v) >= 6:
            text = text.replace(v, "REDACTED")
    text = re.sub(r"(?i)\bBearer\s+[A-Za-z0-9._~+/=\-]+", "Bearer REDACTED", text)
    return SECRET_RE.sub(lambda m: (m.group(1) + "…REDACTED") if m.group(1) else (m.group(2) + "REDACTED"), text)


# ---------------------------------------------------------------- reframing

_FACE_WARNED = False


def face_centers(video: Path, info: MediaInfo, intervals: list[tuple[float, float]], args):
    """Per-interval horizontal face position (0..1) plus whether a single-subject crop is safe."""
    global _FACE_WARNED
    cv2 = try_import("cv2", "opencv-python-headless<5", not args.no_install)
    if cv2 is not None and not hasattr(cv2, "CascadeClassifier") and not args.no_install and not _FACE_WARNED:
        log("this OpenCV build has no face detector; installing opencv-python-headless<5 ...", "warn")
        if pip_install("opencv-python-headless<5", upgrade=True):
            log("restart the clipper to enable face-tracked crops (using blur layout for now)", "warn")
        _FACE_WARNED = True
    if not cv2 or not info.width or not hasattr(cv2, "CascadeClassifier"):
        return None, False
    try:
        casc = cv2.CascadeClassifier(os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml"))
        cap = cv2.VideoCapture(str(video))
        if not cap.isOpened() or casc.empty():
            return None, False
        centers, hits, samples, wide = [], 0, 0, 0
        for s, e in intervals:
            xs = []
            n = max(1, min(4, int(e - s)))
            for k in range(n):
                t = s + (e - s) * (k + 0.5) / n
                cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
                ok, frame = cap.read()
                if not ok:
                    continue
                samples += 1
                h, w = frame.shape[:2]
                sc = 480 / max(h, 1)
                small = cv2.cvtColor(cv2.resize(frame, (int(w * sc), 480)), cv2.COLOR_BGR2GRAY)
                faces = casc.detectMultiScale(small, 1.15, 5, minSize=(36, 36))
                if len(faces):
                    hits += 1
                    faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
                    fx = [(f[0] + f[2] / 2) / small.shape[1] for f in faces[:2]]
                    if len(fx) == 2 and abs(fx[0] - fx[1]) > 0.35 and faces[1][2] > 0.6 * faces[0][2]:
                        wide += 1
                    xs.append(fx[0])
            centers.append(statistics.median(xs) if xs else None)
        cap.release()
        known = [c for c in centers if c is not None]
        fallback = statistics.median(known) if known else 0.5
        filled, prev = [], fallback
        for c in centers:
            prev = c if c is not None else prev
            filled.append(prev)
        good = samples > 0 and hits / samples >= 0.5 and wide / max(hits, 1) < 0.4
        return filled, good
    except Exception as e:  # noqa: BLE001
        if not _FACE_WARNED:
            log(f"face tracking skipped: {e}", "warn")
            _FACE_WARNED = True
        return None, False


# ---------------------------------------------------------------- captions (ASS)

def ass_color(hex_rgb: str) -> str:
    h = hex_rgb.lstrip("#")
    return f"&H00{h[4:6]}{h[2:4]}{h[0:2]}".upper()


FONTS_DIR = Path(__file__).resolve().parent / "fonts"
BUNDLED_FONT = "Inter Display"     # fonts/InterDisplay-ExtraBold.otf: the same look on every machine
# TikTok keeps its own UI over the top ~220 px, the bottom ~420 px and the right ~140 px.
SAFE_TOP, SAFE_BOTTOM, SAFE_SIDE = 220, 420, 140


def pick_font(user_font: str | None) -> str:
    if user_font:
        return user_font
    prefs = ["Montserrat Black", "Montserrat ExtraBold", "Montserrat", "Anton", "Arial Black"]
    fc = shutil.which("fc-list")
    if fc:
        try:
            fams = run([fc, ":", "family"], timeout=20).stdout.lower()
            for f in prefs:
                if f.lower() in fams:
                    return f
        except Exception:
            pass
    if (FONTS_DIR / "InterDisplay-ExtraBold.otf").is_file():
        return BUNDLED_FONT   # libass finds it through fontsdir (see fonts_arg), no system install needed
    return "Arial Black" if sys.platform in ("win32", "darwin") else "DejaVu Sans"


def fonts_arg() -> str:
    """ass filter option that points libass at the bundled fonts (colon / backslash escaped for filtergraphs)."""
    if not FONTS_DIR.is_dir():
        return ""
    p = str(FONTS_DIR.resolve()).replace("\\", "/").replace(":", "\\:")
    return f":fontsdir={p}"


def ass_escape(s: str) -> str:
    return s.replace("\\", "/").replace("{", "(").replace("}", ")")


def wrap(text: str, width: int) -> str:
    lines, cur = [], ""
    for w in text.split():
        if cur and len(cur) + 1 + len(w) > width:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        lines.append(cur)
    return "\\N".join(lines[:3])


def _ass_ts(t: float) -> str:
    t = max(0.0, t)
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


def hook_layout(text: str, avail_w: int = 820) -> tuple[int, list[str]]:
    """(font size, lines) for the big hook title: the largest size whose balanced wrap fits in <= 3 lines."""
    for fs in (112, 102, 92, 84, 76, 68):
        per_line = max(6, int(avail_w / (0.60 * fs)))
        lines = hooks.hook_lines(text, per_line=per_line, max_lines=3)
        if len(lines) <= 3 and max(len(x) for x in lines) <= per_line + 1:
            return fs, lines
    lines = hooks.hook_lines(text, per_line=22, max_lines=3)
    return max(44, min(64, int(avail_w / (0.60 * max(len(x) for x in lines))))), lines


def caption_size(base: int, chars: int, avail_w: int = OUT_W - 2 * SAFE_SIDE) -> int:
    """Caption font size by length: shrinks so one line never runs into the TikTok side buttons."""
    return max(54, min(base, int(avail_w / (0.62 * max(chars, 1)))))


def caption_chunks(words: list[Word], per: int) -> list[list[Word]]:
    chunks, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        gap = words[i + 1].s - w.e if i + 1 < len(words) else 9
        chars = sum(len(x.w) + 1 for x in cur)
        if len(cur) >= per or chars > 16 or gap > 0.45 or re.search(r"[.?!,]$", w.w):
            chunks.append(cur)
            cur = []
    if cur:
        chunks.append(cur)
    return chunks


def write_ass(path: Path, words: list[Word], dur: float, title: str, font: str, args, top: int | None = None,
              hook_kind: str = "") -> None:
    """Caption file: the hook title for the first ~2.5 s, rolling karaoke captions, the disclosure and the tag.
    Layout (1080x1920): logo and disclosure under the TikTok top bar, the hook title below them, captions
    above the bottom 420 px. `top` = y just under the logo (default: the safe top)."""
    camp = getattr(args, "camp", None)
    st = capt.style_for(args, camp)
    hi, money, neg, white = (ass_color(st["highlight"]), ass_color(st["money"]), ass_color(st["negation"]),
                             ass_color("#FFFFFF"))
    bold = -1 if st.get("bold", True) else 0
    top = top if top is not None else SAFE_TOP + 12
    cap_y = SAFE_BOTTOM + 100                       # caption baseline margin: clear of the bottom UI
    base_size = int(st.get("font_size") or getattr(args, "font_size", 84))
    side = SAFE_SIDE
    hook_bg = ass_color(st.get("hook_bg", "#000000"))
    hdr = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {OUT_W}
PlayResY: {OUT_H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{font},{base_size},{white},{white},&H00000000,&H80000000,{bold},0,0,0,100,100,0,0,1,7,3,2,{side},{side},{cap_y},1
Style: Hook,{font},100,{white},{white},{hook_bg.replace('&H00', '&H30')},&H00000000,-1,0,0,0,100,100,0,0,3,22,0,8,100,100,{top + 78},1
Style: Disclose,{font},40,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,3,8,0,7,60,60,{top + 8},1
Style: Tag,{font},44,&H30FFFFFF,&H30FFFFFF,&H90000000,&H00000000,-1,0,0,0,100,100,0,0,1,3,0,9,60,{side},{top + 8},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    if getattr(args, "disclosure", None):
        lines.append(f"Dialogue: 2,{_ass_ts(0)},{_ass_ts(dur)},Disclose,,0,0,0,,{ass_escape(args.disclosure)}")
    if getattr(args, "watermark", None):
        lines.append(f"Dialogue: 2,{_ass_ts(0)},{_ass_ts(dur)},Tag,,0,0,0,,{ass_escape(args.watermark)}")
    if title and not getattr(args, "no_title", False):
        secs = float(st.get("hook_seconds") or 0)
        end = min(dur - 0.2, secs) if secs > 0 else dur
        txt = title.upper()
        fs, hl = hook_layout(txt)
        emph = hooks.emphasis(title)
        gi, parts = 0, []
        for line in hl:
            toks = []
            for w in line.split():
                toks.append(f"{{\\c{hi}}}{ass_escape(w)}{{\\c{white}}}" if gi in emph else ass_escape(w))
                gi += 1
            parts.append(" ".join(toks))
        anim = f"{{\\fs{fs}\\fad(110,230)\\fscx88\\fscy88\\t(0,170,\\fscx100\\fscy100)}}"
        lines.append(f"Dialogue: 1,{_ass_ts(0)},{_ass_ts(end)},Hook,,0,0,0,,{anim}{(chr(92) + 'N').join(parts)}")

    mask = bool(st.get("mask_profanity", True))
    extra_mask = st.get("mask_words") or []
    for ci, ch in enumerate(chunks := caption_chunks(words, getattr(args, "words_per_caption", 3))):
        chunk_end = ch[-1].e
        nxt = chunks[ci + 1][0].s if ci + 1 < len(chunks) else dur
        if nxt - chunk_end < 0.6:
            chunk_end = nxt
        shown = [capt.mask_word(x.w) if (mask and capt.is_profane(x.w, extra_mask)) else x.w for x in ch]
        plain = [re.sub(r"[,.;:]+$", "", t).upper() for t in shown]
        total_chars = sum(len(t) for t in plain) + len(plain) - 1
        two_lines = total_chars > 22 and len(plain) > 1       # at most 2 lines, split near the middle
        brk = -1
        if two_lines:
            run_, best = 0, 1e9
            for k in range(len(plain) - 1):
                run_ += len(plain[k]) + 1
                if abs(run_ - total_chars / 2) < best:
                    best, brk = abs(run_ - total_chars / 2), k
        longest = max(len(" ".join(plain[:brk + 1])), len(" ".join(plain[brk + 1:]))) if two_lines else total_chars
        fs = caption_size(base_size, longest)
        for wi, w in enumerate(ch):
            s = w.s
            e = ch[wi + 1].s if wi + 1 < len(ch) else chunk_end
            if e - s < 0.04:
                continue
            parts = []
            for k, x in enumerate(ch):
                txt = ass_escape(plain[k])
                nm = norm(x.w)
                if k == wi:
                    parts.append(f"{{\\c{hi}\\fscx112\\fscy112}}{txt}{{\\c{white}\\fscx100\\fscy100}}")
                elif nm in hooks.NEGATION:
                    parts.append(f"{{\\c{neg}}}{txt}{{\\c{white}}}")
                elif nm in MONEY or NUM_RE.search(x.w):
                    parts.append(f"{{\\c{money}}}{txt}{{\\c{white}}}")
                else:
                    parts.append(txt)
                if two_lines and k == brk:
                    parts.append("\\N")
            body = " ".join(parts).replace(" \\N ", "\\N")
            lines.append(f"Dialogue: 0,{_ass_ts(s)},{_ass_ts(min(e, dur))},Cap,,0,0,0,,{{\\fs{fs}}}{body}")
    path.write_text(hdr + "\n".join(lines) + "\n", encoding="utf-8")


# ---------------------------------------------------------------- planning one clip

def prepare_clip(c: Clip, args, st: dict | None = None) -> dict:
    """Decide, before rendering, what the viewer will see and hear (pure, no ffmpeg):
      start/end   the window after dropping host chatter / "okay so" at the very start (cold_open trim|teaser)
      words       the transcript without um / uh sounds (they are also cut from the audio)
      fillers     the removed filler Words (jump cuts avoid their audio)
      teaser      {"s","e","text"} the punchy late sentence played first (cold_open teaser only) or None
      hook        {"text","kind",...} the on-screen hook title (verbatim words only) or None
    """
    camp = getattr(args, "camp", None)
    st = st or capt.style_for(args, camp)
    mode = st.get("cold_open") or "trim"
    words = list(c.words)
    start, trimmed = c.s, 0
    if words and mode in ("trim", "teaser"):
        n = hooks.lead_in_trim(words, min_keep=max(8.0, 0.6 * float(getattr(args, "min", 15) or 15)))
        if n:
            trimmed = n
            words = words[n:]
            start = max(c.s, words[0].s - 0.12)
    clean, fillers = hooks.drop_fillers(words)
    teaser = hooks.cold_open_plan(clean, camp) if mode == "teaser" else None
    hook = getattr(c, "hook", None)
    if hook is None and clean:
        hook = hooks.make_hook(clean, camp, fallback=True)
    if hook is None and c.title and clean and hooks.grounded(c.title, clean, (camp or {}).get("spelling")):
        hook = {"text": c.title, "kind": hooks.hook_kind(c.title), "start": clean[0].s, "score": 0.0}
    return {"start": start, "end": c.e, "words": clean, "fillers": fillers, "teaser": teaser, "hook": hook,
            "trimmed_words": trimmed, "mode": mode}


# ---------------------------------------------------------------- rendering

LEAD, TAIL = 0.06, 0.14           # seconds kept before / after each spoken word at a jump cut
MAX_SEGMENTS = 80
MAX_SILENCE = 1.2                 # no silence longer than this stays in a clip unless the speaker meant it


def keep_intervals(c: Clip, jumpcut: bool, plan: dict | None = None) -> list[tuple[float, float]]:
    """Source intervals to keep, in order. Jump cuts remove dead air (gaps > 0.45 s keep ~0.2 s), um / uh sounds
    and anything the plan trimmed; the teaser (if any) comes first. Never keeps a silence over MAX_SILENCE."""
    words = plan["words"] if plan else c.words
    start = plan["start"] if plan else c.s
    fills = plan["fillers"] if plan else []
    teaser = plan.get("teaser") if plan else None
    head = [(teaser["s"], teaser["e"])] if teaser else []
    if not jumpcut or not words:
        return head + [(start, c.e)]
    spans = [(f.s, f.e) for f in fills]

    def blocked(a_end: float, b_start: float) -> bool:
        return any(a_end - 0.02 <= fs_ and fe_ <= b_start + 0.02 for fs_, fe_ in spans)

    for max_gap in (0.45, 0.7, 1.0, MAX_SILENCE):
        iv: list[list[float]] = []
        prev_w = None
        for w in words:
            s, e = max(start - 0.1, w.s - LEAD), min(c.e + 0.25, w.e + TAIL)
            for fs_, fe_ in spans:                  # keep the filler sound itself out of the pad
                if fe_ <= w.s + 0.01 and fe_ > s:
                    s = fe_ + 0.005
                if fs_ >= w.e - 0.01 and fs_ < e:
                    e = fs_ - 0.005
            if e - s < 0.05:
                continue
            if iv and s - iv[-1][1] <= max_gap and not blocked(prev_w.e, w.s):
                iv[-1][1] = max(iv[-1][1], e)
            else:
                iv.append([s, e])
            prev_w = w
        iv = [x for x in iv if x[1] - x[0] > 0.12]
        if iv and len(iv) <= MAX_SEGMENTS:
            iv[-1][1] = min(iv[-1][1] + 0.3, c.e + 0.5)
            return head + [(a, b) for a, b in iv]
    return head + [(start, c.e)]


def remap(words: list[Word], iv: list[tuple[float, float]]) -> list[Word]:
    out, offset = [], 0.0
    for a, b in iv:
        for w in words:
            if a <= w.s < b:
                out.append(Word(w.w, offset + w.s - a, offset + min(w.e, b) - a, w.p))
        offset += b - a
    return out


def pacing_report(words: list[Word], dur: float) -> dict:
    """Longest silence between spoken words in the output timeline (the first/last word to the clip edges included)."""
    if not words:
        return {"max_silence": dur, "ok": True}
    gaps = [words[0].s] + [b.s - a.e for a, b in zip(words, words[1:])] + [dur - words[-1].e]
    m = max(gaps)
    return {"max_silence": round(m, 2), "ok": m <= MAX_SILENCE + 0.05}


_FILTERS: dict = {}


def has_filter(name: str) -> bool:
    """Does this ffmpeg build have the filter? (a static build without afftdn must not break renders)"""
    if name not in _FILTERS:
        try:
            out = run([Tools.ffmpeg, "-hide_banner", "-filters"], timeout=30).stdout
            _FILTERS.update({n: bool(re.search(rf"\s{n}\s", out)) for n in
                             ("afftdn", "highpass", "acompressor", "equalizer", "loudnorm", "ass")})
        except Exception:  # noqa: BLE001
            _FILTERS.update({n: False for n in ("afftdn", "highpass", "acompressor", "equalizer")})
        _FILTERS.setdefault(name, False)
    return _FILTERS.get(name, False)


def build_graph(iv_rel, layout, info: MediaInfo, centers, captions: str | None, loudnorm: bool,
                logo: dict | None = None, mutes: list[tuple[float, float]] | None = None,
                punch: bool = False, clarity: bool = False):
    parts, labels = [], []
    n = len(iv_rel)
    for i, (a, b) in enumerate(iv_rel):
        trim = f"trim=start={a:.3f}:end={b:.3f},setpts=PTS-STARTPTS"
        if layout == "crop" and info.width and info.height:
            cw = min(info.width, int(info.height * 9 / 16) // 2 * 2)
            cx = (centers[i] if centers else 0.5) * info.width
            x = int(max(0, min(info.width - cw, cx - cw / 2))) // 2 * 2
            seg = (f"[0:v]{trim},crop={cw}:{info.height // 2 * 2}:{x}:0,"
                   f"scale={OUT_W}:{OUT_H},setsar=1")
        elif layout == "fit":
            seg = (f"[0:v]{trim},scale={OUT_W}:{OUT_H}:force_original_aspect_ratio=decrease,"
                   f"pad={OUT_W}:{OUT_H}:(ow-iw)/2:(oh-ih)/2:black,setsar=1")
        else:  # blur: full frame centered over a blurred, zoomed copy of itself
            seg = (f"[0:v]{trim},split=2[bg{i}][fg{i}];"
                   f"[bg{i}]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,"
                   f"boxblur=8:2,eq=brightness=-0.10,scale={OUT_W}:{OUT_H}[bb{i}];"
                   f"[fg{i}]scale={OUT_W}:{OUT_H}:force_original_aspect_ratio=decrease[fs{i}];"
                   f"[bb{i}][fs{i}]overlay=(W-w)/2:(H-h)/2,setsar=1")
        # punch-in on every second cut: the picture "moves" at each jump cut like a second camera (7% crop)
        if punch and n > 1 and i % 2 == 1 and layout != "fit" and (b - a) >= 0.7:
            seg += (f",crop=w=floor(iw/1.07/2)*2:h=floor(ih/1.07/2)*2:x=(in_w-out_w)/2:y=(in_h-out_h)*0.3,"
                    f"scale={OUT_W}:{OUT_H},setsar=1")
        parts.append(seg + f"[v{i}]")
        labels.append(f"[v{i}]")
        if info.has_audio:
            fd = min(0.012, (b - a) / 4)
            parts.append(f"[0:a]atrim=start={a:.3f}:end={b:.3f},asetpts=PTS-STARTPTS,"
                         f"afade=t=in:d={fd:.3f},afade=t=out:st={b - a - fd:.3f}:d={fd:.3f}[a{i}]")
            labels.append(f"[a{i}]")
    if info.has_audio:
        parts.append(f"{''.join(labels)}concat=n={n}:v=1:a=1[vc][ac]")
    else:
        parts.append(f"{''.join(labels)}concat=n={n}:v=1:a=0[vc]")
    if logo:  # brand logo on top of the video for the whole clip (input #1 is the image)
        y = logo["y"]
        parts.append(f"[1:v]scale={logo['w']}:-1,format=rgba[lg]")
        parts.append(f"[vc]fps={FPS}[vf];[vf][lg]overlay=x=(W-w)/2:y={y}:eof_action=repeat,format=yuv420p[vl]")
        vf = "[vl]null"
    else:
        vf = f"[vc]fps={FPS},format=yuv420p"
    if captions:
        vf += f",ass={captions}{fonts_arg()}"
    parts.append(vf + "[vo]")
    if info.has_audio:
        af = "[ac]aresample=48000"
        for a, b in (mutes or []):                       # profanity: silence the word, not the whole line
            af += f",volume=enable='between(t,{a:.3f},{b:.3f})':volume=0"
        if clarity:
            ch = audiofx.clarity_chain(has_filter)
            if ch:
                af += "," + ch
        if loudnorm:
            af += ",loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000"
        parts.append(af + "[ao]")
    return ";".join(parts)


def logo_height(path, width: int) -> int:
    try:
        from PIL import Image
        with Image.open(path) as im:
            return int(im.height * width / max(im.width, 1))
    except Exception:  # noqa: BLE001
        return int(width * 0.25)


def render(video: Path, info: MediaInfo, c: Clip, idx: int, outdir: Path, font: str, args,
           threads: int | None = None) -> Path | None:
    name = f"clip_{idx:02d}_{slugify(c.title, 40)}.mp4"
    out = outdir / name
    ass_name = f"captions_{idx:02d}.ass"
    camp = getattr(args, "camp", None)
    st = capt.style_for(args, camp)
    plan = prepare_clip(c, args, st)
    c.hook = plan["hook"]  # type: ignore[attr-defined]
    c.plan_notes = [n for n in (  # type: ignore[attr-defined]
        f"dropped {plan['trimmed_words']} lead-in words" if plan["trimmed_words"] else "",
        f"cut {len(plan['fillers'])} filler sounds" if plan["fillers"] else "",
        "teaser cold open" if plan["teaser"] else "") if n]

    jump_iv = keep_intervals(c, not args.no_jumpcuts, plan)
    plain_iv = [(c.s, c.e)]

    layout = args.layout
    centers_cache: dict = {}

    def centers_for(iv):
        key = tuple(iv)
        if key not in centers_cache:
            centers_cache[key] = face_centers(video, info, iv, args)
        return centers_cache[key]

    if layout == "auto":
        if info.width and info.height and info.width / info.height < 0.8:
            layout = "fit"
        else:
            _, good = centers_for(jump_iv)
            layout = "crop" if good else "blur"

    plans = []
    for iv in (jump_iv, plain_iv) if jump_iv != plain_iv else (plain_iv,):
        plans.append((iv, layout, True, True))
    plans += [(plain_iv, layout, False, True), (plain_iv, "blur", True, False),
              (plain_iv, "blur", False, False), (plain_iv, "fit", False, False)]
    seen = set()
    for iv, lay, captions, loud in plans:
        key = (tuple(iv), lay, captions, loud)
        if key in seen:
            continue
        seen.add(key)
        seek = max(0.0, min(a for a, _ in iv) - 1.0)      # a teaser interval can lie after the main one
        span = max(b for _, b in iv) - seek + 0.5
        iv_rel = [(a - seek, b - seek) for a, b in iv]
        total = sum(b - a for a, b in iv)
        ass_arg = None
        mutes = []
        rw = remap(plan["words"], iv)
        if st.get("mask_profanity", True):
            mutes = [(max(0.0, w.s - 0.03), w.e + 0.06) for w in rw if capt.is_profane(w.w, st.get("mask_words") or [])]
        logo = None
        top_y = SAFE_TOP + 12
        if getattr(args, "logo", None):
            lw = int(getattr(args, "logo_width", 300) or 300)
            lh = logo_height(Path(args.logo).expanduser(), lw)
            safe = bool(st.get("logo_safe"))   # style.logo_safe: keep the logo out of TikTok's top / bottom UI zones
            if getattr(args, "logo_position", "top") == "top":
                y = SAFE_TOP + 12 if safe else 40   # legacy: y=40 in the top bar
                top_y = max(SAFE_TOP + 12, y + lh + 14)
            else:
                y = OUT_H - SAFE_BOTTOM - lh - 20 if safe else OUT_H - 420   # legacy: y = H - 420
            logo = {"w": lw, "y": y}
        if captions and (c.words or getattr(args, "watermark", None) or getattr(args, "disclosure", None)):
            hook_txt = (plan["hook"] or {}).get("text") if plan["hook"] else ""
            write_ass(outdir / ass_name, rw, total, hook_txt if c.words else "", font, args, top_y,
                      (plan["hook"] or {}).get("kind", ""))
            ass_arg = ass_name
        centers = centers_for(iv)[0] if lay == "crop" else None
        graph = build_graph(iv_rel, lay, info, centers, ass_arg, loud, logo, mutes,
                            punch=len(iv) > 1 and not getattr(args, "no_punch", False),
                            clarity=loud and not getattr(args, "no_clarity", False))
        cmd = [Tools.ffmpeg, "-y", "-v", "error", "-ss", f"{seek:.3f}", "-t", f"{span:.3f}",
               "-i", str(video.resolve())]
        if logo:
            cmd += ["-i", str(Path(args.logo).expanduser().resolve())]
        cmd += ["-filter_complex", graph, "-map", "[vo]"]
        if info.has_audio:
            cmd += ["-map", "[ao]"]
        cmd += hygiene.encode_args(total, args.preset, args.crf, info.has_audio,
                                   float(getattr(args, "cap_mb", 0) or hygiene.CAP_MB_PER_30S), threads)
        cmd += [name]
        try:
            r = run(cmd, cwd=outdir, timeout=1800)
            ok = r.returncode == 0 and out.exists() and out.stat().st_size > 10_000
        except subprocess.TimeoutExpired:
            ok, r = False, None
        if ok:
            report = None
            if not getattr(args, "no_validate", False):
                cap_b = int(float(getattr(args, "cap_mb", 0) or hygiene.CAP_MB_PER_30S) * 1024 * 1024 * max(total, 30) / 30)
                if out.stat().st_size > cap_b * 1.1:
                    hygiene.shrink_to_cap(out, cap_b, ffmpeg=Tools.ffmpeg, preset=args.preset)
                report = hygiene.validate_output(out, ffmpeg=Tools.ffmpeg, ffprobe=Tools.ffprobe or "ffprobe",
                                                 expect_audio=info.has_audio, min_dur=3.0,
                                                 cap_mb_per_30s=float(getattr(args, "cap_mb", 0) or hygiene.CAP_MB_PER_30S))
                if not report["ok"]:
                    log(f"clip {idx:02d} rejected by output checks: {'; '.join(report['problems'])}", "err")
                    out.unlink(missing_ok=True)
                    c.hygiene = report  # type: ignore[attr-defined]
                    break
            desc = f"{lay}, {'jump-cut' if len(iv) > 1 else 'straight cut'}, " \
                   f"{'captions' if ass_arg else 'no captions'}"
            log(f"clip {idx:02d} rendered ({total:.0f}s, {desc}) -> {name}", "ok")
            c.render_info = desc  # type: ignore[attr-defined]
            c.tagged = bool(ass_arg)  # overlays (tag/disclosure) are in the caption file  # type: ignore[attr-defined]
            c.logo_on = bool(logo)  # type: ignore[attr-defined]
            c.out_duration = total  # type: ignore[attr-defined]
            c.hygiene = report  # type: ignore[attr-defined]
            c.mutes = mutes  # type: ignore[attr-defined]
            c.pacing = pacing_report(rw, total)  # type: ignore[attr-defined]
            if report and report["warnings"]:
                log(f"clip {idx:02d} notes: {'; '.join(report['warnings'])[:200]}", "warn")
            if not args.keep_ass:
                (outdir / ass_name).unlink(missing_ok=True)
            return out
        tail = (r.stderr.strip().splitlines()[-1] if r and r.stderr.strip() else "timeout/empty output")
        log(f"clip {idx:02d} render plan ({lay}, captions={captions}) failed: {tail[:200]}; trying simpler plan",
            "warn")
        out.unlink(missing_ok=True)
    log(f"clip {idx:02d} could not be rendered", "err")
    return None


def render_parallel(video: Path, info: MediaInfo, clips: list[Clip], outdir: Path, font: str, args,
                    workers: int | None = None) -> list[Path | None]:
    """Render several clips at once (safe: every clip has its own file names, nothing is shared but the source).
    On 4 vCPUs 2 workers x 2 x264 threads is about 1.4x faster than one render at a time (x264 does not scale
    linearly with cores on 1080x1920). workers=1 is the old sequential behaviour."""
    from concurrent.futures import ThreadPoolExecutor
    cores = os.cpu_count() or 2
    workers = workers or int(getattr(args, "render_workers", 0) or 0) or (2 if cores >= 4 else 1)
    workers = max(1, min(workers, len(clips) or 1))
    threads = max(1, cores // workers)

    def one(pair):
        i, c = pair
        try:
            return render(video, info, c, i, outdir, font, args, threads if workers > 1 else None)
        except Exception as e:  # noqa: BLE001
            log(f"clip {i} crashed: {e}", "err")
            return None
    if workers == 1:
        return [one(p) for p in enumerate(clips, 1)]
    with ThreadPoolExecutor(max_workers=workers) as ex:
        return list(ex.map(one, enumerate(clips, 1)))


# ---------------------------------------------------------------- report

def write_report(outdir: Path, meta: dict, clips: list[Clip], paths: list[Path | None], tsrc: str,
                 camp: dict | None = None) -> None:
    url = meta.get("webpage_url") or ""
    off = float(meta.get("section_offset") or 0)
    rows = []
    md = [f"# Clips: {meta.get('title', '')}", "",
          f"Source: {url or meta.get('title', '')}  ", f"Creator: {meta.get('uploader') or 'n/a'}  ",
          f"Transcript: {tsrc}  ", f"Generated by Money Clipper {VERSION}", ""]
    if camp:
        proj = ", ".join(f"{v // 1000}k views = ${cmp.payout(camp, v)[1]:,.2f}" for v in (10_000, 100_000, 1_000_000))
        md += [f"**Campaign:** {camp['name']} ({camp.get('marketplace') or 'direct'})  ",
               f"**Pays:** ${float(camp.get('cpm') or 0):.2f} per 1k views, {camp.get('fee_pct', 0):g}% fee"
               + (f", max ${camp['max_payout_per_clip']:,} per clip" if camp.get("max_payout_per_clip") else "")
               + f"  \n**Payout math (illustration, not a forecast; most clips get far fewer views):** {proj}  ",
               f"**Post to:** {', '.join(camp.get('platforms', []))}", ""]
        if camp.get("notes"):
            md += [f"> Brief: {camp['notes']}", ""]
        md += ["After posting, track each clip with `python tracker.py add <post-url> --campaign "
               f"\"{camp['_path']}\" --clip <file>`", ""]
    for i, (c, p) in enumerate(zip(clips, paths), 1):
        link = ""
        if url and ("youtube.com" in url or "youtu.be" in url):
            link = f"{url}{'&' if '?' in url else '?'}t={int(c.s + off)}"
        posts = getattr(c, "posts", {}) or cmp.platform_posts(None, c.title, c.caption, c.hashtags)
        out_dur = getattr(c, "out_duration", c.e - c.s)
        checks = cmp.compliance(camp, out_dur, c.text, posts, getattr(c, "tagged", False)) if p else []
        rows.append({"rank": i, "file": p.name if p else None, "start": round(c.s + off, 2),
                     "end": round(c.e + off, 2), "score": round(c.score, 1), "title": c.title,
                     "caption": c.caption, "hashtags": c.hashtags, "reasons": c.reasons, "posts": posts,
                     "compliant": all(ok for ok, _ in checks) if checks else None,
                     "checks": [{"ok": ok, "check": t} for ok, t in checks],
                     "render": getattr(c, "render_info", ""), "source_link": link, "transcript": c.text})
        md += [f"## {i}. {c.title}", "",
               f"- File: `{p.name if p else 'RENDER FAILED'}`",
               f"- Source time: {hms(c.s + off)} - {hms(c.e + off)}" + (f" ([open]({link}))" if link else ""),
               f"- Score: {c.score:.0f}/100 ({', '.join(c.reasons) or 'balanced'})"]
        if checks:
            bad = [t for ok, t in checks if not ok]
            md.append("- Campaign rules: " + ("PASS (" + "; ".join(t for _, t in checks) + ")" if not bad
                                              else "FIX BEFORE POSTING: " + "; ".join(bad)))
        md.append("")
        for plat, post in posts.items():
            md += [f"**{plat}**", "", "```"]
            md += [f"{post['title']}\n---\n{post['description']}"] if "title" in post else [post["caption"]]
            md += ["```", ""]
        if c.text:
            md += [f"> {c.text[:600]}{'...' if len(c.text) > 600 else ''}", ""]
    (outdir / "clips.json").write_text(json.dumps({"source": meta, "campaign": (camp or {}).get("name"),
                                                   "clips": rows}, indent=2), encoding="utf-8")
    (outdir / "CLIPS.md").write_text("\n".join(md), encoding="utf-8")


# ---------------------------------------------------------------- main flow

def process(source: str, args) -> int:
    log(f"source: {source}", "step")
    root = Path(args.out).expanduser().resolve()
    key = slugify(Path(source).stem if Path(source).exists() else re.sub(r"^https?://(www\.)?", "", source), 60)
    work = root / ".work" / key
    work.mkdir(parents=True, exist_ok=True)

    video, meta = fetch(source, work, args)
    info = probe(video)
    if info.duration <= 0:
        raise RuntimeError("could not read the video (corrupt or unsupported file)")
    log(f"{hms(info.duration)} long, {info.width}x{info.height}, audio={'yes' if info.has_audio else 'no'}")

    if info.duration < args.min:
        args.min = max(3.0, info.duration * 0.5)
        args.max = max(args.min + 1, min(args.max, info.duration))
        log(f"short source: clip length set to {args.min:.0f}-{args.max:.0f}s", "warn")

    audio = extract_audio(video, work) if info.has_audio else None
    words, tsrc = transcribe(video, audio, work, args)
    curve = energy_curve(audio)

    log("scoring moments ...", "step")
    if words:
        cands = candidates_from_words(words, args)
        for c in cands:
            score_clip(c, curve, args)
    else:
        cands = candidates_from_energy(curve, info.duration, args)
    if not cands:
        length = min(args.max, info.duration)
        cands = [Clip(0, length, [w for w in words if w.e <= length])]
    camp = getattr(args, "camp", None)
    if camp and words:
        kept = [c for c in cands if not cmp.banned_hit(camp, c.text)]
        if len(kept) < len(cands):
            log(f"dropped {len(cands) - len(kept)} windows containing claims the campaign bans", "warn")
        cands = kept or cands
    log(f"{len(cands)} candidate windows")
    cands = ai_rerank(cands, meta, args)
    chosen = pick(cands, args.clips)
    for c in chosen:
        make_copy(c, meta, camp)

    outdir = root / slugify(meta.get("title") or key, 60)
    outdir.mkdir(parents=True, exist_ok=True)
    font = pick_font(args.font)
    log(f"rendering {len(chosen)} clips -> {outdir}", "step")
    for i, c in enumerate(chosen, 1):
        log(f"#{i} {hms(c.s)}-{hms(c.e)} score {c.score:.0f}: {c.title}")
    paths = [None] * len(chosen) if args.dry_run else render_parallel(video, info, chosen, outdir, font, args)
    write_report(outdir, meta, chosen, paths, tsrc, camp)
    made = sum(p is not None for p in paths)
    log(f"done: {made}/{len(chosen)} clips in {outdir}  (posting copy: CLIPS.md)", "ok")
    if not args.keep_source and made and not Path(source).exists():
        for f in work.glob("source.*"):
            f.unlink(missing_ok=True)
        (work / "meta.json").unlink(missing_ok=True)
    return 0 if (made or args.dry_run) else 1


def selftest(args) -> int:
    """Synthetic end-to-end run: proves ffmpeg, reframing, captions and every fallback path work here."""
    tdir = Path(args.out).expanduser().resolve() / "_selftest"
    tdir.mkdir(parents=True, exist_ok=True)
    vid = tdir / "selftest_source.mp4"
    log("building synthetic 2-minute podcast video ...", "step")
    r = run([Tools.ffmpeg, "-y", "-v", "error",
             "-f", "lavfi", "-i", "testsrc2=size=1920x1080:rate=30:duration=120",
             "-f", "lavfi", "-i", "sine=frequency=220:sample_rate=48000:duration=120",
             "-filter_complex", "[1:a]volume='if(lt(mod(t,30),12),1.0,0.15)':eval=frame[a]",
             "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac",
             "-shortest", str(vid)])
    if r.returncode != 0:
        log(r.stderr, "err")
        return 1
    lines = [
        "Most people will never get rich because they trade time for money.",
        "Here's the truth about making your first million dollars.",
        "I went from $0 to $40k a month in revenue in eight months.",
        "The biggest mistake broke people make is buying liabilities.",
        "Nobody tells you that sales is the highest income skill.",
        "If you can close clients you will never be broke again.",
        "Stop investing in stocks you don't understand.",
        "Real estate gave me passive cashflow of $12,000 a month.",
        "Why do rich people keep buying assets in a recession?",
        "Because cash loses 7% a year to inflation, that's why.",
        "Let me tell you the secret to scaling an agency to seven figures.",
        "You need one offer, one avatar, and one channel. That's it.",
    ]
    srt, t, n = [], 2.0, 1
    while t < 116:
        for ln in lines:
            d = len(ln.split()) / 3.2
            if t + d > 118:
                break
            srt.append(f"{n}\n{hms(t)},{int(t % 1 * 1000):03d} --> {hms(t + d)},{int((t + d) % 1 * 1000):03d}\n{ln}\n")
            n += 1
            t += d + (1.4 if n % 4 == 0 else 0.25)
    (tdir / "selftest.srt").write_text("\n".join(srt), encoding="utf-8")
    ns = argparse.Namespace(**vars(args))
    ns.out, ns.clips, ns.min, ns.max, ns.no_ai = str(tdir / "out"), 3, 15.0, 40.0, True
    ns.transcript, ns.keep_source = str(tdir / "selftest.srt"), True
    ok = True
    for lay in ("auto", "crop", "blur", "fit"):
        ns.layout = lay
        sub = argparse.Namespace(**vars(ns))
        sub.out = str(tdir / "out" / lay)
        rc = process(str(vid), sub)
        ok &= rc == 0
    no_tx = argparse.Namespace(**vars(ns))
    no_tx.transcript, no_tx.no_whisper, no_tx.layout, no_tx.out = None, True, "auto", str(tdir / "out" / "energy")
    ok &= process(str(vid), no_tx) == 0
    mp4s = list((tdir / "out").rglob("clip_*.mp4"))
    for m in mp4s:
        i = probe(m)
        if not (i.width == OUT_W and i.height == OUT_H and i.duration > 5):
            log(f"bad output {m}: {i}", "err")
            ok = False
    log(f"selftest {'PASSED' if ok else 'FAILED'}: {len(mp4s)} clips verified 1080x1920", "ok" if ok else "err")
    return 0 if ok else 1


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Turn long money-space streams/podcasts into viral-ready 9:16 clips.",
                                formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    p.add_argument("sources", nargs="*", help="video URLs (YouTube/Twitch/Kick/X/...) or local files")
    p.add_argument("--from-file", help="text file with one URL/path per line")
    p.add_argument("-c", "--campaign", help="campaign brief JSON (see campaigns/_template.json)")
    p.add_argument("--latest", type=int, default=3,
                   help="for channel/playlist URLs: clip the N most recent videos")
    p.add_argument("--watermark", help="on-screen creator tag, e.g. @creator (campaigns often require it)")
    p.add_argument("--force", action="store_true", help="re-clip sources already done for this campaign")
    p.add_argument("-o", "--out", default="clips", help="output folder")
    p.add_argument("-n", "--clips", type=int, default=8, help="clips per source")
    p.add_argument("--min", type=float, default=20, help="min clip length (s)")
    p.add_argument("--max", type=float, default=55, help="max clip length (s)")
    p.add_argument("--layout", choices=["auto", "crop", "blur", "fit"], default="auto",
                   help="crop=face-tracked fill, blur=full frame on blurred bg, fit=letterbox")
    p.add_argument("--section", help="only download this part of a long stream, e.g. 1:00:00-2:30:00")
    p.add_argument("--transcript", help="use an existing .srt/.vtt/.json transcript")
    p.add_argument("--model", default="small", help="whisper model: tiny/base/small/medium/large-v3")
    p.add_argument("--lang", default=None, help="spoken language code (auto-detect if unset)")
    p.add_argument("--fast", action="store_true", help="prefer platform auto-captions over whisper")
    p.add_argument("--no-whisper", action="store_true", help="never run speech recognition")
    p.add_argument("--no-ai", action="store_true", help="never call Claude")
    p.add_argument("--ai-max-usd", type=float, default=0.0,
                   help="approve up to this much Claude API spend for this run (0 = AI ranking off)")
    p.add_argument("--ai-model", default=os.environ.get("CLIPPER_MODEL", "claude-opus-5-5"),
                   help=f"one of: {', '.join(PRICES)}")
    p.add_argument("--disclosure", help="on-screen disclosure text, e.g. '#ad' or 'Paid partnership'")
    p.add_argument("--logo", help="PNG logo burned in for the whole clip (campaigns that require the brand logo)")
    p.add_argument("--logo-position", choices=["top", "bottom"], default="top")
    p.add_argument("--logo-width", type=int, default=300)
    p.add_argument("--no-jumpcuts", action="store_true", help="keep pauses instead of cutting dead air")
    p.add_argument("--cold-open", choices=["off", "trim", "teaser"], default=None,
                   help="trim = drop host chatter at the start; teaser = also play the punchiest late line first")
    p.add_argument("--hook-seconds", type=float, default=None, help="how long the big hook title stays (0 = whole clip)")
    p.add_argument("--no-punch", action="store_true", help="no punch-in zoom on every second jump cut")
    p.add_argument("--no-clarity", action="store_true", help="skip the speech clean-up filters (denoise / compressor)")
    p.add_argument("--no-validate", action="store_true", help="skip the ffprobe / black-frame / silence checks")
    p.add_argument("--cap-mb", type=float, default=0, help="file size target per 30 s of video (default 8)")
    p.add_argument("--whisper-quality", choices=["auto", "best", "fast"], default="auto",
                   help="auto = best model/beam that transcribes within ~10 min (long podcasts get beam 1)")
    p.add_argument("--render-workers", type=int, default=0, help="clips rendered at once (default: 2 on 4+ cores)")
    p.add_argument("--no-title", action="store_true", help="no hook title bar")
    p.add_argument("--font", help="caption font family")
    p.add_argument("--font-size", type=int, default=84)
    p.add_argument("--highlight", default="#FFE600", help="active-word caption color")
    p.add_argument("--words-per-caption", type=int, default=3)
    p.add_argument("--preset", default="veryfast", help="x264 preset")
    p.add_argument("--crf", type=int, default=20)
    p.add_argument("--cookies", help="cookies.txt for sites that need login")
    p.add_argument("--cookies-from-browser", help="chrome/firefox/edge/safari")
    p.add_argument("--keep-source", action="store_true", help="keep downloaded video after clipping")
    p.add_argument("--keep-ass", action="store_true", help="keep caption .ass files for manual edits")
    p.add_argument("--dry-run", action="store_true", help="pick and report clips without rendering")
    p.add_argument("--no-install", action="store_true", help="never pip-install missing packages")
    p.add_argument("--selftest", action="store_true", help="run a synthetic end-to-end test")
    p.add_argument("--version", action="version", version=VERSION)
    return p


def expand_sources(sources: list[str], latest: int, args) -> list[str]:
    """Channel/playlist URLs become their newest N videos; campaigns usually want fresh uploads."""
    out = []
    for src in sources:
        if Path(src).exists() or not re.match(r"https?://", src):
            out.append(src)
            continue
        looks_list = re.search(r"/(@[^/]+|c/|channel/|user/|videos|streams|playlist|clips)", src) and \
            not re.search(r"watch\?v=|/videos/\d+|youtu\.be/|/shorts/", src)
        if not looks_list:
            out.append(src)
            continue
        try:
            yt_dlp = try_import("yt_dlp", "yt-dlp", not args.no_install)
            with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True, "extract_flat": "in_playlist",
                                   "playlistend": latest}) as ydl:
                info = ydl.extract_info(src, download=False)
            entries = [e for e in (info.get("entries") or []) if e]
            # a channel root lists tabs (Videos, Shorts, Live) as nested playlists: take the first real tab
            if entries and entries[0].get("_type") == "playlist" and not entries[0].get("duration"):
                with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True, "extract_flat": "in_playlist",
                                       "playlistend": latest}) as ydl:
                    info = ydl.extract_info(entries[0]["url"], download=False)
                entries = [e for e in (info.get("entries") or []) if e]
            urls = [e.get("url") or e.get("webpage_url") for e in entries[:latest]]
            urls = [u for u in urls if u]
            if urls:
                log(f"{src}: newest {len(urls)} videos", "ok")
                out += urls
                continue
        except Exception as e:  # noqa: BLE001
            log(f"could not list {src} ({str(e)[:100]}); trying it as a single video", "warn")
        out.append(src)
    return out


def main(argv=None) -> int:
    robust_stdio()
    pre, _ = build_parser().parse_known_args(argv)
    camp = None
    if pre.campaign:
        camp = cmp.load(pre.campaign)
        parser = build_parser()
        parser.set_defaults(**cmp.cli_defaults(camp))
        args = parser.parse_args(argv)
        args.out = str(Path(args.out) / cmp.slug(camp))
        log(f"campaign: {camp['name']} (${float(camp.get('cpm') or 0):.2f}/1k views)", "step")
    else:
        args = build_parser().parse_args(argv)
    args.camp = camp
    args.clips = max(1, args.clips)
    args.min = max(3.0, args.min)
    args.max = max(args.min + 2, args.max)
    args.words_per_caption = max(1, args.words_per_caption)
    Tools.setup(not args.no_install)
    if args.selftest:
        return selftest(args)
    sources = list(args.sources)
    if args.from_file:
        sources += [ln.strip() for ln in Path(args.from_file).read_text(encoding="utf-8-sig").splitlines()
                    if ln.strip() and not ln.strip().startswith("#")]
    if camp and not sources:
        sources = list(camp.get("sources") or [])
    if not sources:
        build_parser().print_help()
        return 2
    sources = expand_sources(sources, max(1, args.latest), args)
    done_file = Path(args.out).expanduser().resolve() / ".done.json"
    try:
        done = set(json.loads(done_file.read_text(encoding="utf-8"))) if done_file.exists() else set()
    except Exception:
        done = set()
    failures = 0
    for src in sources:
        if camp and src in done and not args.force:
            log(f"already clipped for this campaign, skipping (use --force to redo): {src}")
            continue
        try:
            sub = argparse.Namespace(**vars(args))  # per-source copy: short sources adjust min/max
            rc = process(src, sub)
            failures += rc != 0
            if rc == 0 and camp and not args.dry_run:
                done.add(src)
                done_file.parent.mkdir(parents=True, exist_ok=True)
                done_file.write_text(json.dumps(sorted(done), indent=1), encoding="utf-8")
        except KeyboardInterrupt:
            log("interrupted", "err")
            return 130
        except SystemExit:
            raise
        except Exception as e:  # noqa: BLE001
            failures += 1
            log(f"{src} failed: {redact(str(e))}", "err")
            if os.environ.get("CLIPPER_DEBUG"):
                traceback.print_exc()
    if len(sources) > 1:
        log(f"batch done: {len(sources) - failures}/{len(sources)} sources clipped", "ok" if not failures else "warn")
    return 1 if failures == len(sources) else 0


if __name__ == "__main__":
    sys.exit(main())
