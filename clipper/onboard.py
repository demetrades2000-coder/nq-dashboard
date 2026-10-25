"""
Onboard a Content Rewards campaign automatically: from its link (and the reference links it shows after you join)
build the campaign brief JSON the autopilot runs on.

  python onboard.py <contentrewards campaign link> [brief / footage / logo links or a local folder ...] [--brief-text "..."]

Briefs it can read (public links only, plain HTTPS, no login):
  Google Docs (also published /pub links), Google Sheets / Slides, Google Drive PDF / docx / txt files, Notion public
  pages (notion.site / notion.so, through Notion's public page endpoint), Dropbox or any plain https .pdf / .docx / .txt /
  .md / html link, and text pasted with --brief-text (also env ONBOARD_BRIEF_TEXT, for the cloud workflow).
Footage it can wire up:
  Google Drive folder or file, YouTube channel / playlist / video, Twitch and Kick VODs or channels, Vimeo / Rumble,
  direct video links (incl. Dropbox file links), a local folder (copied into the campaign's footage folder).
  Dropbox / MEGA folders can't be fetched without a login or an app: it says so and what to send instead.
What it fills in by itself: name, rates, payout limits and budget (public campaign page); from the brief and the
campaign's own public description: required @tags (and whether they end the caption), required hashtags, disclosure
text, minimum / maximum length, page-name word, posts per week, engagement floor, language, no-watermark / logo /
co-posting / repost rules, and whether the rules ban AI / automated tools (automation_verdict: allowed / banned /
unclear; unclear leaves automation_allowed null so the autopilot refuses until a human confirms).
Things the clipper cannot meet (show your face, voice-over, audience geography ...) go to `onboard_warnings`.
TikTok only, `#ad` disclosure, the default banned phrases and profanity list, cloud autopilot on.
"""

from __future__ import annotations

import argparse
import datetime as dt
import html as htmllib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import contentrewards as cr  # noqa: E402

PROFANITY = ["fuck", "fucking", "shit", "bitch", "nigga", "nigger", "pussy", "motherfucker", "bullshit"]
BANNED = ["guaranteed", "risk free", "risk-free", "can't lose", "financial advice", "get rich quick", "100x"]
UA = {"User-Agent": "Mozilla/5.0 (clip-engine)"}
VIDEO_EXT = (".mp4", ".mov", ".m4v", ".webm", ".mkv", ".avi")
IMAGE_EXT = (".png", ".jpg", ".jpeg", ".webp")
DOC_EXT = (".pdf", ".txt", ".md", ".docx", ".rtf", ".html", ".htm")
MAX_BYTES = 25_000_000

# ------------------------------------------------------------------ fetching


def _get(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read(MAX_BYTES)


def _post_json(url: str, body: dict) -> dict:
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST",
                                 headers={**UA, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def doc_text(url: str, get=_get) -> str | None:
    """Google Docs (editor link or published link), Slides and Sheets as plain text."""
    m = re.search(r"docs\.google\.com/document/d/e/([\w-]+)", url)
    if m:   # "Publish to the web" link
        return html_text(get(f"https://docs.google.com/document/d/e/{m.group(1)}/pub"))
    m = re.search(r"docs\.google\.com/document/d/([\w-]+)", url)
    if m:
        return get(f"https://docs.google.com/document/d/{m.group(1)}/export?format=txt").decode("utf-8", "replace")
    m = re.search(r"docs\.google\.com/presentation/d/([\w-]+)", url)
    if m:
        return get(f"https://docs.google.com/presentation/d/{m.group(1)}/export?format=txt").decode("utf-8", "replace")
    m = re.search(r"docs\.google\.com/spreadsheets/d/([\w-]+)", url)
    if m:
        return get(f"https://docs.google.com/spreadsheets/d/{m.group(1)}/export?format=csv").decode("utf-8", "replace")
    return None


def html_text(data: bytes | str) -> str:
    s = data.decode("utf-8", "replace") if isinstance(data, bytes) else data
    s = re.sub(r"(?is)<(script|style|noscript|svg|head)\b.*?</\1>", " ", s)
    s = re.sub(r"(?i)</(p|div|li|h\d|tr|br|section|article)>|<br\s*/?>", "\n", s)
    s = htmllib.unescape(re.sub(r"<[^>]+>", " ", s))
    return re.sub(r"[ \t\r\f\v]+", " ", re.sub(r"\n\s*\n+", "\n", s)).strip()


def pdf_text(data: bytes) -> tuple[str | None, str]:
    """(text, message). pypdf if installed, else the pdftotext program, else (None, why)."""
    try:
        from pypdf import PdfReader  # type: ignore
        txt = "\n".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(data)).pages)
        if txt.strip():
            return txt, ""
    except ImportError:
        pass
    except Exception as e:  # noqa: BLE001
        err = f"pypdf failed ({e})"
    else:
        err = ""
    exe = shutil.which("pdftotext")
    if exe:
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "brief.pdf"
            f.write_bytes(data)
            r = subprocess.run([exe, "-layout", str(f), "-"], capture_output=True, timeout=60)
            txt = r.stdout.decode("utf-8", "replace")
            if txt.strip():
                return txt, ""
        return None, "the PDF has no selectable text (a scan?): paste the brief text with --brief-text"
    return None, ("no PDF reader here (install pypdf or poppler's pdftotext) or the PDF is a scan: "
                  "paste the brief text with --brief-text")


def docx_text(data: bytes) -> str | None:
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            xml = z.read("word/document.xml").decode("utf-8", "replace")
    except (KeyError, zipfile.BadZipFile):
        return None
    xml = re.sub(r"</w:p>|<w:br/>|<w:tab/>", "\n", xml)
    return htmllib.unescape(re.sub(r"<[^>]+>", "", xml)).strip()


def bytes_to_text(data: bytes, name: str = "") -> tuple[str | None, str]:
    """Any fetched brief file -> (text, message), by what the bytes are, not by the link's spelling."""
    head = data[:8]
    if head.startswith(b"%PDF"):
        return pdf_text(data)
    if head.startswith(b"PK"):
        t = docx_text(data)
        return (t, "") if t else (None, "a zip / Office file I can't read: paste the brief text with --brief-text")
    if head.startswith(b"{\\rtf"):
        t = re.sub(r"\\[a-z]+-?\d* ?|[{}]", "", data.decode("latin-1"))
        return t, ""
    s = data.decode("utf-8-sig", "replace")
    if re.search(r"(?i)<(html|body|!doctype)", s[:2000]):
        return html_text(s), ""
    if "\x00" in s[:2000]:
        return None, "binary file, not a text brief: paste the brief text with --brief-text"
    return s, ""


def dropbox_direct(url: str) -> str:
    u = urllib.parse.urlsplit(url)
    q = [(k, v) for k, v in urllib.parse.parse_qsl(u.query) if k != "dl"] + [("dl", "1")]
    return urllib.parse.urlunsplit(("https", u.netloc, u.path, urllib.parse.urlencode(q), ""))


