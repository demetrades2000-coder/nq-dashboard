"""
Content Rewards (contentrewards.com, Whop's clipping marketplace): read public campaign pages.

  fetch_campaign(url_or_id) -> {id, name, org, rates{platform: {cpm, min, max}}, budget, spent, left, status,
                                accepting, creators, views, categories, types, content_rules, requirements,
                                requires_application, description, url}
  discover() -> [campaign, ...]   every campaign in the public catalogue (Discover + paginated clipping / UGC listings)
  lead_ok(campaign) -> (ok, why)  worth suggesting: English, TikTok, clipping, no application, not on data/ban_list.json
  rank(campaigns, prefer=...) -> campaigns sorted by how well they fit the clipper (TikTok rate x budget left,
                                  talking/podcast/finance categories, no application, few rules)

No login: only what the public pages show. Rules text and reference files are visible only after joining.
"""

from __future__ import annotations

import json
import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

BASE = "https://contentrewards.com/c"
UA = {"User-Agent": "Mozilla/5.0 (clip-engine)"}
UUID = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
FIT_CATEGORIES = {"finance": 3, "business": 2.5, "personal brand": 2, "podcast": 2, "comedy podcast": 1.5,
                  "lifestyle": 1, "education": 2, "technology": 1, "entertainment": 1, "streamer": 1}


def _get(url: str, timeout: int = 30) -> str:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


def campaign_id(url_or_id: str) -> str | None:
    m = re.search(UUID, url_or_id or "")
    return m.group(0) if m else None


def parse_campaign(html: str, cid: str) -> dict | None:
    s = html.replace('\\"', '"')
    # the logo is optional and names may contain escaped quotes ("Dovy \"fx\"")
    m = re.search(r'"name":("(?:[^"\\]|\\.)*"),"organization":\{(?:"logoUrl":"[^"]*",)?"name":("(?:[^"\\]|\\.)*")', s)
    if not m:
        return None
    try:
        name, org = json.loads(m.group(1)), json.loads(m.group(2))
    except ValueError:
        name, org = m.group(1).strip('"'), m.group(2).strip('"')
    out = {"id": cid, "name": name, "org": org, "url": f"{BASE}/campaigns/{cid}"}
    out["description"] = parse_description(html, s, m.end())

    def names(key):
        g = re.search(r'"%s":\[(.*?)\]' % key, s)
        return [x.replace("\\u0026", "&") for x in re.findall(r'"name":"([^"]+)"', g.group(1))] if g else []
    out["categories"], out["types"] = names("contentCategories"), names("contentTypes")
    rates = {}
    pm = re.search(r'"payoutModel":(\[.*?\])\}', s)
    try:
        for p in json.loads(pm.group(1)) if pm else []:
            if isinstance(p, dict) and "rate" in p and p.get("platform"):
                rates[p["platform"]] = {"cpm": p["rate"] / 100, "min": (p.get("minPayout") or 0) / 100,
                                        "max": (p.get("maxPayout") or 0) / 100}
    except (ValueError, TypeError):
        pass
    out["rates"] = rates

    def num(key):
        g = re.search(r'"%s":(\d+)' % key, s)
        return int(g.group(1)) if g else None
    budget, spent = num("budget"), num("budgetSpentCents")
    out["budget"] = budget / 100 if budget is not None else None
    out["spent"] = spent / 100 if spent is not None else None
    out["left"] = round(out["budget"] - out["spent"], 2) if budget is not None and spent is not None else None
    out["creators"], out["views"] = num("creatorCount"), num("totalViews")
    rules = re.search(r'"contentRules":(\d+),"creatorRequirements":(\d+)', s)
    out["content_rules"], out["requirements"] = (int(rules.group(1)), int(rules.group(2))) if rules else (None, None)
    st = re.search(r'"statusReason":"([a-z_]+)"', s) or re.search(r'"status":"([a-z_]+)","statusChangedAt"', s)
    out["status"] = st.group(1) if st else None
    app = re.search(r'"requiresApplication":(true|false)', s)
    out["requires_application"] = app.group(1) == "true" if app else None
    text = re.sub(r"<[^>]+>", " ", html)
    out["accepting"] = ("Accepting clips" in text) or (out["status"] in ("funded", "manual") and (out["left"] or 0) > 0)
    if re.search(r"\b(Campaign (ended|closed|completed)|Not accepting|Budget (exhausted|depleted))", text, re.I):
        out["accepting"] = False
    return out


