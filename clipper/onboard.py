"""
Onboard a Content Rewards campaign automatically: from its link (and the reference links it shows after you join)
build the campaign brief JSON the autopilot runs on.

  python onboard.py <contentrewards campaign link> [brief doc / Drive folder / logo file links ...]

What it fills in by itself:
  - name, rates, minimum / maximum payout, budget (public campaign page)
  - from the brief (a Google Doc): required @tags (and whether they must end the caption), required hashtags,
    minimum length, the page-name rule ("page name must include X" -> only accounts with X in their name post it),
    and whether the rules ban AI / automated clipping tools (then automation_allowed=false and nothing posts)
  - logo (an image file link), footage (a Drive folder link -> pulled into the footage folder by the cloud runner)
TikTok only, `#ad` disclosure, the default banned phrases and profanity list, cloud autopilot on.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import contentrewards as cr  # noqa: E402

PROFANITY = ["fuck", "fucking", "shit", "bitch", "nigga", "nigger", "pussy", "motherfucker", "bullshit"]
BANNED = ["guaranteed", "risk free", "risk-free", "can't lose", "financial advice", "get rich quick", "100x"]
TOOL_WORDS = (r"\bA\.?I\.?\b|artificial intelligence|automat\w*|auto[- ]?generat\w*|auto[- ]?clip\w*|"
              r"clipping (tool|software|app)s?|third[- ]party (tool|app|software)s?|opus ?clip|klap|vizard|"
              r"repurpos\w*|AI[- ]generated|AI[- ]edit\w*")
NEGATION = r"\b(no|not|never|don'?t|do not|prohibit\w*|ban\w*|forbid\w*|disallow\w*|won'?t be (paid|accepted)|reject\w*|without)\b"


def _get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (clip-engine)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def doc_text(url: str, get=_get) -> str | None:
    m = re.search(r"docs\.google\.com/document/d/([\w-]+)", url)
    if not m:
        return None
    return get(f"https://docs.google.com/document/d/{m.group(1)}/export?format=txt").decode("utf-8", "replace")


def automation_verdict(text: str) -> tuple[bool | None, str]:
    """(allowed, evidence). A sentence that names AI/automation/clipping tools together with a negation is a ban.
    "No bots, fake engagement" is about fake engagement, not editing tools, and doesn't count."""
    if not text:
        return None, "no rules text to check"
    hits = []
    for sent in re.split(r"(?<=[.!?\n])\s+", text):
        if re.search(TOOL_WORDS, sent, re.I) and re.search(NEGATION, sent, re.I):
            hits.append(sent.strip()[:160])
    if hits:
        return False, "rules restrict AI/automated tools: " + " | ".join(hits[:3])
    return True, "rules read in full: no ban on AI, automation or clipping tools (bots / fake engagement bans are about engagement)"


def parse_brief(text: str) -> dict:
    out: dict = {}
    mentions = []
    for line in text.splitlines():   # only lines that ask for tags, never example links (tiktok.com/@someone)
        if re.search(r"\btag|mention|caption", line, re.I):
            mentions += [m.rstrip(".") for m in re.findall(r"(?<![\w./])@[A-Za-z0-9_.]{3,30}", line)]
    out["mentions"] = list(dict.fromkeys(mentions))[:4]
    out["mentions_last"] = bool(re.search(r"end (every|each|all|the|your)? ?captions? with|at the end of (every|each|the|your) caption", text, re.I))
    tags = []
    for line in text.splitlines():
        if re.search(r"hashtag|include|use|add", line, re.I):
            tags += re.findall(r"(?<!\w)#[A-Za-z][\w]{2,30}", line)
    out["hashtags"] = [t for t in dict.fromkeys(tags) if t.lower() not in ("#ad", "#fyp", "#foryou")][:5]
    m = re.search(r"(minimum|at least|min\.?)\s*(\d{1,3})\s*(s\b|sec|seconds)", text, re.I)
    out["min_seconds"] = int(m.group(2)) if m else None
    m = re.search(r"page name (must|should|needs to) (include|contain|have) ([A-Z][\w]+)", text, re.I)
    out["page_word"] = m.group(3) if m else None
    m = re.search(r"(at least|minimum)\s*(\d+)\s*(posts|times)\s*(per|a)\s*week", text, re.I)
    out["posts_per_week"] = int(m.group(2)) if m else None
    m = re.search(r"(\d+(?:\.\d+)?)\s*%\s*engagement", text, re.I)
    out["min_engagement"] = float(m.group(1)) / 100 if m else None
    out["no_competitors"] = bool(re.search(r"compet\w+ (prop firms?|brands?)|competitor", text, re.I))
    return out


def brand_of(name: str, org: str) -> str:
    base = re.split(r"\||\[|\(|-|—", name)[0]
    base = re.sub(r"\$[\d.,]+k?|\b(official|campaign|clips?|ugc|prop firm|podcast|budget|post|for|the|x)\b|\w*(clipping|slideshow)\w*",
                  " ", base, flags=re.I)
    words = [w for w in base.split() if w.strip()]
    return " ".join(words[:2]) or org


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:40] or "campaign"