def _notion_rich(t) -> str:
    return "".join(seg[0] for seg in (t or []) if isinstance(seg, list) and seg and isinstance(seg[0], str))


def notion_text(url: str, post=_post_json) -> tuple[str | None, str]:
    """Public Notion page through Notion's own public endpoint (what a browser calls for a shared page).
    (text, message). Only pages shared to the web work; a page behind login or a slug-only link degrades to a message."""
    u = urllib.parse.urlsplit(url)
    cand = [u.path.rstrip("/").split("/")[-1]] + urllib.parse.parse_qs(u.query).get("p", [])
    pid = None
    for seg in cand:
        m = re.search(r"(?<![0-9a-f])([0-9a-f]{8})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{12})$", seg, re.I)
        if m:
            pid = "-".join(m.groups()).lower()
            break
    if not pid:
        return None, ("this Notion link has no page id in it (custom slug): open the page, copy the brief text and run "
                      "again with --brief-text \"...\"")
    blocks: dict = {}
    try:
        cursor, n = {"stack": []}, 0
        while n < 12:
            resp = post("https://www.notion.so/api/v3/loadPageChunk",
                        {"page": {"id": pid}, "limit": 200, "cursor": cursor, "chunkNumber": n, "verticalColumns": False})
            for bid, rec in ((resp.get("recordMap") or {}).get("block") or {}).items():
                v = (rec or {}).get("value") or {}
                v = v.get("value") if isinstance(v.get("value"), dict) else v
                if v:
                    blocks[bid] = v
            cursor = resp.get("cursor") or {"stack": []}
            n += 1
            if not cursor.get("stack"):
                break
    except Exception as e:  # noqa: BLE001
        return None, (f"couldn't read the Notion page ({type(e).__name__}: {e}). Open it, copy the brief text and run again "
                      f"with --brief-text \"...\"")
    root = blocks.get(pid) or blocks.get(pid.replace("-", ""))
    if not root:
        return None, ("that Notion page isn't public (or Notion blocked the request). Share it to the web, or copy the "
                      "brief text and run again with --brief-text \"...\"")
    lines: list[str] = []

    def walk(bid: str, depth: int = 0):
        b = blocks.get(bid)
        if not b or depth > 12:
            return
        props, typ = b.get("properties") or {}, b.get("type") or ""
        txt = _notion_rich(props.get("title"))
        if typ == "table_row":
            txt = " | ".join(_notion_rich(v) for v in props.values())
        if txt.strip():
            pre = {"header": "# ", "sub_header": "## ", "sub_sub_header": "### ", "bulleted_list": "- ",
                   "numbered_list": "1. ", "to_do": "- ", "quote": "> "}.get(typ, "")
            lines.append(pre + txt.strip())
        if typ == "child_page" and depth:
            return
        for c in b.get("content") or []:
            walk(c, depth + 1)
    lines_title = _notion_rich((root.get("properties") or {}).get("title"))
    if lines_title:
        lines.append(lines_title)
    for c in root.get("content") or []:
        walk(c, 1)
    if not "\n".join(lines).strip():
        return None, "the Notion page came back empty: copy the brief text and run again with --brief-text \"...\""
    return "\n".join(lines), ""


def fetch_brief(link: str, kind: str, get=_get, post=_post_json) -> tuple[str | None, str]:
    """(text or None, message for the owner when None). Never raises."""
    try:
        if kind == "gdoc":
            t = doc_text(link, get)
            return (t, "") if t and t.strip() else (None, f"{link} is empty or not shared as 'anyone with the link can view'")
        if kind == "notion":
            return notion_text(link, post)
        url = dropbox_direct(link) if kind == "dropbox_file" else link
        data = get(url)
        t, msg = bytes_to_text(data, url)
        return (t, "") if t and t.strip() else (None, msg or f"{link} had no readable text")
    except Exception as e:  # noqa: BLE001
        return None, (f"couldn't read {link} ({type(e).__name__}: {e}); if it needs a login, copy the brief text and use "
                      f"--brief-text \"...\"")


# ------------------------------------------------------------------ links


def classify(link: str) -> str:
    l = link.strip()
    if not re.match(r"https?://", l, re.I):
        return "local" if Path(l).expanduser().exists() else "unknown"
    u = urllib.parse.urlsplit(l)
    host = u.netloc.lower().removeprefix("www.").removeprefix("m.")
    path, low = u.path, l.lower()
    if "contentrewards.com" in host or host.endswith("whop.com"):
        return "campaign"
    if host == "docs.google.com":
        return "gdoc" if re.search(r"/(document|presentation|spreadsheets)/", path) else "unknown"
    if host == "drive.google.com":
        if "/folders/" in path:
            return "gfolder"
        return "gfile" if re.search(r"/file/d/|/open|/uc|/document/", low) else "unknown"
    if host.endswith("notion.site") or host.endswith("notion.so"):
        return "notion"
    if host.endswith("dropbox.com") or host.endswith("dropboxusercontent.com"):
        if re.search(r"/(sh|scl/fo)/", path) or ("/s/" not in path and "/scl/fi/" not in path):
            return "dropbox_folder"
        return "dropbox_video" if path.lower().endswith(VIDEO_EXT) else "dropbox_file"
    if host.endswith("mega.nz") or host.endswith("mega.io") or host == "mega.co.nz":
        return "mega"
    if host in ("youtube.com", "youtu.be", "music.youtube.com"):
        return "youtube"
    if host.endswith("twitch.tv"):
        return "twitch"
    if host.endswith("kick.com"):
        return "kick"
    if host in ("vimeo.com", "rumble.com", "dailymotion.com", "odysee.com"):
        return "video_site"
    if host.endswith(("tiktok.com", "instagram.com", "x.com", "twitter.com", "facebook.com")):
        return "example_post"
    if path.lower().endswith(VIDEO_EXT):
        return "video_url"
    return "http_doc"


