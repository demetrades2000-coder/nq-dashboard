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
    disc = c.get("disclosure") or {}
    if disc.get("on_screen"):
        d["disclosure"] = disc["on_screen"]
    if on.get("logo"):
        logo = Path(on["logo"]).expanduser()
        if not logo.is_absolute():  # relative to the campaign file
            logo = Path(c.get("_path", ".")).parent / logo
        d["logo"] = str(logo)
        d["logo_position"] = on.get("logo_position", "top")
        d["logo_width"] = int(on.get("logo_width", 300))
    if c.get("language"):
        d["lang"] = c["language"]
    return d


def banned_hit(c: dict | None, text: str) -> str | None:
    if not c:
        return None
    low = text.lower()
    # whole words only: "ass" must not block "class" or "pass", "hoe" must not block "shoe"
    return next((b for b in c.get("banned_phrases") or []
                 if b and re.search(r"(?<![a-z0-9])" + re.escape(b.lower()) + r"(?![a-z0-9])", low)), None)


def _tags(items) -> list[str]:
    out = []
    for t in items or []:
        t = str(t).strip()
        if t:
            out.append(t if t.startswith(("#", "@")) else "#" + t)
    return out


def mentions_for(c: dict | None, platform: str) -> list[str]:
    """required_mentions is a list (same tag everywhere) or a {platform: [tags]} map (handles differ per app)."""
    m = ((c or {}).get("caption") or {}).get("required_mentions")
    if isinstance(m, dict):
        return _tags(m.get(platform) or m.get("default") or [])
    return _tags(m)


def automation_allowed(c: dict) -> bool | None:
    """True only when the brief records that the campaign's rules allow automated/AI clipping tools."""
    v = c.get("automation_allowed")
    return v if isinstance(v, bool) else None


def platform_posts(c: dict | None, title: str, caption: str, hashtags: list[str]) -> dict:
    """Ready-to-paste caption per platform. The disclosure leads (so it shows before "...more") and the
    disclosure and required text/tags are never trimmed; only the free caption is cut to fit."""
    cap = (c or {}).get("caption", {})
    disc = (((c or {}).get("disclosure") or {}).get("caption") or "").strip()
    req_tags = _tags(cap.get("required_hashtags"))
    req_text = (cap.get("required_text") or "").strip()
    platforms = (c or {}).get("platforms") or ["tiktok", "instagram", "youtube", "x"]
    posts = {}
    for p in platforms:
        limit, max_tags = PLATFORM_LIMITS.get(p, (2200, 8))
        tags = list(dict.fromkeys(req_tags + [h for h in hashtags if h not in req_tags]))
        tags = tags[:max(max_tags, len(req_tags))]
        mentions = mentions_for(c, p)
        order = [req_text, " ".join(tags), " ".join(mentions)] if cap.get("mentions_last") else \
            [req_text, " ".join(mentions), " ".join(tags)]   # mentions_last: briefs that say "end every caption with the tags"
        tail = "\n\n".join(x for x in order if x)
        if p == "youtube":
            head = " ".join(x for x in [disc, title] if x)
            if "#shorts" not in head.lower():
                head += " #shorts"
            if len(head) > 100:
                head = head[:100 - 8].rstrip() + "… #shorts"
            body = "\n\n".join(x for x in [disc, caption, tail] if x)
            posts[p] = {"title": head, "description": body[:5000]}
            continue
        lead = f"{disc} " if disc else ""
        room = limit - len(lead) - (len(tail) + 2 if tail else 0)
        free = caption if len(caption) <= room else caption[:max(0, room - 3)].rstrip() + "..."
        posts[p] = {"caption": "\n\n".join(x for x in [(lead + free).strip(), tail] if x)[:limit]}
    return posts


def compliance(c: dict | None, duration: float, transcript: str, posts: dict, watermark_on: bool,
               logo_on: bool = False) -> list[tuple[bool, str]]:
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
    for need in _tags(cap.get("required_hashtags")):
        ok = all(need.lower() in json.dumps(v).lower() for v in posts.values())
        checks.append((ok, f"caption includes {need}"))
    for plat, post in posts.items():
        for need in mentions_for(c, plat):
            checks.append((need.lower() in json.dumps(post).lower(), f"{plat} caption tags {need}"))
    if cap.get("required_text"):
        ok = all(cap["required_text"].lower() in json.dumps(v).lower() for v in posts.values())
        checks.append((ok, "caption includes required text"))
    if on.get("watermark"):
        checks.append((watermark_on, f"on-screen tag '{on['watermark']}'"))
    if on.get("logo"):
        checks.append((logo_on, "brand logo on screen for the whole clip"))
    disc = c.get("disclosure") or {}
    if disc.get("caption"):
        ok = all(disc["caption"].lower() in json.dumps(v).lower() for v in posts.values())
        checks.append((ok, f"caption disclosure '{disc['caption']}'"))
    if disc.get("on_screen"):
        checks.append((watermark_on, f"on-screen disclosure '{disc['on_screen']}'"))
    if not disc and c.get("permission"):
        checks.append((False, "no disclosure configured: confirm the campaign's FTC wording "
                              "(Whop's Content Rewards terms put disclosure on the clipper)"))
    return checks


class PermissionError_(Exception):
    """Raised when a source is not covered by the campaign's recorded permission."""


