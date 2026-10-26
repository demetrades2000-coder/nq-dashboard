"""B-roll / lifestyle clips: short non-speech videos (cars, watches, desks, charts) the campaign provides.

  lifestyle_allowed(campaign)           -> bool   only campaigns that allow lifestyle content get these clips
  safe_hooks(campaign)                  -> [str]  the hook bank: neutral lines that claim nothing
  broll_clip(src, out, campaign, ...)   -> Path | None

What the editor does (trending-style pacing, nothing deceptive):
  - cuts the source into ~2.6 s beats taken from different parts of it (fast, natural edits)
  - alternates 1.00x and 1.12x framing and a mild 1.15x speed on every third beat (a speed ramp, not slow-mo tricks)
  - hook title for the first 2.5 s (same big style as the speech clips), the brand logo for the whole video,
    the #ad disclosure and tag exactly like speech clips
  - the source audio is dropped (b-roll sound is often licensed music); a trending sound is added in the TikTok app
Never added: result claims, money amounts, "funded" promises, fake screenshots, fake reactions.
"""

from __future__ import annotations

import re
import shutil
import subprocess
from pathlib import Path

import campaign as cmp
import clipper as cl
import hygiene

BROLL_HOOKS = [
    "Plan the trade. Trade the plan.",
    "Discipline looks like this.",
    "Less noise. More process.",
    "The routine behind the screens.",
    "Built one session at a time.",
    "Consistency is boring. That is the point.",
    "Patience is a position.",
    "Same routine. Every session.",
    "Process over prediction.",
    "Slow is smooth. Smooth is steady.",
]
UNSAFE_HOOK = re.compile(r"[$\d%]|\b(guarantee\w*|risk[- ]free|rich|millionaire|free money|easy money|get funded|passive|"
                         r"profit\w*|winning|win rate|payout\w*|never lose|secret)\b", re.I)


def lifestyle_allowed(camp: dict | None) -> bool:
    c = camp or {}
    st = c.get("style") or {}
    return bool(st.get("lifestyle") or c.get("lifestyle") or "lifestyle" in [str(x).lower() for x in c.get("content_types", [])])


def safe_hooks(camp: dict | None) -> list[str]:
    """The campaign's own bank (style.broll_hooks) or the built-in one, minus anything with numbers, money words,
    promises or banned phrases."""
    bank = ((camp or {}).get("style") or {}).get("broll_hooks") or BROLL_HOOKS
    return [h for h in bank if h and not UNSAFE_HOOK.search(h) and not cmp.banned_hit(camp, h)]