def url_source(link: str) -> tuple[str, str]:
    """(source url the downloader gets, prefix for permission.allowed_sources)."""
    u = urllib.parse.urlsplit(link.strip())
    host = u.netloc.lower().removeprefix("www.").removeprefix("m.")
    path, q = u.path.rstrip("/"), urllib.parse.parse_qs(u.query)
    if host == "youtu.be":
        return f"https://youtu.be{path}", f"youtu.be{path}"
    if host.endswith("youtube.com"):
        if path == "/playlist" or ("list" in q and path in ("", "/watch") and "v" not in q):
            p = f"youtube.com/playlist?list={q['list'][0]}"
            return f"https://www.{p}", p
        if path == "/watch" and "v" in q:
            p = f"youtube.com/watch?v={q['v'][0]}"
            return f"https://www.{p}", p
        m = re.match(r"(/(?:shorts|live|embed)/[\w-]+)", path)
        if m:
            return f"https://www.youtube.com{m.group(1)}", f"youtube.com{m.group(1)}"
        m = re.match(r"(/@[\w.\-%]+|/channel/[\w-]+|/c/[\w.\-%]+|/user/[\w.\-%]+)", path)
        if m:
            return f"https://www.youtube.com{m.group(1)}/videos", f"youtube.com{m.group(1)}"
    if host.endswith("twitch.tv"):
        m = re.match(r"(/videos/\d+)", path)
        if m:
            return f"https://www.twitch.tv{m.group(1)}", f"twitch.tv{m.group(1)}"
        m = re.match(r"/(?:([\w]+)/(?:clip/[\w-]+)|([\w]+))", path)
        name = (m.group(1) or m.group(2)) if m else ""
        if name and name not in ("videos", "directory", "downloads"):
            if "/clip/" in path:
                return f"https://www.twitch.tv{path}", f"twitch.tv/{name}"
            return f"https://www.twitch.tv/{name}/videos", f"twitch.tv/{name}"
    if host.endswith("kick.com"):
        m = re.match(r"(/video/[\w-]+|/[\w.\-]+/videos/[\w-]+|/[\w.\-]+/clips/[\w-]+)", path)
        if m:
            return f"https://kick.com{m.group(1)}", f"kick.com{m.group(1)}"
        m = re.match(r"/([\w.\-]+)", path)
        if m:
            return f"https://kick.com/{m.group(1)}/videos", f"kick.com/{m.group(1)}"
    clean = urllib.parse.urlunsplit(("https", u.netloc, u.path, "", ""))
    return (dropbox_direct(link) if "dropbox" in host else clean), host + u.path


def ytdlp_channel(url: str) -> str | None:
    """Channel url of a playlist (so videos inside it pass source_allowed, which checks the video's channel).
    Best effort, short timeout; None offline."""
    exe = shutil.which("yt-dlp")
    if not exe:
        return None
    try:
        r = subprocess.run([exe, "-J", "--flat-playlist", "--playlist-items", "1", "--no-warnings", url],
                           capture_output=True, timeout=40)
        info = json.loads(r.stdout.decode("utf-8", "replace") or "{}")
        ch = info.get("channel_url") or info.get("uploader_url")
        return urllib.parse.urlsplit(ch).netloc.removeprefix("www.") + urllib.parse.urlsplit(ch).path if ch else None
    except Exception:  # noqa: BLE001
        return None


# ------------------------------------------------------------------ reading the rules

NUM_WORDS = {"one": 1, "once": 1, "two": 2, "twice": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
             "eight": 8, "nine": 9, "ten": 10, "twelve": 12, "fourteen": 14}
_N = r"(\d{1,3}|one|once|two|twice|three|four|five|six|seven|eight|nine|ten|twelve|fourteen)"


def _n(x: str) -> int:
    return int(x) if x.isdigit() else NUM_WORDS[x.lower()]


def sentences(text: str) -> list[str]:
    """Rule lines and sentences, bullets stripped. 'A.I.' and 'U.S.' are kept whole."""
    text = re.sub(r"\bA\.I\.?(?=\W|$)", "AI", text or "", flags=re.I)
    text = re.sub(r"\bU\.S\.?(?=\W|$)", "US", text)
    out = []
    for line in text.replace("\r", "\n").split("\n"):
        line = re.sub(r"^[\s\u2022*\-\u2013\u2014>#]+|^\d+[.)]\s+", "", line).strip()
        if not line:
            continue
        for part in re.split(r"(?<=[.!?])\s+(?=[A-Z0-9\"'(@#*\u201c])", line):
            part = part.strip()
            if part:
                out.append(part)
    return out


NEG = re.compile(
    r"\b(no|not|never|none|nor|without|cannot|can'?t|don'?t|do not|doesn'?t|does not|won'?t|mustn'?t|must not|may not|"
    r"should not|shouldn'?t|isn'?t|aren'?t|wasn'?t|prohibit\w*|ban|bans|banned|forbid\w*|disallow\w*|reject\w*|refus\w*|"
    r"avoid|illegal|violat\w*|disqualif\w*|void|invalid\w*|ineligible|unacceptable|off[- ]limits|against the rules)\b", re.I)
AI_RE = (r"(?<![\w-])A\.?I\.?(?![\w])|artificial intelligence|chat ?gpt|\bgpt\b|midjourney|eleven ?labs|text[- ]to[- ]speech|"
         r"\btts\b|deepfake|synthetic|voice[- ]?clon\w+|(?:machine|computer|algorithm)[- ]generated|\bLLMs?\b|generative|"
         r"AI[- ]?(?:generated|edited|powered|made|created|voice\w*)")
TOOL_RE = (r"opus ?clips?|\bklap\b|vizard|\bmunch\b|submagic|\bquso\b|vidyo|2short|auto[- ]?clipp\w*|"
           r"(?:clipping|clip[- ]?making|clip[- ]?generat\w*|repurposing|editing|video[- ]?editing) "
           r"(?:tool|software|app|bot|program|service|platform)s?|clip (?:generator|maker)s?|"
           r"third[- ]?party (?:apps?|tools?|software|services?|platforms?|editors?|schedulers?|posting)|"
           r"external (?:tools?|apps?|software)|"
           r"(?:auto|automatic(?:ally)?|automated)[- ](?:cut|clip|edit|caption|post|upload|schedul|generat|publish)\w*|"
           r"auto[- ]?(?:post|upload|schedul|publish|edit|generat)\w*|"
           r"schedul(?:ing|ers?)\b|schedule[sd]? (?:your )?(?:posts?|uploads?)|scheduled (?:posts?|uploads?)|"
           r"(?:post|upload)\w* (?:via|through|using|with) (?:a |an )?(?:third|api|tool|app|software|bot)")
AUTO_RE = r"automat\w+|\bbots?\b|\bscripts?\b"
REQ_RE = (r"manual(?:ly)?[- ]?(?:edit\w*|made|cut|created)|(?:edit\w*|cut|made|created) (?:\w+ ){0,2}(?:manually|by hand|"
          r"by a human|yourself)|hand[- ]?(?:edit\w*|made|cut|crafted)|human[- ]?(?:edit\w*|made|only|created|crafted)|"
          r"made by (?:a )?human|real (?:human )?(?:editor|person)s?|"
          r"post\w* natively|native(?:ly)? (?:post\w*|upload\w*)|(?:post|upload)\w* (?:directly |manually |natively )?"
          r"(?:from|on|via|through|in|with) (?:the |your |a |an |each )?(?:tiktok |instagram |native )?(?:app|phone|mobile|device)|"
          r"from your (?:phone|mobile|device)|manual(?:ly)? (?:post\w*|upload\w*)|post\w* manually")
ENG_RE = (r"fake|engagement|purchas\w*|bought|buy\w*|boost\w*|inflat\w*|\bviews?\b|\blikes?\b|followers?|comments?|"
          r"subscribers?|spam\w*|view ?bot\w*|sock ?puppet|giveaway")