def build(campaign_link: str, links: list[str], campaigns_dir: Path = HERE / "campaigns", get=_get,
          fetch=cr.fetch_campaign, download=None, today: str | None = None) -> Path:
    live = fetch(campaign_link)
    brand = brand_of(live["name"], live["org"])
    key = slug(brand)
    brief, notes, logo, drive_folder = "", [], None, None
    for link in links:
        if "docs.google.com/document" in link:
            try:
                brief += "\n" + (doc_text(link, get) or "")
            except Exception as e:  # noqa: BLE001
                notes.append(f"couldn't read brief {link}: {e}")
        elif m := re.search(r"drive\.google\.com/drive/(?:u/\d+/)?folders/([\w-]+)", link):
            drive_folder = m.group(1)
        elif m := re.search(r"drive\.google\.com/(?:file/d/|open\?id=)([\w-]+)", link):
            if download:
                try:
                    p = download(m.group(1), campaigns_dir / "logos" / key)
                    if p and Path(p).suffix.lower() in (".png", ".jpg", ".jpeg", ".webp"):
                        logo = Path(p)
                except Exception as e:  # noqa: BLE001
                    notes.append(f"couldn't download {link}: {e}")
    rules = parse_brief(brief) if brief else {}
    allowed, evidence = automation_verdict(brief)
    if allowed is None and live.get("content_rules") == 0 and live.get("requirements") == 0:
        allowed, evidence = True, "campaign page lists no content rules or creator requirements and no brief was given"
    t = (live.get("rates") or {}).get("tiktok") or next(iter((live.get("rates") or {}).values()), {"cpm": 0, "min": 0, "max": 0})
    tmpl_file = campaigns_dir / "_template.json"
    tmpl = json.loads((tmpl_file if tmpl_file.exists() else HERE / "campaigns" / "_template.json").read_text(encoding="utf-8"))
    c = dict(tmpl)
    c.update({
        "name": f"{brand} ({live['org']})",
        "marketplace": "whop",
        "permission": {"program": "Content Rewards", "campaign_url": live["url"],
                       "verified_on": today or dt.date.today().isoformat(),
                       "evidence": f"onboarded from the public campaign page: {evidence}",
                       "allowed_sources": [f"file:footage/{key}"]},
        "cpm": t["cpm"], "fee_pct": 10, "min_payout": t["min"], "max_payout_per_clip": t["max"],
        "platforms": ["tiktok"], "sources": [f"footage/{key}"],
        "automation_allowed": allowed,
        "accounts": {"tiktok": "*"},
        "account_match": (rules.get("page_word") or brand.split()[0]).lower(),
        "disclosure": {"caption": "#ad", "on_screen": "#ad"},
        "banned_phrases": list(dict.fromkeys(BANNED + PROFANITY)),
        "cloud": True, "slideshows": False,
        "notes": f"Auto-onboarded {today or dt.date.today().isoformat()}: {live['name']} by {live['org']}, "
                 f"${t['cpm']}/1K on TikTok, ${live.get('left') or 0:,.0f} of ${live.get('budget') or 0:,.0f} left. "
                 + (" ".join(notes) if notes else ""),
    })
    c["caption"] = {"required_hashtags": rules.get("hashtags", []), "required_mentions": rules.get("mentions", []),
                    "mentions_last": rules.get("mentions_last", False), "required_text": "",
                    "hashtags": [f"#{key.replace('-', '')}"]}
    c["clip"] = dict(tmpl.get("clip") or {}, min=max(8, (rules.get("min_seconds") or 0) + 1), max=55, count=12)
    c["on_screen"] = dict(tmpl.get("on_screen") or {})
    if logo:
        c["on_screen"].update(logo=f"logos/{key}/{logo.name}", logo_position="top", logo_width=600)
    if drive_folder:
        c["footage_drive_folder"] = drive_folder
    if rules.get("posts_per_week"):
        c["posts_per_week"] = rules["posts_per_week"]
    if rules.get("min_engagement"):
        c["min_engagement"] = rules["min_engagement"]
    if brief:
        c["brief_text"] = brief.strip()[:6000]
    path = campaigns_dir / f"{key}.json"
    path.write_text(json.dumps(c, indent=2) + "\n", encoding="utf-8")
    (campaigns_dir / "footage" / key).mkdir(parents=True, exist_ok=True)
    return path


def gdown_download(file_id: str, dest_dir: Path) -> Path | None:
    import gdown
    dest_dir.mkdir(parents=True, exist_ok=True)
    out = gdown.download(id=file_id, output=str(dest_dir) + "/", quiet=True)
    return Path(out) if out else None


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("campaign")
    ap.add_argument("links", nargs="*")
    a = ap.parse_args(argv)
    p = build(a.campaign, a.links, download=gdown_download)
    c = json.loads(p.read_text(encoding="utf-8"))
    print(f"wrote {p}\n  {c['name']}: ${c['cpm']}/1K, automation_allowed={c['automation_allowed']}\n"
          f"  tags {c['caption']['required_mentions']} (at end: {c['caption']['mentions_last']}), "
          f"accounts with '{c['account_match']}' in the name post it")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