def broll_clip(src, out, camp: dict | None, hook: str | None = None, seed: int = 0, target: float = 10.0,
               force: bool = False, args=None, font: str | None = None) -> Path | None:
    """Render one vertical b-roll clip. Returns None (and renders nothing) if the campaign does not allow lifestyle
    content, unless force=True. `hook` is checked against the safe-hook rules; an unsafe hook is replaced from the bank."""
    if not (force or lifestyle_allowed(camp)):
        return None
    src, out = Path(src), Path(out)
    info = cl.probe(src)
    if info.duration <= 0.5:
        return None
    bank = safe_hooks(camp) or BROLL_HOOKS
    if not hook or UNSAFE_HOOK.search(hook) or cmp.banned_hit(camp, hook):
        hook = bank[seed % len(bank)]
    total = max(7.0, min(float(target), 14.0))
    beat = 2.6
    n = max(3, round(total / beat))
    seg_len = total / n
    loop = info.duration < total
    parts, labels = [], []
    for i in range(n):
        a = (i * max(0.0, info.duration - seg_len) / max(1, n - 1)) if not loop else (i * seg_len) % max(info.duration - seg_len, 0.1)
        speed = 1.15 if i % 3 == 2 else 1.0
        zoom = 1.12 if i % 2 == 1 else 1.0
        src_len = seg_len * speed
        a = min(a, max(0.0, info.duration - src_len - 0.05))
        pan = (0.5, 0.35, 0.65)[i % 3]
        cw = f"if(gte(iw/ih\\,{1080 / 1920:.4f}),ih*{1080 / 1920:.4f},iw)"
        chain = (f"[0:v]trim=start={a:.3f}:end={a + src_len:.3f},setpts=(PTS-STARTPTS)/{speed},"
                 f"scale={cl.OUT_W}:{cl.OUT_H}:force_original_aspect_ratio=increase,"
                 f"crop={cl.OUT_W}:{cl.OUT_H}:x='(iw-{cl.OUT_W})*{pan}':y='(ih-{cl.OUT_H})/2'")
        if zoom > 1:
            chain += (f",crop=w=floor(iw/{zoom}/2)*2:h=floor(ih/{zoom}/2)*2:x=(in_w-out_w)/2:y=(in_h-out_h)/2,"
                      f"scale={cl.OUT_W}:{cl.OUT_H}")
        chain += f",fps={cl.FPS},setsar=1[s{i}]"
        parts.append(chain)
        labels.append(f"[s{i}]")
    parts.append("".join(labels) + f"concat=n={n}:v=1:a=0[vc]")
    work = out.parent
    work.mkdir(parents=True, exist_ok=True)
    # overlays through the same ASS writer as speech clips
    if args is None:
        p = cl.build_parser()
        p.set_defaults(**cmp.cli_defaults(camp or {"clip": {}, "on_screen": {}}))
        args = p.parse_args([])
        args.camp = camp
    ass = work / f"{out.stem}.ass"
    top = cl.SAFE_TOP + 12
    logo_in, logo = [], None
    if getattr(args, "logo", None) and Path(args.logo).is_file():
        lw = int(getattr(args, "logo_width", 300) or 300)
        lh = cl.logo_height(args.logo, lw)
        safe = bool(((camp or {}).get("style") or {}).get("logo_safe"))
        if getattr(args, "logo_position", "top") == "top":
            y = cl.SAFE_TOP + 12 if safe else 40
            top = max(cl.SAFE_TOP + 12, y + lh + 14)
        else:
            y = cl.OUT_H - cl.SAFE_BOTTOM - lh - 20 if safe else cl.OUT_H - 420
        logo = {"w": lw, "y": y}
        logo_in = ["-i", str(Path(args.logo).resolve())]
    cl.write_ass(ass, [], total, hook, font or cl.pick_font(getattr(args, "font", None)), args, top)
    if logo:
        parts.append(f"[1:v]scale={logo['w']}:-1,format=rgba[lg]")
        parts.append(f"[vc][lg]overlay=x=(W-w)/2:y={logo['y']}:eof_action=repeat,format=yuv420p[vl]")
        vf = "[vl]null"
    else:
        vf = "[vc]format=yuv420p"
    parts.append(vf + f",ass={ass.name}{cl.fonts_arg()}[vo]")
    cmd = [cl.Tools.ffmpeg, "-y", "-v", "error"]
    if loop:
        cmd += ["-stream_loop", "-1"]
    cmd += ["-i", str(src.resolve())] + logo_in + ["-filter_complex", ";".join(parts), "-map", "[vo]", "-t", f"{total:.2f}",
                                                    "-an"] + hygiene.encode_args(total, getattr(args, "preset", "veryfast"),
                                                                                  getattr(args, "crf", 20), False) + [out.name]
    r = subprocess.run(cmd, cwd=str(work), capture_output=True, text=True, errors="replace", timeout=900)
    ass.unlink(missing_ok=True)
    if r.returncode != 0 or not out.exists():
        out.unlink(missing_ok=True)
        return None
    rep = hygiene.validate_output(out, ffmpeg=cl.Tools.ffmpeg, ffprobe=cl.Tools.ffprobe or "ffprobe", expect_audio=False,
                                  min_dur=7.0)
    if not rep["ok"]:
        out.unlink(missing_ok=True)
        return None
    return out