ALLOW_RE = (r"\b(?:welcome|allowed|permitted|fine|ok(?:ay)?|encouraged|accepted|acceptable|no problem|"
            r"not (?:a problem|an issue|banned|prohibited|restricted|forbidden))\b|"
            r"\byou (?:may|can|could|are free to|are welcome to)\b[^.]{0,40}\buse\b|\bfeel free to\b|"
            r"\bno restrictions? (?:on|about|for)\b|\bnot restricted\b|\bgo ahead and use\b")
BENIGN_NEG = re.compile(r"\bno problem\b|\bnot (?:a problem|an issue|banned|prohibited|restricted|forbidden)\b|"
                        r"\bno restrictions? (?:on|about|for)\b|\bnot restricted\b", re.I)
NOREQ = re.compile(r"(?:not|n't|never)\s+(?:be\s+)?(?:required|needed|necessary|mandatory|have to|need to)|\bno need\b|"
                   r"\boptional\b|\bdoesn'?t matter\b|\bnot a requirement\b", re.I)
CAVEAT = re.compile(r"\b(?:except|unless|only if|as long as|provided|but not|disclos\w*|approv\w*|permission|ask first|"
                    r"check with|label\w*)\b", re.I)
SOFT_RE = re.compile(r"\b(?:only|limit\w*|restrict\w*|approved|disclos\w*|label\w*|permission|check with|ask|"
                     r"depending|case[- ]by[- ]case|may be (?:rejected|reviewed))\b", re.I)
_TOK = {k: re.compile(v, re.I) for k, v in (("ai", AI_RE), ("tool", TOOL_RE), ("auto", AUTO_RE))}
_ENG = re.compile(ENG_RE, re.I)
_REQ = re.compile(REQ_RE, re.I)
_ALLOW = re.compile(ALLOW_RE, re.I)


def _tokens(s: str) -> set[str]:
    return {k for k, r in _TOK.items() if r.search(s)}


def _clauses(sent: str) -> list[str]:
    return [c.strip() for c in re.split(r";|,?\s+but\s+|\bhowever\b|\balthough\b|,\s+(?=(?:no|not|never|don'?t|do not)\b)",
                                         sent, flags=re.I) if c.strip()]


def automation_analysis(text: str) -> dict:
    """Three-way reading of the rules: verdict 'allowed' | 'banned' | 'unclear', the exact sentences behind it.
    Ban = a sentence that names AI / automation / clipping tools / bots / third-party apps next to a prohibition, or one
    that requires the opposite (manually edited, human edited only, post natively from your phone).
    Not a ban: 'no bots / fake engagement / purchased views' (that is about engagement), 'AI' inside a word,
    and sentences that say AI or tools are welcome. A sentence that allows with a catch is 'unclear'."""
    sents = sentences(text)
    if len(" ".join(sents)) < 25:
        return {"verdict": "unclear", "banned": [], "allowed": [], "soft": [],
                "reason": "no rules text to check"}
    banned, allowed, soft = [], [], []
    for sent in sents:
        shown = sent[:220]
        clauses = _clauses(sent)
        had_allow = False
        for cl in clauses:
            toks = _tokens(cl)
            if _REQ.search(cl) and not NOREQ.search(cl) and not (NEG.search(cl) and not re.search(r"\b(must|only|required)\b", cl, re.I)):
                banned.append(shown)
                break
            if not toks:
                if had_allow and NEG.search(cl) and re.search(r"\b(but|however|except)\b", sent, re.I):
                    soft.append(shown)
                continue
            if _ALLOW.search(cl) and not NEG.search(BENIGN_NEG.sub(" ", cl)):
                had_allow = True
                (soft if CAVEAT.search(sent) or re.search(r"\bonly\b", sent, re.I) else allowed).append(shown)
                continue
            if toks <= {"auto"} and _ENG.search(cl):
                continue   # "no bots, fake engagement, purchased views": about engagement, not editing tools
            if NEG.search(cl):
                banned.append(shown)
                break
            if SOFT_RE.search(cl) and toks != {"auto"}:
                soft.append(shown)
    banned, allowed, soft = (list(dict.fromkeys(x)) for x in (banned, allowed, soft))
    if banned:
        return {"verdict": "banned", "banned": banned, "allowed": allowed, "soft": soft,
                "reason": "rules restrict AI/automated tools: " + " | ".join(banned[:3])}
    if soft:
        return {"verdict": "unclear", "banned": [], "allowed": allowed, "soft": soft,
                "reason": "rules mention AI/automation with a condition a human must read: " + " | ".join(soft[:3])}
    if allowed:
        return {"verdict": "allowed", "banned": [], "allowed": allowed, "soft": [],
                "reason": "rules say AI/tools are allowed: " + " | ".join(allowed[:2])}
    return {"verdict": "allowed", "banned": [], "allowed": [], "soft": [],
            "reason": "rules read in full: no ban on AI, automation or clipping tools (bots / fake engagement bans are "
                      "about engagement)"}


def automation_verdict(text: str) -> tuple[bool | None, str]:
    """(allowed, evidence): True allowed, False banned, None unclear (missing / conditional rules)."""
    a = automation_analysis(text)
    return {"allowed": True, "banned": False, "unclear": None}[a["verdict"]], a["reason"]


DISCLOSURE_TAGS = ("#ad", "#sponsored", "#partner", "#paidpartnership", "#brandpartner", "#affiliate", "#promo", "#collab")
FACE_RE = re.compile(r"\b(?:show|showing|reveal|feature|appear|visible|see)\b[^.]{0,30}\b(?:your |the )?face\b|face[- ]?cam|"
                     r"face on (?:camera|screen)|on[- ]camera|talking[- ]heads?|record yourself|film yourself|"
                     r"voice[- ]?overs?|your (?:own )?voice|narrat\w+|speak(?:ing)? (?:to|on) (?:the )?camera|"
                     r"selfie|facecam|lip[- ]?sync", re.I)
MUST = re.compile(r"\b(?:must|need|needs|required?|requires?|have to|has to|should|include|add|record|mandatory)\b", re.I)
LANGS = r"spanish|french|german|portuguese|arabic|hindi|italian|russian|turkish|indonesian|japanese|korean|chinese|dutch|polish"


