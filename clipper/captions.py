"""On-screen caption style and the text that is posted with the video.

Style (campaign "style" block, all keys optional; command-line flags and on_screen.highlight still work):
  "style": {"highlight": "#FFE600",       active-word colour (falls back to on_screen.highlight, then yellow)
            "money": "#39FF14",           numbers and money words
            "negation": "#FF4D4D",        not / never / nobody
            "hook_bg": "#000000",         hook title box
            "bold": true,                 caption font weight
            "font": "Inter Display",      caption family (default: bundled Inter Display ExtraBold)
            "font_size": 84,
            "mask_profanity": true,       f***, and the word is muted in the audio
            "cold_open": "off|trim|teaser",
            "hook_seconds": 2.5,
            "brand_color": "#16DE4A",     used for highlight when no highlight is set
            "speaker": "Layth",           names the speaker in post captions
            "always_tags": ["#tradever"], hashtags on every post
            "lifestyle": false}           b-roll allowed (see broll.py)

Post captions: post_caption(clip, campaign, history) -> str. See the function.
"""

from __future__ import annotations

import hashlib
import re

import campaign as cmp
from hooks import hook_kind, income_claim
from scoring import PROFANE

DEFAULT_STYLE = {
    "highlight": "#FFE600", "money": "#39FF14", "negation": "#FF4D4D", "hook_bg": "#000000",
    "bold": True, "font": None, "font_size": 84, "mask_profanity": True, "cold_open": "trim",
    "hook_seconds": 2.5, "speaker": "", "always_tags": [], "lifestyle": False,
}


def style_for(args=None, camp: dict | None = None) -> dict:
    """Merged style: defaults < on_screen.highlight < campaign style block < explicit command-line values."""
    camp = camp if camp is not None else (getattr(args, "camp", None) or {})
    st = dict(DEFAULT_STYLE)
    on = (camp or {}).get("on_screen") or {}
    if on.get("highlight"):
        st["highlight"] = on["highlight"]
    block = (camp or {}).get("style") or {}
    if block.get("brand_color") and not block.get("highlight") and not on.get("highlight"):
        st["highlight"] = block["brand_color"]
    for k, v in block.items():
        if v is not None:
            st[k] = v
    if args is not None:
        if getattr(args, "font", None):
            st["font"] = args.font
        if getattr(args, "font_size", None) and not block.get("font_size"):
            st["font_size"] = args.font_size
        hl = getattr(args, "highlight", None)
        if hl and not block.get("highlight") and not block.get("brand_color"):
            st["highlight"] = hl
        for k in ("cold_open", "hook_seconds", "mask_profanity"):
            v = getattr(args, k, None)
            if v is not None:
                st[k] = v
    return st


# ---------------------------------------------------------------- profanity

def is_profane(word: str, extra=()) -> bool:
    w = re.sub(r"[^A-Za-z]", "", word or "")
    return bool(w) and (bool(PROFANE.fullmatch(w)) or w.lower() in {e.lower() for e in extra})


def mask_word(word: str) -> str:
    """'fucking,' -> 'f*****,' (first letter and trailing punctuation kept)."""
    m = re.match(r"^([^A-Za-z]*)([A-Za-z][A-Za-z']*)(.*)$", word)
    if not m:
        return word
    pre, core, post = m.groups()
    return pre + core[0] + "*" * (len(core) - 1) + post


def masked_indexes(words: list, extra=()) -> list[int]:
    return [i for i, w in enumerate(words) if is_profane(w.w, extra)]


# ---------------------------------------------------------------- post captions

ANGLES = ["question", "claim", "series", "curiosity", "number", "contrast"]

TOPIC_PHRASES = [  # (regex on the clip text, phrase that completes "about ...")
    (r"\bpayouts?\b|\bwithdraw", "how prop firm payouts work"),
    (r"\bdrawdown\b", "drawdown on a funded account"),
    (r"\bconsistency\b", "the consistency rule"),
    (r"\bevaluation\b|\beval\b|\bchallenge\b|\bprofit target\b", "passing a prop firm evaluation"),
    (r"\bdiscipline\b|\bemotion|\bpsycholog|\brevenge\b", "trading discipline"),
    (r"\brisk\b|\bstop loss\b|\bposition siz", "managing risk"),
    (r"\bmistakes?\b|\blost\b|\blosing\b", "the mistakes that cost traders"),
    (r"\bprop firms?\b|\bfunded\b", "prop firms"),
    (r"\bfutures\b|\bnasdaq\b|\bes\b|\bmnq\b", "trading futures"),
    (r"\bcrypto\b|\bbitcoin\b", "crypto"),
    (r"\breal estate\b|\bproperty\b", "real estate"),
    (r"\bsales\b|\bclients?\b|\boffer\b", "selling"),
    (r"\bbusiness\b|\bstartup\b|\bagency\b", "building a business"),
    (r"\binvest", "investing"),
    (r"\bmindset\b|\bhabits?\b", "mindset"),
]

