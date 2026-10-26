"""Audio clarity chain and background-music check.

  clarity_chain(has_filter)       -> ffmpeg audio filter string (gentle: speech first, no pumping)
  music_suspect(db, hop, words)   -> (bool, gap_db)   is something loud playing under / between the words?
  fine_db(samples, sr, hop)       -> list of dB per hop
"""

from __future__ import annotations

import math
import statistics


def clarity_chain(has_filter=lambda name: True, denoise: bool = True) -> str:
    """Gentle speech clean-up, ahead of loudnorm:
    high-pass 70 Hz (rumble / desk thumps), light FFT denoise (nr 6 dB: hiss without the watery artefacts),
    a 2:1 compressor (evens out leaning in / out of the mic), and +2 dB presence at 3.5 kHz for consonants.
    Filters the local ffmpeg build lacks are skipped, never fail the render."""
    parts = []
    if has_filter("highpass"):
        parts.append("highpass=f=70")
    if denoise and has_filter("afftdn"):
        parts.append("afftdn=nr=6:nf=-35:tn=0")
    if has_filter("acompressor"):
        parts.append("acompressor=threshold=-22dB:ratio=2:attack=20:release=250:makeup=2")
    if has_filter("equalizer"):
        parts.append("equalizer=f=3500:t=q:w=1.1:g=2")
    return ",".join(parts)


def fine_db(samples, sr: int, hop: float = 0.1) -> list[float]:
    """RMS level in dB per `hop` seconds (samples = numpy int16/float array)."""
    import numpy as np
    x = np.asarray(samples, dtype=np.float32)
    if x.size and np.abs(x).max() > 2.0:
        x = x / 32768.0
    n = max(1, int(sr * hop))
    frames = len(x) // n
    if frames == 0:
        return []
    rms = np.sqrt((x[: frames * n].reshape(frames, n) ** 2).mean(axis=1) + 1e-12)
    return (20 * np.log10(rms + 1e-9)).tolist()


def music_suspect(db: list[float], hop: float, words: list, t0: float, t1: float,
                  threshold_db: float = -16.0) -> tuple[bool, float | None]:
    """Compare the level BETWEEN words with the level OF words inside [t0, t1].
    In a quiet room the gaps sit 30-45 dB under the speech; with music or loud room noise they sit within ~15 dB.
    Needs >= 5 gap frames (0.5 s of real gaps) to say anything. Heuristic: a laugh, applause or a crowd also trips it."""
    if not db or not words:
        return False, None
    speech, gaps = [], []
    n = len(db)
    ws = [w for w in words if w.e > t0 and w.s < t1]
    if len(ws) < 6:
        return False, None
    mask = [False] * n
    for w in ws:
        a, b = int((w.s - 0.02) / hop), int((w.e + 0.02) / hop) + 1
        for i in range(max(0, a), min(n, b)):
            mask[i] = True
    # gaps: frames well inside pauses longer than 0.3 s (skip 0.1 s at each edge: word tails / breaths)
    for w0, w1 in zip(ws, ws[1:]):
        if w1.s - w0.e >= 0.3:
            a, b = int((w0.e + 0.1) / hop), int((w1.s - 0.1) / hop)
            for i in range(max(0, a), min(n, b)):
                if not mask[i]:
                    gaps.append(db[i])
    for i in range(max(0, int(t0 / hop)), min(n, int(t1 / hop))):
        if mask[i]:
            speech.append(db[i])
    if len(gaps) < 5 or len(speech) < 10:
        return False, None
    diff = statistics.median(gaps) - statistics.median(speech)
    return diff > threshold_db, round(diff, 1)