def parse_brief(text: str) -> dict:
    """Every rule the clipper can act on, read from brief / description text."""
    sents = sentences(text)
    flat = "\n".join(sents)
    out: dict = {}
    mentions, hashtags, disclosure = [], [], None
    for s in sents:
        neg = bool(NEG.search(s)) and not re.search(r"\b(must|required)\b", s, re.I)
        if re.search(r"\btag|mention|caption|credit", s, re.I) and not neg:
            # only sentences that ask for tags, never example links (tiktok.com/@someone)
            mentions += [m.rstrip(".") for m in re.findall(r"(?<![\w./@])@[A-Za-z0-9_.]{3,30}", s)]
        if re.search(r"hashtag|include|use|add|caption|required|must", s, re.I) and not neg:
            hashtags += re.findall(r"(?<![\w&])#[A-Za-z][\w]{1,30}", s)
        if re.search(r"disclos|sponsor|paid partnership|#ad\b|affiliate|promo", s, re.I) and not neg:
            for t in re.findall(r"#[A-Za-z]\w+", s):
                if t.lower() in DISCLOSURE_TAGS and not disclosure:
                    disclosure = t
    out["mentions"] = list(dict.fromkeys(mentions))[:4]
    out["mentions_last"] = bool(
        re.search(r"end\s+(?:of\s+)?(?:every|each|all|the|your|any)?\s*(?:captions?|posts?)\s+with|"
                  r"at the end of (?:every|each|the|your|all|any)?\s*captions?|"
                  r"(?:captions?|posts?)\s+(?:must|should|need to)\s+end\s+with|last (?:thing )?in (?:the |your )?caption|"
                  r"(?:tags?|mentions?)\s+(?:must |should )?(?:go |be |come |placed |put )?(?:at )?the end", flat, re.I))
    skip = ("#fyp", "#foryou", "#foryoupage", "#viral") + DISCLOSURE_TAGS
    out["hashtags"] = [t for t in dict.fromkeys(hashtags) if t.lower() not in skip][:5]
    out["disclosure"] = disclosure
    out["disclosure_unspecified"] = bool(re.search(r"disclos\w+|paid partnership", flat, re.I)) and not disclosure

    # length
    mn = mx = None
    for s in sents:
        if re.search(r"\b(first|hook|opening|intro|within the)\b", s, re.I):
            continue
        unit = r"(s\b|secs?\b|seconds?\b|minutes?\b|mins?\b)"
        sec = lambda v, u: int(v) * (60 if u.lower().startswith("m") else 1)  # noqa: E731
        m = re.search(r"(?:minimum|min\.?|at least|no (?:shorter|less) than|not (?:shorter|less) than|longer than|"
                      r"more than|over)\s*(?:video |clip )?(?:length|duration)?\s*(?:of|:)?\s*(\d{1,3})\s*\+?\s*" + unit, s, re.I) \
            or re.search(r"(\d{1,3})\s*\+?\s*" + unit + r"\s*(?:minimum|min\b|or (?:more|longer))", s, re.I)
        if m and mn is None:
            mn = sec(m.group(1), m.group(2))
        m = re.search(r"(?:maximum|max\.?|up to|no (?:longer|more) than|not (?:longer|more) than|under|less than|below|"
                      r"shorter than)\s*(?:video |clip )?(?:length|duration)?\s*(?:of|:)?\s*(\d{1,3})\s*" + unit, s, re.I)
        if m and mx is None:
            mx = sec(m.group(1), m.group(2))
        m = re.search(r"(\d{1,3})\s*(?:-|\u2013|\u2014|to)\s*(\d{1,3})\s*" + unit, s, re.I)
        if m and re.search(r"video|clip|length|duration|long|short", s, re.I):
            a, b = sec(m.group(1), m.group(3)), sec(m.group(2), m.group(3))
            if a < b:
                mn, mx = (mn if mn is not None else a), (mx if mx is not None else b)
    out["min_seconds"], out["max_seconds"] = mn, mx

    # page name
    out["page_word"] = None
    for s in sents:
        m = re.search(r"(?:page|account|profile|channel|user\s?name|handle)(?:\s+(?:name|handle|username|bio))?\s+"
                      r"(?:must|should|needs? to|has to|have to|shall)\s+(?:be\s+)?(?:include|contain|have|feature|mention|say|use|"
                      r"start with|begin with)s?\s+(?:the\s+)?(?:word\s+|name\s+|text\s+)?[\"'\u201c\u2018]?([A-Za-z0-9][\w.]{1,30})", s, re.I)
        if m and m.group(1).strip(".").lower() not in ("the", "a", "an", "your", "tiktok", "clips", "clip", "word", "name", "brand"):
            out["page_word"] = m.group(1).strip(".")
            break

    # posting pace
    ppw = None
    for s in sents:
        if ppw:
            break
        m = (re.search(r"(?:at least|minimum(?: of)?|min\.?|a minimum of)\s*" + _N + r"\s*(?:\w+\s+)?(?:times|posts?|videos?|clips?|slideshows?)?"
                       r"\s*(?:per|a|each|every|/)\s*week", s, re.I)
             or re.search(_N + r"\s*(?:posts?|videos?|clips?|times|slideshows?)\s*(?:per|a|each|/)\s*week", s, re.I)
             or re.search(_N + r"\s*x\s*(?:per|a)\s*week", s, re.I)
             or re.search(r"weekly minimum[: of]*" + _N, s, re.I))
        if m:
            ppw = _n(m.group(1))
            continue
        m = re.search(r"(?:at least|minimum(?: of)?)?\s*" + _N + r"\s*(?:posts?|videos?|clips?|times)?\s*(?:per|a|each|every)\s*day", s, re.I)
        if m and re.search(r"post|upload|video|clip", s, re.I) and not re.search(r"keep|live|stay", s, re.I):
            ppw = _n(m.group(1)) * 7
        elif re.search(r"\b(?:post|upload) daily\b|\bdaily posts?\b", s, re.I):
            ppw = 7
    out["posts_per_week"] = ppw

    m = (re.search(r"(\d+(?:\.\d+)?)\s*%\s*(?:or more\s*)?(?:\w+\s+)?engagement", flat, re.I)
         or re.search(r"engagement(?: rate)?\s*(?:of|above|over|at least|minimum|min|:)?\s*(?:of\s*)?(?:at least\s*)?"
                      r"(\d+(?:\.\d+)?)\s*%", flat, re.I))
    out["min_engagement"] = float(m.group(1)) / 100 if m else None
    m = re.search(r"(?:minimum|at least|min\.?)\s*(\d[\d,]*)\s*(k)?\s*views?\b(?!\s*(?:per|a)\s*(?:day|week))", flat, re.I) \
        or re.search(r"(\d[\d,]*)\s*(k)?\s*views?\s*(?:to qualify|to earn|to count|to be paid|minimum|required)", flat, re.I)
    mv = int(m.group(1).replace(",", "")) * (1000 if m and m.group(2) else 1) if m else None
    out["min_views"] = mv if mv and mv >= 100 else None
    out["no_competitors"] = bool(re.search(r"compet\w+ (prop firms?|brands?)|competitor", flat, re.I))
    m = re.search(r"(?:at least|minimum(?: of)?)\s*(\d+)\s*days", flat, re.I)
    out["keep_live_days"] = int(m.group(1)) if m and re.search(r"live|up\b|keep|remain|delete|public", flat, re.I) else None

    # one-line flags with the sentence that caused them
    def hit(pred) -> str | None:
        return next((s[:200] for s in sents if pred(s)), None)
    out["language"] = None
    out["other_language"] = None
    for s in sents:
        if re.search(r"english[- ]only|only (?:in )?english|(?:must|should) be (?:in )?english|english language|"
                     r"(?:content|videos?|captions?|posts?)\s+(?:must be |in |are |is )?(?:in )?english", s, re.I) \
                and not NEG.search(re.sub(r"english", "", s, flags=re.I)):
            out["language"] = "en"
            break
    ol = hit(lambda s: re.search(r"(?:%s)[- ]only|(?:must|should) be (?:in )?(?:%s)|in (?:%s) only" % (LANGS, LANGS, LANGS), s, re.I))
    out["other_language"] = ol
    out["geo_audience"] = hit(lambda s: re.search(r"\b(audience|viewers|followers|views)\b", s, re.I)
                              and re.search(r"tier\s*[123]|\b(?:US|USA|UK|Canada|Australia|western|english[- ]speaking)\b|countr\w+|geo\w*", s, re.I))
    out["geo_creator"] = hit(lambda s: re.search(r"\b(?:creators?|clippers?|you|account holders?|participants?|residents?)\b", s, re.I)
                             and MUST.search(s) and re.search(r"\b(?:live|located|based|reside|resident|citizen|from)\b", s, re.I)
                             and re.search(r"\b(?:US|USA|UK|Canada|Australia|Europe|countr\w+|tier\s*1|states)\b", s, re.I)
                             and not re.search(r"audience|viewers", s, re.I))
    out["no_watermark"] = bool(hit(lambda s: re.search(r"watermark", s, re.I) and (NEG.search(s) or re.search(r"remove|clean|free of", s, re.I))))
    out["logo_required"] = bool(hit(lambda s: re.search(r"\blogo\b", s, re.I) and MUST.search(s) and not NEG.search(s)
                                    or re.search(r"\b(?:keep|use|show)\b[^.]{0,30}\blogo\b", s, re.I) and not NEG.search(s)))
    out["no_coposting"] = hit(lambda s: re.search(r"co-?post\w*|collab\w*|duets?\b|stitch\w*|remix", s, re.I) and NEG.search(s))
    out["no_cross_post"] = hit(lambda s: re.search(r"repost|same (?:content|clip|video)|duplicate|multiple accounts|twice", s, re.I)
                               and NEG.search(s))
    out["likes_visible"] = bool(re.search(r"likes? (?:must be |visible|public)|keep likes|public likes", flat, re.I))
    out["face_voice"] = hit(lambda s: FACE_RE.search(s) and MUST.search(s) and not NEG.search(s) and not NOREQ.search(s)
                            and not re.search(r"face[- ]?less", s, re.I))
    return out


