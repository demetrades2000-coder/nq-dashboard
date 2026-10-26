"""
Last look before a clip goes out. The checks that matter most are repeated against the exact text that is about to be
posted, because things change between clipping and posting (a brief edited, an account re-assigned, a campaign paused):

  hold (the clip itself is wrong, a human must look; it shows in the dashboard with the reason)
    * required hashtags / @mentions missing, or not at the very END of the caption when the brief says so
    * the #ad disclosure missing
    * a banned phrase in the caption, title or what is said in the clip
    * the brand logo check failed (when the clip carries one) or the length is outside the campaign's min / max
    * the same moment was already posted (a near-identical transcript): the brief forbids the same clip twice
  skip (the clip is fine, but not here / not now: it simply waits)
    * the campaign is not active, or the account is not one allocated to this campaign

Evidence that is simply missing (a clip with no stored logo check, a file ffprobe cannot read) never blocks a post;
only evidence that something is wrong does.
"""

from __future__ import annotations

import json
import re

import campaign as cmp

HOLD_PREFIX = "Recheck before posting: "
DUPLICATE_SIMILARITY = 0.8


def _has_tag(text: str, tag: str) -> bool:
    return bool(re.search(r"(?<![\w#@])" + re.escape(tag.lower()) + r"(?![\w])", text.lower()))


def caption_problems(c: dict, caption: str, platform: str = "tiktok") -> list[str]:
    out = []
    cap = (c.get("caption") or {})
    for tag in cmp._tags(cap.get("required_hashtags")):
        if not _has_tag(caption, tag):
            out.append(f"required hashtag {tag} is missing")
    mentions = cmp.mentions_for(c, platform)
    for m in mentions:
        if not _has_tag(caption, m):
            out.append(f"required tag {m} is missing")
    if mentions and cap.get("mentions_last") and all(_has_tag(caption, m) for m in mentions):
        tail = [t.lower() for t in caption.split()[-len(mentions):]]
        if set(tail) != {m.lower() for m in mentions}:
            out.append("the required tags must be the very end of the caption")
    disc = ((c.get("disclosure") or {}).get("caption") or "").strip()
    if disc and not _has_tag(caption, disc):
        out.append(f"disclosure {disc} is missing")
    if cap.get("required_text") and cap["required_text"].lower() not in caption.lower():
        out.append("required caption text is missing")
    hit = cmp.banned_hit(c, caption)
    if hit:
        out.append(f"banned phrase '{hit}' in the caption")
    return out


def length_problem(c: dict, seconds: float | None) -> str | None:
    clip = c.get("clip") or {}
    lo, hi = clip.get("min"), clip.get("max")
    if seconds is None or (lo is None and hi is None):
        return None
    if (lo is not None and seconds < lo - 0.5) or (hi is not None and seconds > hi + 0.5):
        return f"length {seconds:.0f}s is outside the campaign's {lo or 0}-{hi or 'any'}s"
    return None


def stored_check_problems(row) -> list[str]:
    """Failing checks stored with the clip (logo, length) when the live probe could not be used."""
    out = []
    try:
        checks = json.loads(row["checks"] or "[]")
    except (ValueError, TypeError):
        return out
    for ch in checks:
        txt = str(ch.get("check", "")).lower()
        if not ch.get("ok") and ("logo" in txt or txt.startswith("length")):
            out.append(f"clip check failed: {ch['check']}")
    return out


def duplicate_of(ws, row) -> int | None:
    """Id of an already posted / scheduled clip in this campaign with nearly the same speech (None = no duplicate)."""
    import pipeline as pl
    text = (row["text"] or "") if "text" in row.keys() else ""
    if len(text.split()) < 8:
        return None
    mine = pl.shingles(text)
    for r in ws.q("SELECT c.id, c.text FROM clips c JOIN uploads u ON u.clip_id=c.id WHERE c.campaign=? AND c.id != ? "
                  "AND u.state != 'failed' AND c.text IS NOT NULL", (row["campaign"], row["id"])):
        if pl.jaccard(mine, pl.shingles(r["text"] or "")) >= DUPLICATE_SIMILARITY:
            return r["id"]
    return None


def recheck(ws, c: dict, row, caption: str, account: str | None = None, state: dict | None = None,
            allowed_accounts: list[str] | None = None, probe=None, platform: str = "tiktok") -> dict:
    """{"hold": [...], "skip": [...]} for one clip about to be posted to `account`."""
    hold, skip = [], []
    if state and state.get("state") not in (None, "active"):
        skip.append(f"campaign is {state['state']}")
    if account and allowed_accounts is not None and account not in allowed_accounts:
        skip.append(f"{account} is not one of this campaign's accounts")
    hold += caption_problems(c, caption, platform)
    for field in ("title", "text"):
        v = row[field] if field in row.keys() else None
        hit = cmp.banned_hit(c, v or "")
        if hit and f"banned phrase '{hit}' in the caption" not in hold:
            hold.append(f"banned phrase '{hit}' in the clip's {'title' if field == 'title' else 'speech'}")
    secs = None
    if probe and (row["kind"] or "video") == "video" and row["ready_file"]:
        try:
            secs = probe(row["ready_file"])
        except Exception:  # noqa: BLE001  (an unreadable file is not evidence of a problem here)
            secs = None
    lp = length_problem(c, secs)
    if lp:
        hold.append(lp)
    elif secs is None:
        hold += stored_check_problems(row)
    else:   # measured length is fine: only the logo check from the stored evidence remains relevant
        hold += [p for p in stored_check_problems(row) if "length" not in p.lower()]
    dup = duplicate_of(ws, row)
    if dup:
        hold.append(f"nearly the same speech as clip #{dup}, which is already posted (no same clip twice)")
    return {"hold": list(dict.fromkeys(hold)), "skip": skip}
