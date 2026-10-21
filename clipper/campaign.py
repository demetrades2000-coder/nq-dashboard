"""
Campaign profiles for paid clipping marketplaces (Whop Content Rewards, Vyro,
Clipping.net, direct creator deals).

A campaign JSON captures the brief: what to clip, the length, the required
caption text and on-screen tag, the banned claims, and how it pays. The clipper
uses it to make compliant clips, and the tracker uses it to estimate payouts.
See campaigns/_template.json.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

PLATFORM_LIMITS = {
    # name: (caption char limit, max hashtags)
    "tiktok": (2200, 8),
    "instagram": (2200, 30),
    "youtube": (100, 3),   # Shorts title; the description carries the rest
    "x": (280, 3),
}

DEFAULT_BANNED = [
    # Finance briefs routinely ban these, and platforms flag them as scams.
    "guaranteed returns", "guaranteed profit", "risk free", "risk-free", "get rich quick",
    "this is financial advice", "100% win rate", "can't lose", "cannot lose",
]


def load(path: str) -> dict:
    c = json.loads(Path(path).read_text(encoding="utf-8"))
    c.setdefault("name", Path(path).stem)
    c.setdefault("marketplace", "")
    c.setdefault("cpm", 0.0)
    c.setdefault("fee_pct", 10.0 if c.get("marketplace", "").lower() == "whop" else 0.0)
    c.setdefault("max_payout_per_clip", 0)
    c.setdefault("min_payout", 0)
    c.setdefault("platforms", ["tiktok", "instagram", "youtube"])
    c.setdefault("sources", [])
    c.setdefault("clip", {})
    c.setdefault("caption", {})
    c.setdefault("on_screen", {})
    c["banned_phrases"] = [b.lower() for b in c.get("banned_phrases", [])] + (
        [] if c.get("allow_default_banned") is False else DEFAULT_BANNED)
    c["_path"] = str(Path(path).resolve())
    return c


def cli_defaults(c: dict) -> dict:
    """Campaign values become argparse defaults, so explicit CLI flags still win."""
    clip, on = c["clip"], c["on_screen"]
    d = {}
    for src, dst in (("min", "min"), ("max", "max"), ("count", "clips"), ("layout", "layout"),
                     ("words_per_caption", "words_per_caption"), ("latest", "latest")):
        if src in clip:
            d[dst] = clip[src]
    if clip.get("title") is False:
        d["no_title"] = True
    if clip.get("jumpcuts") is False:
        d["no_jumpcuts"] = True
    if on.get("highlight"):
        d["highlight"] = on["highlight"]
    if on.get("font"):
        d["font"] = on["font"]
    if on.get("watermark"):
        d["watermark"] = on["watermark"]
    if c.get("language"):
        d["lang"] = c["language"]
    return d


def banned_hit(c: dict | None, text: str) -> str | None:
    if not c:
        return None
    low = text.lower()
    return next((b for b in c["banned_phrases"] if b and b in low), None)


def _tags(items) -> list[str]:
    out = []
    for t in items or []:
        t = str(t).strip()
        if t:
            out.append(t if t.startswith(("#", "@")) else "#" + t)
    return out


def platform_posts(c: dict | None, title: str, caption: str, hashtags: list[str]) -> dict:
    """Ready-to-paste caption per platform, with the campaign's required text/tags first."""
    cap = (c or {}).get("caption", {})
    req_tags = _tags(cap.get("required_hashtags"))
    mentions = _tags(cap.get("required_mentions"))
    req_text = (cap.get("required_text") or "").strip()
    platforms = (c or {}).get("platforms") or ["tiktok", "instagram", "youtube", "x"]
    posts = {}
    for p in platforms:
        limit, max_tags = PLATFORM_LIMITS.get(p, (2200, 8))
        tags = list(dict.fromkeys(req_tags + [h for h in hashtags if h not in req_tags]))
        tags = tags[:max(max_tags, len(req_tags))]
        if p == "youtube":
            head = title if "#shorts" in title.lower() else f"{title} #shorts"
            body = " ".join(x for x in [caption, req_text, " ".join(mentions), " ".join(tags)] if x)
            posts[p] = {"title": head[:100], "description": body[:5000]}
            continue
        parts = [caption, req_text, " ".join(mentions), " ".join(tags)]
        text = "\n\n".join(x for x in parts if x)
        if len(text) > limit:  # trim the free caption first; required pieces must survive
            fixed = "\n\n".join(x for x in parts[1:] if x)
            room = max(0, limit - len(fixed) - 3)
            text = (caption[:room].rstrip() + "...\n\n" + fixed) if room else fixed[:limit]
        posts[p] = {"caption": text}
    return posts


def compliance(c: dict | None, duration: float, transcript: str, posts: dict, watermark_on: bool) -> list[tuple[bool, str]]:
    if not c:
        return []
    clip, cap, on = c["clip"], c["caption"], c["on_screen"]
    checks = []
    lo, hi = clip.get("min"), clip.get("max")
    if lo is not None or hi is not None:
        ok = (lo is None or duration >= lo - 0.5) and (hi is None or duration <= hi + 0.5)
        checks.append((ok, f"length {duration:.0f}s within {lo or 0}-{hi or 'any'}s"))
    hit = banned_hit(c, transcript)
    checks.append((hit is None, "no banned claims" if hit is None else f"contains banned phrase '{hit}'"))
    for need in _tags(cap.get("required_hashtags")) + _tags(cap.get("required_mentions")):
        ok = all(need.lower() in json.dumps(v).lower() for v in posts.values())
        checks.append((ok, f"caption includes {need}"))
    if cap.get("required_text"):
        ok = all(cap["required_text"].lower() in json.dumps(v).lower() for v in posts.values())
        checks.append((ok, "caption includes required text"))
    if on.get("watermark"):
        checks.append((watermark_on, f"on-screen tag '{on['watermark']}'"))
    return checks


def payout(c: dict, views: int) -> tuple[float, float]:
    """(gross, net) for one clip at a view count, applying cap, minimum and marketplace fee."""
    gross = views / 1000 * float(c.get("cpm") or 0)
    cap = float(c.get("max_payout_per_clip") or 0)
    if cap:
        gross = min(gross, cap)
    if gross < float(c.get("min_payout") or 0):
        gross = 0.0
    return gross, gross * (1 - float(c.get("fee_pct") or 0) / 100)


def slug(c: dict) -> str:
    return re.sub(r"[^a-z0-9]+", "-", c["name"].lower()).strip("-")[:50] or "campaign"