def rules_warnings(rules: dict, live: dict | None = None, have_logo: bool = False) -> list[str]:
    w = []
    if rules.get("face_voice"):
        w.append(f"The brief asks for your face / own voice / voice-over, which the clipper cannot do: \"{rules['face_voice']}\"")
    if rules.get("geo_audience"):
        w.append(f"Audience location limit (the clipper cannot choose who watches; check your accounts' audience): "
                 f"\"{rules['geo_audience']}\"")
    if rules.get("geo_creator"):
        w.append(f"Creator location limit (only works if your accounts qualify): \"{rules['geo_creator']}\"")
    if rules.get("other_language"):
        w.append(f"Campaign wants another language than English (the clipper writes English captions): \"{rules['other_language']}\"")
    if rules.get("logo_required") and not have_logo:
        w.append("The brief requires the brand logo on the video, but no logo file was found: send the logo file link.")
    if rules.get("disclosure_unspecified"):
        w.append("The brief asks for a sponsorship disclosure but names no wording: #ad is used; confirm it.")
    if rules.get("min_seconds") and rules.get("max_seconds") and rules["min_seconds"] >= rules["max_seconds"]:
        w.append("Brief's minimum length is not below its maximum length; check the clip lengths by hand.")
    if rules.get("no_coposting"):
        w.append(f"No co-posting / collabs: keep it off in TikTok: \"{rules['no_coposting']}\"")
    if rules.get("no_cross_post"):
        w.append(f"Same clip must not go to several accounts / twice: \"{rules['no_cross_post']}\"")
    if live:
        types = live.get("types") or []
        if types and not any(t in ("Clipping", "Slideshows") for t in types):
            w.append(f"Campaign type is {', '.join(types)}, not clipping: it may need original content.")
        if any("UGC" in t and "face" in t.lower() for t in types):
            w.append("UGC with face: you would have to film yourself, which the clipper cannot do.")
        rates = live.get("rates") or {}
        if rates and "tiktok" not in rates:
            w.append(f"The campaign pays on {', '.join(rates)} but not TikTok; the autopilot posts to TikTok only.")
    return w


# ------------------------------------------------------------------ building


def brand_of(name: str, org: str) -> str:
    base = re.split(r"\||\[|\(|-|—", name)[0]
    base = re.sub(r"\$[\d.,]+k?|\b(official|campaign|clips?|ugc|prop firm|podcast|budget|post|for|the|x)\b|\w*(clipping|slideshow)\w*",
                  " ", base, flags=re.I)
    words = [w for w in base.split() if w.strip()]
    return " ".join(words[:2]) or org


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:40] or "campaign"