OPENERS = ["", "", "", "Real talk: ", "No fluff: ", "Straight from the podcast: "]
Q_TPL = ["Do you really know {t}?", "What does nobody tell you about {t}?", "Still confused about {t}?",
         "Is this how you think about {t}?"]
CURIOSITY_TPL = ["Listen to how he explains {t}.", "The part about {t} most people scroll past.",
                 "Wait for what he says about {t}.", "{T} in under a minute."]
CLAIM_SUFFIX = ["", "", " Agree?", " Thoughts?"]

BANNED_FALLBACK = ["Worth a listen.", "Hear it straight from the podcast."]


def _hash(*parts) -> int:
    return int(hashlib.sha1("|".join(map(str, parts)).encode()).hexdigest()[:10], 16)


def _text_of(clip) -> str:
    if isinstance(clip, dict):
        return clip.get("text") or " ".join(w.get("w", "") if isinstance(w, dict) else getattr(w, "w", "") for w in clip.get("words", []))
    return getattr(clip, "text", "") or ""


def _topic_phrase(text: str) -> str:
    low = text.lower()
    for rx, phrase in TOPIC_PHRASES:
        if re.search(rx, low):
            return phrase
    return ""


def _line_of(clip) -> str:
    """The verbatim line the caption is built from: hook text if the clip has one, else its title."""
    hook = clip.get("hook") if isinstance(clip, dict) else getattr(clip, "hook", None)
    if isinstance(hook, dict) and hook.get("text"):
        return hook["text"].strip("“”")
    title = clip.get("title") if isinstance(clip, dict) else getattr(clip, "title", "")
    return (title or "").strip().strip("“”")


def infer_angle(caption: str) -> str:
    body = re.sub(r"(^|\s)[#@]\S+", " ", caption or "").strip()
    if re.match(r"(real talk: |no fluff: |straight from the podcast: )?part \d+", body, re.I):
        return "series"
    if body.endswith("?") or body.split("\n")[0].endswith("?"):
        return "question"
    if re.search(r"\b(listen to how|wait for what|scroll past|in under a minute)\b", body, re.I):
        return "curiosity"
    return "claim"


def _hist_items(history) -> list[dict]:
    out = []
    for h in history or []:
        if isinstance(h, str):
            out.append({"caption": h, "hashtags": re.findall(r"#\w+", h), "angle": infer_angle(h)})
        elif isinstance(h, dict):
            cap = h.get("caption") or h.get("text") or ""
            out.append({"caption": cap, "hashtags": h.get("hashtags") or re.findall(r"#\w+", cap),
                        "angle": h.get("angle") or infer_angle(cap), "source": h.get("source")})
    return out


def pick_hashtags(campaign: dict | None, seed: int, history=None, n: int = 4, extra_pool=()) -> list[str]:
    """3-5 hashtags: the required ones and the brand tag always, the rest rotated from the pool so that two
    consecutive posts never carry the same set and tags used least recently come back first."""
    cap = (campaign or {}).get("caption") or {}
    required = [t if t.startswith("#") else "#" + t for t in (cap.get("required_hashtags") or [])]
    pool = [t if t.startswith("#") else "#" + t for t in (cap.get("hashtags") or [])] + list(extra_pool)
    style = (campaign or {}).get("style") or {}
    always = [t if t.startswith("#") else "#" + t for t in (style.get("always_tags") or [])]
    first = re.split(r"[^a-z0-9]+", ((campaign or {}).get("name") or "").lower().strip())[0]
    brand = [t for t in pool if first and re.sub(r"[^a-z0-9]", "", t.lower()) == first]
    fixed = list(dict.fromkeys(required + always + brand))
    banned = lambda t: bool(cmp.banned_hit(campaign, t.lstrip("#")))
    rest = [t for t in dict.fromkeys(pool) if t not in fixed and not banned(t)]
    if not pool:
        rest = [t for t in dict.fromkeys(extra_pool) if t not in fixed]
    n = max(3, min(5, n))
    want = max(0, n - len(fixed))
    hist = _hist_items(history)
    last_sets = [frozenset(h["hashtags"]) for h in hist[-3:]]
    # recency: tags not used in the last posts first
    recent = {}
    for age, h in enumerate(reversed(hist[-6:])):
        for t in h["hashtags"]:
            recent.setdefault(t.lower(), age)
    order = sorted(rest, key=lambda t: (-(recent.get(t.lower(), 99)), _hash(seed, t)))
    best = None
    for shift in range(max(1, len(order))):
        pick = (order[shift:] + order[:shift])[:want] if want else []
        tags = fixed + pick
        if frozenset(tags) not in last_sets:
            best = tags
            break
        best = best or tags
    return best if best is not None else fixed[:5]