def _unjson(x: str) -> str:
    try:
        return json.loads('"' + x.replace("\n", "\\n") + '"')
    except ValueError:
        return x.replace("\\n", "\n").replace("\\u0026", "&")


def parse_description(html: str, s: str, start: int = 0) -> str:
    """The campaign's own public description (what the owner wrote on the page, often with the rules).
    Takes the first "description" value after the campaign name in the page data, else the page's meta description."""
    best = ""
    pat = r'"(?:description|about|summary)":"(.*?)"(?=,"[A-Za-z_]+":|\})'
    m = re.search(pat, s[start:], re.S) or re.search(pat, s[:start], re.S)
    if m:
        best = _unjson(m.group(1))
    if len(best.strip()) < 20:
        mm = (re.search(r'<meta[^>]+(?:property="og:description"|name="description")[^>]+content="([^"]*)"', html, re.I)
              or re.search(r'<meta[^>]+content="([^"]*)"[^>]+(?:property="og:description"|name="description")', html, re.I))
        if mm:
            import html as _h
            best = _h.unescape(mm.group(1))
    best = re.sub(r"[ \t]+", " ", best).strip()
    return best[:6000]


def fetch_campaign(url_or_id: str, get=_get) -> dict:
    cid = campaign_id(url_or_id)
    if not cid:
        raise ValueError(f"not a Content Rewards campaign link: {url_or_id}")
    c = parse_campaign(get(f"{BASE}/campaigns/{cid}"), cid)
    if not c:
        raise ValueError(f"campaign {cid}: page didn't contain campaign data (removed or private?)")
    return c


CATALOGUE_PAGES = ("discover", "discover/clipping?page={n}", "discover/ugc?page={n}")
MAX_CATALOGUE_PAGES = 12


def catalogue_ids(get=_get, max_pages: int = MAX_CATALOGUE_PAGES) -> list[str]:
    """Every campaign id linked from the public catalogue: the Discover page plus the paginated clipping and UGC
    listings (/c/discover/clipping?page=N, /c/discover/ugc?page=N). A listing stops at the first page that shows no
    new campaign or fails; one broken listing never loses the others."""
    seen: dict[str, None] = {}
    for tmpl in CATALOGUE_PAGES:
        if "{n}" not in tmpl:
            try:
                for i in re.findall(UUID, get(f"{BASE}/{tmpl}")):
                    seen.setdefault(i, None)
            except Exception:  # noqa: BLE001
                pass
            continue
        for n in range(1, max_pages + 1):
            try:
                found = re.findall(UUID, get(f"{BASE}/{tmpl.format(n=n)}"))
            except Exception:  # noqa: BLE001
                break
            fresh = [i for i in dict.fromkeys(found) if i not in seen]
            if not fresh:
                break
            for i in fresh:
                seen.setdefault(i, None)
    return sorted(seen)


def discover(get=_get, workers: int = 8, limit: int = 400, pages: bool = True, skip_ids=()) -> list[dict]:
    """Every campaign in the public catalogue (parsed). `skip_ids` are ids known to be useless (not fetched again)."""
    ids = catalogue_ids(get) if pages else sorted(set(re.findall(UUID, get(f"{BASE}/discover"))))
    ids = [i for i in ids if i not in set(skip_ids)][:limit]

    def one(cid):
        try:
            return parse_campaign(get(f"{BASE}/campaigns/{cid}"), cid)
        except Exception:  # noqa: BLE001
            return None
    with ThreadPoolExecutor(workers) as ex:
        return [c for c in ex.map(one, ids) if c]


ADULT = re.compile(r"sinparty|onlyfans|fansly|nsfw|adult|xxx|porn|camgirl|escort|casino|gambl|betting|sportsbook|flip\.gg|stake\.com|roobet|rollbit|gamdom|case.?opening|csgo|skins? gambl", re.I)
NON_ENGLISH = re.compile(r"fran[cç]ais|espa[nñ]ol|portugu[eê]s|deutsch|italiano|arab|عربي|[\u0600-\u06FF\u0400-\u04FF\u3040-\u30FF\u4E00-\u9FFF]"
                         r"|\b(campagne|por cada|visitas|vistas|hablando|sobreviviendo|de vistas)\b", re.I)