def _intake(links, brief_text, key, campaigns_dir, get, download, post, resolve) -> dict:
    """Walk the owner's links: brief text, footage and logo. Everything it could not use is in `skipped`."""
    r = {"brief": "", "brief_sources": [], "skipped": [], "drive_folder": None, "urls": [], "allowed": [], "local": None,
         "logo": None, "videos": 0, "brief_failed": False}
    if brief_text and brief_text.strip():
        r["brief"] += "\n" + brief_text.strip()
        r["brief_sources"].append("pasted text")
    for link in links:
        kind = classify(link)
        if kind in ("gdoc", "notion", "http_doc", "dropbox_file"):
            t, msg = fetch_brief(link, kind, get, post)
            if t:
                r["brief"] += "\n" + t
                r["brief_sources"].append(kind)
            elif kind == "http_doc":
                r["brief_failed"] = True
                r["skipped"].append(f"{link}: not a brief I could read ({msg}). If it is footage, send a Drive folder or "
                                    f"YouTube link; if it is the brief, paste its text with --brief-text")
            else:
                r["brief_failed"] = True
                r["skipped"].append(f"brief {link}: {msg}")
        elif kind == "gfolder":
            r["drive_folder"] = re.search(r"/folders/([\w-]+)", link).group(1)
        elif kind == "gfile":
            fid = (re.search(r"/file/d/([\w-]+)", link) or re.search(r"[?&]id=([\w-]+)", link) or re.search(r"/d/([\w-]+)", link))
            fid = fid.group(1) if fid else None
            if not fid:
                r["skipped"].append(f"{link}: no Drive file id in this link")
                continue
            tmp = Path(tempfile.mkdtemp(prefix="onboard-"))
            try:
                p = download(fid, tmp) if download else None
                if p and Path(p).exists():
                    p = Path(p)
                    ext = p.suffix.lower()
                    if ext in IMAGE_EXT:
                        dest = campaigns_dir / "logos" / key
                        dest.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(p, dest / p.name)
                        r["logo"] = dest / p.name
                    elif ext in VIDEO_EXT:
                        dest = campaigns_dir / "footage" / key
                        dest.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(p, dest / p.name)
                        r["videos"] += 1
                        r["local"] = "copied"
                    else:
                        t, msg = bytes_to_text(p.read_bytes(), p.name)
                        if t and t.strip():
                            r["brief"] += "\n" + t
                            r["brief_sources"].append("drive file " + p.name)
                        else:
                            r["skipped"].append(f"Drive file {p.name}: {msg or 'unreadable'}")
                else:
                    t = None
                    try:   # a Google Doc stored in Drive has no downloadable file: export it as text
                        t = doc_text(f"https://docs.google.com/document/d/{fid}/edit", get)
                    except Exception:  # noqa: BLE001
                        pass
                    if t and t.strip():
                        r["brief"] += "\n" + t
                        r["brief_sources"].append("drive doc")
                    else:
                        r["skipped"].append(f"{link}: couldn't download it (not shared with 'anyone with the link', or no "
                                            f"downloader here). Share it publicly or paste the text with --brief-text")
            except Exception as e:  # noqa: BLE001
                r["skipped"].append(f"couldn't download {link}: {e}")
            finally:
                shutil.rmtree(tmp, ignore_errors=True)
        elif kind in ("youtube", "twitch", "kick", "video_site", "video_url", "dropbox_video"):
            src, prefix = url_source(link)
            r["urls"].append(src)
            r["allowed"].append(prefix)
            if kind == "youtube" and "playlist" in prefix and resolve:
                ch = resolve(src)
                if ch:
                    r["allowed"].append(ch)
        elif kind == "local":
            folder = Path(link).expanduser()
            files = [f for f in folder.rglob("*") if f.is_file()] if folder.is_dir() else [folder]
            vids = [f for f in files if f.suffix.lower() in VIDEO_EXT]
            logos = [f for f in files if f.suffix.lower() in IMAGE_EXT and "logo" in f.name.lower()]
            docs = [f for f in files if f.suffix.lower() in DOC_EXT and not vids]
            dest = campaigns_dir / "footage" / key
            for v in vids:
                dest.mkdir(parents=True, exist_ok=True)
                if not (dest / v.name).exists():
                    shutil.copy2(v, dest / v.name)
            r["videos"] += len(vids)
            if vids:
                r["local"] = str(folder)
            if logos and not r["logo"]:
                ld = campaigns_dir / "logos" / key
                ld.mkdir(parents=True, exist_ok=True)
                shutil.copy2(logos[0], ld / logos[0].name)
                r["logo"] = ld / logos[0].name
            for d in docs:
                t, msg = bytes_to_text(d.read_bytes(), d.name)
                if t and t.strip():
                    r["brief"] += "\n" + t
                    r["brief_sources"].append(d.name)
            if not vids and not logos and not docs:
                r["skipped"].append(f"{link}: no video, logo or brief file in it")
        elif kind == "dropbox_folder":
            r["skipped"].append(f"Dropbox folder {link}: folders can't be fetched without Dropbox's app. Download the videos "
                                f"and put them in a Google Drive folder (share: anyone with the link) or a local folder, "
                                f"then send that link")
        elif kind == "mega":
            r["skipped"].append(f"MEGA link {link}: MEGA needs its own app / key, so the cloud can't pull it. Put the "
                                f"videos in a Google Drive folder (anyone with the link) and send that link")
        elif kind == "example_post":
            r["skipped"].append(f"{link}: looks like an example post, not footage, so it was ignored")
        elif kind == "campaign":
            continue
        else:
            r["skipped"].append(f"{link}: not recognised (not a file or folder on this PC, and not a link type I know)")
    return r


def build(campaign_link: str, links: list[str], campaigns_dir: Path = HERE / "campaigns", get=_get,
          fetch=cr.fetch_campaign, download=None, today: str | None = None, brief_text: str | None = None,
          post=_post_json, resolve=ytdlp_channel) -> Path:
    live = fetch(campaign_link)
    brand = brand_of(live["name"], live["org"])
    key = slug(brand)
    day = today or dt.date.today().isoformat()
    if brief_text is None:
        brief_text = os.environ.get("ONBOARD_BRIEF_TEXT") or ""
    got = _intake(links, brief_text, key, campaigns_dir, get, download, post, resolve)
    brief = got["brief"]
    desc = (live.get("description") or "").strip()
    rules_text = (brief + "\n" + desc).strip()
    rules = parse_brief(rules_text) if rules_text else {}
    ana = automation_analysis(rules_text)
    allowed = {"allowed": True, "banned": False, "unclear": None}[ana["verdict"]]
    evidence = ana["reason"]
    rules_read = bool(brief.strip())
    no_rules_listed = live.get("content_rules") == 0 and live.get("requirements") == 0
    if got["brief_failed"] and not rules_read and allowed is not False:
        allowed, evidence = None, "a brief link was given but could not be read, so the rules are unknown"
    elif allowed is True and not rules_read and not no_rules_listed:
        # only the description was read, and the page says rules exist behind the join wall: not enough to say yes
        allowed, evidence = None, ("campaign page lists rules (content rules / creator requirements) that are only shown "
                                   "after joining, and no brief was given: need the brief text")
    elif allowed is None and not rules_read and no_rules_listed and not ana["soft"] and not desc:
        allowed, evidence = True, "campaign page lists no content rules or creator requirements and no brief was given"
    ana["verdict"] = {True: "allowed", False: "banned", None: "unclear"}[allowed]

    t = (live.get("rates") or {}).get("tiktok") or next(iter((live.get("rates") or {}).values()), {"cpm": 0, "min": 0, "max": 0})
    tmpl_file = campaigns_dir / "_template.json"
    tmpl = json.loads((tmpl_file if tmpl_file.exists() else HERE / "campaigns" / "_template.json").read_text(encoding="utf-8"))
    c = dict(tmpl)
    have_files = bool(got["drive_folder"] or got["local"] or got["videos"])
    sources = ([f"footage/{key}"] if have_files or not got["urls"] else []) + list(dict.fromkeys(got["urls"]))
    allowed_sources = [f"file:footage/{key}"] + list(dict.fromkeys(got["allowed"]))
    notes_extra = (" ".join(got["skipped"]) if got["skipped"] else "")
    c.update({
        "name": f"{brand} ({live['org']})",
        "marketplace": "whop",
        "permission": {"program": "Content Rewards", "campaign_url": live["url"], "verified_on": day,
                       "evidence": f"onboarded from the public campaign page: {evidence}",
                       "allowed_sources": allowed_sources},
        "cpm": t["cpm"], "fee_pct": 10, "min_payout": t["min"], "max_payout_per_clip": t["max"],
        "platforms": ["tiktok"], "sources": sources,
        "automation_allowed": allowed,
        "accounts": {"tiktok": "*"},
        "account_match": (rules.get("page_word") or brand.split()[0]).lower(),
        "disclosure": {"caption": rules.get("disclosure") or "#ad", "on_screen": rules.get("disclosure") or "#ad"},
        "banned_phrases": list(dict.fromkeys(BANNED + PROFANITY)),
        "cloud": True, "slideshows": False,
        "notes": f"Auto-onboarded {day}: {live['name']} by {live['org']}, "
                 f"${t['cpm']}/1K on TikTok, ${live.get('left') or 0:,.0f} of ${live.get('budget') or 0:,.0f} left. "
                 + (f"Campaign description: {desc[:500]} " if desc else "") + notes_extra,
    })
    c["caption"] = {"required_hashtags": rules.get("hashtags", []), "required_mentions": rules.get("mentions", []),
                    "mentions_last": rules.get("mentions_last", False), "required_text": "",
                    "hashtags": [f"#{key.replace('-', '')}"]}
    mn = max(8, (rules.get("min_seconds") or 0) + 1)
    mx = 55 if not rules.get("max_seconds") else max(mn, min(55, rules["max_seconds"] - 1))
    c["clip"] = dict(tmpl.get("clip") or {}, min=mn, max=mx, count=12)
    c["on_screen"] = dict(tmpl.get("on_screen") or {})
    if got["logo"]:
        c["on_screen"].update(logo=f"logos/{key}/{Path(got['logo']).name}", logo_position="top", logo_width=600)
    if got["drive_folder"]:
        c["footage_drive_folder"] = got["drive_folder"]
    if rules.get("language"):
        c["language"] = rules["language"]
    if rules.get("posts_per_week"):
        c["posts_per_week"] = rules["posts_per_week"]
    if rules.get("min_engagement"):
        c["min_engagement"] = rules["min_engagement"]
    if rules.get("min_views"):
        c["min_views"] = rules["min_views"]
    if rules_text:
        c["brief_text"] = rules_text[:6000]
    warnings = rules_warnings(rules, live, have_logo=bool(got["logo"]))
    missing = _missing(c, got, rules, ana, rules_read, have_files)
    c["onboard_warnings"] = warnings
    c["onboard_rules"] = {k: v for k, v in rules.items() if v not in (None, False, [], "")}
    c["onboard_rules"]["automation_verdict"] = ana["verdict"]
    c["onboard_rules"]["automation_sentences"] = ana["banned"] or ana["soft"] or ana["allowed"]
    c["onboard_missing"] = missing
    c["onboard_skipped"] = got["skipped"]
    path = campaigns_dir / f"{key}.json"
    campaigns_dir.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(c, indent=2) + "\n", encoding="utf-8")
    (campaigns_dir / "footage" / key).mkdir(parents=True, exist_ok=True)
    return path