def post_caption_info(clip, campaign: dict | None, history=None, platform: str = "tiktok") -> dict:
    """Everything post_caption decides: {"text", "body", "angle", "hashtags"}."""
    text = _text_of(clip)
    line = _line_of(clip)
    hist = _hist_items(history)
    seed = _hash(text[:200], len(hist), (campaign or {}).get("name", ""))
    style = (campaign or {}).get("style") or {}
    topic = _topic_phrase(text) or _topic_phrase(line)
    speaker = style.get("speaker") or ""
    src_key = (clip.get("source") if isinstance(clip, dict) else getattr(clip, "source_key", None)) or None
    kind = hook_kind(line, line) if line else "claim"

    avail = []
    if line and kind == "question":
        avail.append("question")
    elif topic:
        avail.append("question")
    if line:
        avail += ["claim"]
    if line and src_key:
        avail.append("series")
    if topic:
        avail.append("curiosity")
    if line and kind == "number":
        avail.append("number")
    if line and kind == "contrast":
        avail.append("contrast")
    if not avail:
        avail = ["claim"]
    # never the angle of the last post; angles used longest ago (or never) come first
    last = [h["angle"] for h in hist[-3:]]
    age = lambda a: last[::-1].index(a) if a in last else 99
    order = sorted(avail, key=lambda a: (-age(a), _hash(seed, a)))
    angle = next((a for a in order if not last or a != last[-1]), order[0])

    def build(a: str) -> str:
        opener = OPENERS[_hash(seed, "o") % len(OPENERS)]
        who = f"{speaker} on " if speaker and topic and _hash(seed, "w") % 3 == 0 else ""
        if a == "question":
            if line and kind == "question":
                return line if line.endswith("?") else line + "?"
            return Q_TPL[_hash(seed, "q") % len(Q_TPL)].format(t=topic)
        if a == "series":
            n = 1 + sum(1 for h in hist if h.get("source") == src_key)
            return f"Part {n} | {line.rstrip('.')}"
        if a == "curiosity":
            tpl = CURIOSITY_TPL[_hash(seed, "c") % len(CURIOSITY_TPL)]
            return (who + tpl.format(t=topic, T=topic[:1].upper() + topic[1:])) if who == "" else \
                f"{speaker} explains {topic}. Listen to this."
        if a in ("claim", "number", "contrast"):
            body = line.rstrip(".")
            if income_claim(body) and not body.startswith("“"):
                body = f"“{body}”"
            return opener + body + CLAIM_SUFFIX[_hash(seed, "s") % len(CLAIM_SUFFIX)] if not body.endswith("?") else opener + body
        return line

    body = build(angle).strip()
    # rules: no banned phrases, no promises of results
    if cmp.banned_hit(campaign, body) or re.search(r"\b(guarantee|risk[- ]free|financial advice)\b", body, re.I):
        body = BANNED_FALLBACK[seed % len(BANNED_FALLBACK)]
        angle = "claim"
    # a caption identical to an earlier one is changed (never post the same text twice)
    prev_bodies = {re.sub(r"(^|\s)[#@]\S+", " ", h["caption"]).strip().lower() for h in hist}
    tries = 0
    while body.lower() in prev_bodies and tries < len(avail):
        alt = [a for a in avail if a != angle]
        if not alt:
            body += " \U0001F447"
            break
        angle = alt[tries % len(alt)]
        body = build(angle).strip()
        tries += 1
    tags = pick_hashtags(campaign, seed, hist, n=4 + (seed % 2))
    title = line or body
    posts = cmp.platform_posts(campaign, title, body, tags)
    p = posts.get(platform) or next(iter(posts.values()))
    final = p.get("caption") or p.get("description") or body
    return {"text": final, "body": body, "angle": angle, "hashtags": tags}


def post_caption(clip, campaign: dict | None, history=None, platform: str = "tiktok") -> str:
    """The caption to post with the video, ready to paste.

    clip      a clipper.Clip (needs .text, .title, optional .hook) or a dict with text / title / hook / source
    campaign  the campaign dict (cmp.load): disclosure, required tags/mentions, hashtag pool, banned phrases
    history   the account's previous captions, oldest first: strings, or dicts {caption, hashtags, angle, source}.
              Used so two consecutive posts never share an angle, a hashtag set or the same text.
    The text always follows the campaign's own layout (cmp.platform_posts): disclosure first ("#ad"), required text,
    3-5 hashtags, the required @tags last. Only words from the transcript plus a few neutral templates are used, and
    banned phrases or result promises are never produced."""
    return post_caption_info(clip, campaign, history, platform)["text"]