def suitable(c: dict) -> tuple[bool, str]:
    """Campaigns this clipper should never join: adult / gambling brands, and non-English ones (captions are English)."""
    text = f"{c.get('name', '')} {c.get('org', '')}"
    if ADULT.search(text):
        return False, "adult or gambling brand"
    if NON_ENGLISH.search(text):
        return False, "not an English campaign"
    return True, ""


DATA_DIR = Path(__file__).resolve().parent / "data"


def load_ban_list(path=None) -> list[dict]:
    """The skip-list of organisations whose rules ban automated tools (data/ban_list.json)."""
    try:
        data = json.loads(Path(path or DATA_DIR / "ban_list.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    return [e for e in data.get("orgs", []) if isinstance(e, dict) and e.get("match")]


def _word_in(needle: str, hay: str) -> bool:
    return bool(re.search(r"(?<![a-z0-9])" + re.escape(needle.lower()) + r"(?![a-z0-9])", hay.lower()))


def banned_org(c: dict, ban: list[dict] | None = None) -> str | None:
    """Why this campaign's organisation is on the skip-list, or None."""
    for e in (load_ban_list() if ban is None else ban):
        m = str(e["match"])
        org, name = str(c.get("org") or ""), str(c.get("name") or "")
        hit = _word_in(m, org) if e.get("mode") == "org" else (_word_in(m, org) or _word_in(m, name))
        if hit:
            return f"{m}: {e.get('why') or 'on the skip-list'}"
    return None


def _mostly_ascii(text: str) -> bool:
    letters = [ch for ch in text if ch.isalpha()]
    return not letters or sum(ch.isascii() for ch in letters) / len(letters) >= 0.8


def lead_ok(c: dict, ban: list[dict] | None = None, platform: str = "tiktok", min_left: float = 25.0) -> tuple[bool, str]:
    """Is this campaign worth suggesting to the owner? English, pays on TikTok, clipping/slideshow type, no application,
    not adult/gambling, budget left, and not an organisation known to ban automated tools."""
    ok, why = suitable(c)
    if not ok:
        return False, why
    if not _mostly_ascii(f"{c.get('name', '')} {c.get('org', '')} {str(c.get('description') or '')[:300]}"):
        return False, "not an English campaign"
    why = banned_org(c, ban)
    if why:
        return False, f"skip-list ({why})"
    if not (c.get("rates") or {}).get(platform):
        return False, f"does not pay on {platform}"
    types = c.get("types") or []
    if types and "Clipping" not in types and "Slideshows" not in types:
        return False, "not a clipping campaign (needs original content)"
    if c.get("requires_application"):
        return False, "needs an application"
    if c.get("accepting") is False or (c.get("left") is not None and c["left"] < min_left):
        return False, "no budget left"
    return True, ""


def score(c: dict, platform: str = "tiktok") -> float:
    """Expected value of joining for this clipper: rate x remaining budget headroom x content fit."""
    if not suitable(c)[0]:
        return 0.0
    r = (c.get("rates") or {}).get(platform)
    if not r or not c.get("left") or c["left"] <= 0 or c.get("accepting") is False:
        return 0.0
    fit = max([FIT_CATEGORIES.get(x.lower(), 0.5) for x in c.get("categories") or []] or [0.7])
    if "Clipping" not in (c.get("types") or []) and "Slideshows" not in (c.get("types") or []):
        fit *= 0.3   # UGC / reposting / sound campaigns need other content than clips
    budget_room = min(c["left"], 5000) / 5000
    crowd = 1 / (1 + (c.get("creators") or 0) / 300)
    app = 0.6 if c.get("requires_application") else 1.0
    return round(r["cpm"] * (0.3 + budget_room) * fit * (0.5 + crowd) * app, 3)


def rank(campaigns: list[dict], platform: str = "tiktok") -> list[dict]:
    for c in campaigns:
        c["score"] = score(c, platform)
    return sorted([c for c in campaigns if c["score"] > 0], key=lambda c: -c["score"])


def health(c: dict, min_left: float = 25.0) -> tuple[bool, str]:
    """Should we keep posting for this campaign? (ok, reason)"""
    if c.get("accepting") is False:
        return False, "campaign is no longer accepting clips"
    if c.get("status") and c["status"] not in ("funded", "manual"):
        return False, f"campaign status is '{c['status']}'"
    if c.get("left") is not None and c["left"] < min_left:
        return False, f"budget almost gone (${c['left']:.2f} left)"
    return True, f"${c['left']:,.0f} left" if c.get("left") is not None else "ok"