def _norm_url(u: str) -> str:
    u = re.sub(r"^https?://", "", u.strip().lower())
    u = re.sub(r"^(www\.|m\.)", "", u)
    return u.rstrip("/")


def permission_problems(c: dict, max_age_days: int = 30) -> list[str]:
    """What's missing before a campaign may be used. Empty list = OK."""
    import datetime as dt
    perm = c.get("permission")
    if not perm:
        return ["campaign has no 'permission' block: record where the creator/brand authorizes clipping "
                "(program, campaign_url, verified_on, evidence, allowed_sources)"]
    probs = []
    for k in ("program", "campaign_url", "verified_on", "evidence", "allowed_sources"):
        if not perm.get(k):
            probs.append(f"permission.{k} is empty")
        elif "TODO" in json.dumps(perm.get(k)):
            probs.append(f"permission.{k} still has a TODO: fill it in from the live campaign page")
    rest = {k: v for k, v in c.items() if k not in ("notes", "permission") and not k.startswith("_")}
    for path in _todo_paths(rest):
        probs.append(f"{path} still says TODO: fill it in from the campaign page")
    if perm.get("verified_on"):
        try:
            age = (dt.date.today() - dt.date.fromisoformat(perm["verified_on"])).days
            if age > max_age_days:
                probs.append(f"permission verified {age} days ago: re-check the campaign is still active and its "
                             f"rules unchanged, then update verified_on")
            if age < 0:
                probs.append("permission.verified_on is in the future")
        except ValueError:
            probs.append("permission.verified_on must be YYYY-MM-DD")
    return probs


def _todo_paths(obj, prefix: str = "") -> list[str]:
    if isinstance(obj, dict):
        return [p for k, v in obj.items() for p in _todo_paths(v, f"{prefix}.{k}" if prefix else k)]
    if isinstance(obj, list):
        return [p for i, v in enumerate(obj) for p in _todo_paths(v, f"{prefix}[{i}]")]
    return [prefix] if isinstance(obj, str) and "TODO" in obj else []


def source_allowed(c: dict, url_or_path: str, meta: dict | None = None) -> tuple[bool, str]:
    """Is this source inside the campaign's allowed_sources? Checks the URL, then the video's channel."""
    allowed = [a for a in (c.get("permission") or {}).get("allowed_sources", []) if a]
    cands = [url_or_path]
    if meta:
        cands += [meta.get(k) or "" for k in ("channel_url", "uploader_url", "webpage_url")]
    for a in allowed:
        if a.startswith("file:"):
            root = Path(a[5:]).expanduser()
            if not root.is_absolute() and c.get("_path"):  # relative to the campaign file
                root = Path(c["_path"]).parent / root
            root = root.resolve()
            p = Path(url_or_path).expanduser()
            if p.exists() and (p.resolve() == root or root in p.resolve().parents):
                return True, a
            continue
        na = _norm_url(a)
        for x in cands:
            if x:
                nx = _norm_url(x)
                if nx == na or (nx.startswith(na) and nx[len(na)] in "/?&#"):
                    return True, a
        if meta:  # YouTube channel handles: allow "youtube.com/@name" to match uploader_id "@name"
            handle = na.split("/")[-1]
            if handle.startswith("@") and handle == str(meta.get("uploader_id") or "").lower():
                return True, a
    return False, ("not in this campaign's allowed_sources " + json.dumps(allowed))


def payout(c: dict, views: int) -> tuple[float, float]:
    """(gross, net) for one clip at a view count, applying cap, minimum and marketplace fee."""
    if views < int(c.get("min_views") or 0):  # per-post view gate (e.g. 10,000 views before it earns)
        return 0.0, 0.0
    gross = views / 1000 * float(c.get("cpm") or 0)
    cap = float(c.get("max_payout_per_clip") or 0)
    if cap:
        gross = min(gross, cap)
    if gross < float(c.get("min_payout") or 0):
        gross = 0.0
    return gross, gross * (1 - float(c.get("fee_pct") or 0) / 100)


def slug(c: dict) -> str:
    return re.sub(r"[^a-z0-9]+", "-", c["name"].lower()).strip("-")[:50] or "campaign"


def fix_spelling(words: list, mapping: dict | None) -> list:
    """Correct names the recognizer gets wrong, from the campaign's "spelling" map ({"Trade Ever": "Tradever"}).
    Keys may span several words; matching ignores case and punctuation; the replacement keeps the last word's
    trailing punctuation and spans the matched words' timing."""
    if not mapping or not words:
        return words
    import dataclasses
    def key(t):
        return re.sub(r"[^a-z0-9']", "", t.lower())
    rules = sorted(((k.split(), v) for k, v in mapping.items() if k.split()), key=lambda kv: -len(kv[0]))
    out, i = [], 0
    while i < len(words):
        for src, dst in rules:
            n = len(src)
            if i + n <= len(words) and all(key(words[i + j].w) == key(src[j]) for j in range(n)):
                last = words[i + n - 1]
                tail = re.search(r"[^\w']*$", last.w).group(0)
                out.append(dataclasses.replace(words[i], w=dst + tail, e=last.e, p=1.0))  # a known name: certain
                i += n
                break
        else:
            out.append(words[i])
            i += 1
    return out


def spelling_prompt(c: dict | None) -> str:
    """Names to prime the recognizer with (the campaign's correct spellings)."""
    vals = list(dict.fromkeys(((c or {}).get("spelling") or {}).values()))
    return ", ".join(vals)