def _missing(c: dict, got: dict, rules: dict, ana: dict, rules_read: bool, have_footage: bool) -> list[str]:
    """What the autopilot still needs, most important first; each line is what the owner sends."""
    m = []
    if c["automation_allowed"] is None:
        if not rules_read:
            m.append("the brief: its Google Doc / Notion / PDF link, or paste the text with --brief-text \"...\" "
                     "(needed to confirm AI / automation is allowed; until then the autopilot refuses to post)")
        else:
            m.append("a yes / no on automation: " + (ana["soft"][0] if ana["soft"] else "the rules text was unclear") +
                     " -> if a human confirms it is allowed, set automation_allowed to true in the campaign file")
    elif c["automation_allowed"] is False:
        m.append("nothing to send: the rules ban AI / automated tools, so nothing will post. Only a human who has checked "
                 "with the campaign owner should set automation_allowed to true")
    if not (have_footage or got["urls"]):
        m.append("footage: a Google Drive folder link (anyone with the link), or a YouTube / Twitch / Kick channel, "
                 "playlist or video link")
    if rules.get("logo_required") and not got["logo"]:
        m.append("the logo: a Drive file link to the logo image (png / jpg)")
    return m


def gdown_download(file_id: str, dest_dir: Path) -> Path | None:
    import gdown
    dest_dir.mkdir(parents=True, exist_ok=True)
    out = gdown.download(id=file_id, output=str(dest_dir) + "/", quiet=True)
    return Path(out) if out else None


def summary(path: Path) -> str:
    c = json.loads(Path(path).read_text(encoding="utf-8"))
    v = {True: "ALLOWED", False: "BANNED", None: "UNCLEAR"}[c["automation_allowed"]]
    r = c.get("onboard_rules", {})
    cap = c["caption"]
    lines = [f"wrote {path}", f"  {c['name']}: ${c['cpm']}/1K (min ${c['min_payout']}, max ${c['max_payout_per_clip']} per clip)",
             f"  automation verdict: {v}  (automation_allowed={c['automation_allowed']})"]
    for s in (r.get("automation_sentences") or [])[:4]:
        lines.append(f"      \"{s}\"")
    found = []
    if cap["required_mentions"]:
        found.append(f"tags {' '.join(cap['required_mentions'])}" + (" (must end the caption)" if cap["mentions_last"] else ""))
    if cap["required_hashtags"]:
        found.append("hashtags " + " ".join(cap["required_hashtags"]))
    found.append(f"disclosure {c['disclosure']['caption']}")
    found.append(f"clip length {c['clip']['min']}-{c['clip']['max']}s")
    if r.get("page_word"):
        found.append(f"page name must include '{r['page_word']}'")
    found.append(f"posts only from accounts with '{c['account_match']}' in the name")
    for k, label in (("posts_per_week", "posts a week"), ("min_engagement", "engagement floor"), ("min_views", "min views"),
                     ("keep_live_days", "days kept live"), ("language", "language")):
        if c.get(k) or r.get(k):
            found.append(f"{label} {c.get(k) or r.get(k)}")
    for k, label in (("no_watermark", "no platform watermark"), ("logo_required", "logo required"),
                     ("likes_visible", "likes visible")):
        if r.get(k):
            found.append(label)
    lines.append("  found: " + "; ".join(found))
    lines.append(f"  footage: {', '.join(c['sources'])}" + (f" + Drive folder {c['footage_drive_folder']}"
                                                          if c.get("footage_drive_folder") else ""))
    if c.get("onboard_warnings"):
        lines.append("  WARNINGS:")
        lines += [f"    - {w}" for w in c["onboard_warnings"]]
    if c.get("onboard_skipped"):
        lines.append("  SKIPPED:")
        lines += [f"    - {w}" for w in c["onboard_skipped"]]
    miss = c.get("onboard_missing") or []
    if miss:
        lines.append("  STILL MISSING:")
        lines += [f"    - {w}" for w in miss]
        lines.append(f"  NEXT: send me {miss[0].split(' (')[0]}")
    else:
        lines.append("  NEXT: nothing; the autopilot picks this campaign up on its next run.")
    return "\n".join(lines)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("campaign", help="the Content Rewards campaign link")
    ap.add_argument("links", nargs="*", help="brief (Google Doc / Notion / PDF), footage (Drive folder, YouTube, Twitch, "
                                              "Kick, local folder) and logo links")
    ap.add_argument("--brief-text", default=None, help="the brief's text, pasted")
    a = ap.parse_args(argv)
    p = build(a.campaign, a.links, download=gdown_download, brief_text=a.brief_text)
    print(summary(p))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
