"""Hooks: what the viewer sees and hears in the first 1-3 seconds.

Everything here is rule based, offline and deterministic. The one hard rule: a hook is made ONLY of words the speaker
said (contiguous, in order), after the campaign's spelling fixes. Nothing is paraphrased, added or "improved", so a hook
can never state a fact the speaker did not say. `grounded()` is the check and `make_hook()` refuses to return a hook
that fails it.

  make_hook(words, camp)          -> {"text", "kind", "start", "score"} or None   (on-screen title, first ~2.5 s)
  grounded(text, words)           -> bool                                         (verbatim check)
  lead_in_trim(words, min_keep)   -> number of leading words to drop              (host chatter / "okay so")
  cold_open_plan(words)           -> {"s", "e", "text"} or None                   (teaser: punchiest line plays first)
  drop_fillers(words)             -> (clean words, [filler Word])                 (um / uh cut out of audio + captions)
  emphasis(text)                  -> set of word indexes to paint in the accent colour
"""

from __future__ import annotations

import re

from vocab import BAD_START, EMOTION, HOOKS, MONEY, NUM_RE, norm, sentences

FILLER_SOUNDS = {"um", "uh", "uhm", "umm", "er", "erm", "ah", "hmm", "hm", "mm", "mmm", "eh", "uhh", "ahh", "uhhh"}
OPENER_FILLER = {"okay", "ok", "so", "yeah", "right", "alright", "well", "now", "and", "like", "cool", "great",
                 "thanks", "thank", "you", "welcome", "hey", "hi", "hello", "all", "good", "nice", "sure",
                 "um", "uh", "hmm", "mm", "oh", "wow"}
HOST_RE = re.compile(r"\b(tell (us|me)|introduce yourself|let'?s get (into|started)|welcome (back|to)|before we (start|begin)|"
                     r"my guest|thanks for (having|joining|coming)|subscribe|like and subscribe|"
                     r"what do you (think|do)|can you (explain|tell|talk)|could you (explain|tell|talk)|"
                     r"how (are|did) you|nice to meet|what'?s your|what is your|how long have you|"
                     r"how did you (get|start|begin)|where (are|did) you|do you (have|think|ever)|"
                     r"is there anything|any advice)\b", re.I)
CONTRAST_RE = re.compile(r"\b(but|not|never|instead|don'?t|doesn'?t|isn'?t|aren'?t|can'?t|won'?t|stop|nobody|no one|"
                         r"without|only|actually|wrong|myth|versus|than|rather)\b|n't\b", re.I)
NEGATION = {"not", "never", "no", "nobody", "nothing", "without", "don't", "dont", "doesn't", "doesnt", "isn't",
            "can't", "cant", "won't", "wont", "aren't", "didn't", "wasn't", "none", "neither", "nor", "stop"}
DEPENDENT_START = {"this", "that", "it", "these", "those", "they", "he", "she", "them", "there", "which", "then"}
INCOME_CLAIM = re.compile(r"\b(made|make|makes|making|earn|earned|earns|earning|profit|profits|revenue|income)\b.{0,40}"
                          r"(\$\s?\d|\d+\s?(k|m)\b|\bthousand|\bmillion)|(\$\s?\d[\d,.]*[kKmM]?)\s*(a|per|in a|every)\s*"
                          r"(day|week|month|year)", re.I)

DANGLE_END = {"or", "and", "but", "so", "the", "a", "an", "to", "with", "of", "for", "in", "on", "at", "that",
              "because", "if", "like", "my", "your", "is", "was", "are", "you", "i", "we", "it", "this", "then",
              "probably", "come", "can", "could", "would", "should", "will", "just", "really", "actually", "about",
              "from", "as", "when", "which", "who", "what", "how", "why", "where", "also", "even", "still", "very",
              "been", "being", "get", "got", "go", "going", "gonna", "wanna", "have", "had", "has", "do", "did", "does",
              "be", "were", "their", "our", "his", "her", "its", "there", "into", "onto", "than", "not", "whenever",
              "while", "until", "unless", "since", "whether", "would"}


def _headline(text: str, max_words: int = 11, strict: bool = False) -> str:
    """A complete-looking headline: the clause that fits, never ending on a dangling word.
    strict: return "" for a headline that is only a setup ("If you are coming in as a newbie")."""
    t = text.strip()
    for _ in range(3):   # "So, then, honestly..." openers add nothing to a headline
        t = re.sub(r"^(so|and|but|okay|ok|yeah|um|uh|like|well|then|now|also|honestly|basically|anyway|right)\b[, ]*",
                   "", t, flags=re.I).strip()
    words = t.split()
    if re.match(r"(if|when|once)\b", t, re.I) and len(words) <= max_words + 10:
        max_words += 8   # "If you..., you will..." needs both halves to land
    if len(words) > max_words + 3:   # a sentence a few words over the limit stays whole
        parts = re.split(r"(?<=[,;:])\s+", t)
        acc = []
        for part in parts:
            if len((" ".join(acc + [part])).split()) > max_words:
                break
            acc.append(part)
        if acc:
            words = " ".join(acc).split()
        else:  # no clause fits: cut before the last joining word inside the limit ("... and then I put")
            joins = [i for i, w in enumerate(words[:max_words + 5]) if i >= 4 and
                     re.sub(r"[^a-z]", "", w.lower()) in ("and", "but", "so", "then", "because", "or", "which", "where")]
            words = words[:joins[-1]] if joins else (words if len(words) <= 18 else words[:max_words])
    while len(words) > 3 and re.sub(r"[^a-z']", "", words[-1].lower()) in DANGLE_END:
        words.pop()
    out = " ".join(words).rstrip(",;:-")
    if strict and re.match(r"(if|when|once|whenever)\b", out, re.I) and "," not in out:
        return ""   # a condition without its payoff is not a hook
    return out[:1].upper() + out[1:]




# ---------------------------------------------------------------- verbatim check

def _toks(text: str) -> list[str]:
    return [t for t in (norm(x) for x in re.sub(r"[\u2018\u2019]", "'", text or "").split()) if t]


def apply_spelling(text: str, mapping: dict | None) -> str:
    """The campaign's spelling map ({"Trade Ever": "Tradever"}) applied to a plain string."""
    if not mapping or not text:
        return text
    for wrong in sorted(mapping, key=len, reverse=True):
        text = re.sub(r"(?<![A-Za-z])" + re.escape(wrong) + r"(?![A-Za-z])", mapping[wrong], text, flags=re.I)
    return text


def grounded(text: str, words: list, spelling: dict | None = None) -> bool:
    """True when `text` is a contiguous run of words the speaker said (case/punctuation ignored)."""
    need = _toks(apply_spelling(text, spelling))
    if not need:
        return False
    have = _toks(apply_spelling(" ".join(w.w for w in words), spelling))
    n = len(need)
    return any(have[i:i + n] == need for i in range(len(have) - n + 1))


# ---------------------------------------------------------------- hook title

def income_claim(text: str) -> bool:
    return bool(INCOME_CLAIM.search(text or ""))


def hook_kind(text: str, whole_sentence: str = "") -> str:
    t = text or ""
    if t.rstrip().endswith("?") or (whole_sentence.rstrip().endswith("?") and norm(t) == norm(whole_sentence)):
        return "question"
    if NUM_RE.search(t) and re.search(r"\d|\b(hundred|thousand|million|billion|percent|half|double|triple)\b", t, re.I):
        return "number"
    if CONTRAST_RE.search(t):
        return "contrast"
    return "claim"


def _hook_score(text: str, sent_text: str, offset: float, banned=None) -> float:
    toks = [norm(w) for w in text.split()]
    n = len(toks)
    if n < 4 or n > 13:
        return -99.0
    low = text.lower()
    s = 0.0
    kind = hook_kind(text, sent_text)
    s += {"question": 3.0, "number": 3.0, "contrast": 2.4, "claim": 1.0}[kind]
    s += 1.4 * sum(bool(re.search(p, low)) for p in HOOKS)
    s += 1.0 * sum(t in EMOTION for t in toks) + 0.5 * sum(t in MONEY for t in toks)
    s += 1.0 if re.search(r"\byou(r|'re)?\b", low) else 0.0           # talks straight to the viewer
    if toks[0] in DEPENDENT_START or toks[0] in BAD_START:
        s -= 3.0                                                       # "That is why..." needs the sentence before
    if re.search(r"\b(i mean|you know|kind of|sort of|basically|literally)\b", low):
        s -= 2.0
    if HOST_RE.search(low):
        s -= 6.0
    if income_claim(text):
        s -= 2.5
    s -= max(0, n - 9) * 0.35
    s += 2.0 if offset < 4 else (0.8 if offset < 10 else 0.0)
    if banned and banned(text):
        return -99.0
    return s


def _complete(h: str, sent: str) -> bool:
    """A hook is the whole sentence, or a clause that ends where the sentence has a comma / colon / semicolon.
    Anything cut mid-clause ("I think the difference between those two people") is a dangling thought."""
    a = [norm(x) for x in h.split()]
    b = sent.split()
    nb = [norm(x) for x in b]
    for i in range(len(nb) - len(a) + 1):
        if nb[i:i + len(a)] == a:
            end = i + len(a)
            if end >= len(b):
                return True
            return bool(re.search(r"[,;:.!?]$", b[end - 1])) or nb[end] in ("and", "but", "so", "then", "because", "or", "which", "where")
    return True


STARTERS = {"i", "i'm", "i've", "i'd", "i'll", "you", "you're", "you've", "you'll", "you'd", "we", "we're", "we've", "they",
            "they're", "he", "she", "it", "it's", "there", "there's", "the", "a", "an", "my", "your", "our", "most", "many",
            "some", "no", "nobody", "nothing", "everyone", "everybody", "people", "if", "when", "why", "how", "what",
            "who", "do", "does", "did", "is", "are", "can", "will", "never", "stop", "don't", "not", "actually", "every",
            "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "trading", "prop", "day",
            "traders", "money", "losing", "winning", "being", "having", "most", "over", "less", "more", "only", "just",
            "in", "at", "with", "without", "for", "to"}
STARTER_NOT_ALONE = {"in", "at", "with", "without", "for", "to", "just", "over"}   # fine mid-list, never a lone opener
VERBISH = re.compile(r"\b(is|are|was|were|am|be|been|being|have|has|had|do|does|did|can|could|will|would|should|get|got|"
                     r"make|makes|made|take|takes|want|need|know|go|goes|see|think|feel|say|lose|lost|win|pass|pay|paid|"
                     r"trade|trades|trading|work|works|mean|means|matter|matters|come|comes|learn|understand|use|treat|"
                     r"stop|try|keep|start|become|fail|fails|failed|buy|sell|hold|risk|turn|put|give|show|tell|ask|run|"
                     r"look|find|help|let|believe|happen|happens|care|love|hate|wait)\b|'(s|re|m|ve|ll|d)\b|n't\b|"
                     r"\w+(ed|ing)\b", re.I)


def _structurally_ok(h: str, names=frozenset()) -> bool:
    toks = [norm(x) for x in h.split()]
    if not toks:
        return False
    first = toks[0]
    if not (first in STARTERS and first not in STARTER_NOT_ALONE or re.match(r"[\d$]", first)
            or first.rstrip("%").isdigit() or first in names):
        return False
    return bool(VERBISH.search(h)) or h.rstrip().endswith("?")


def make_hook(words: list, camp: dict | None = None, max_words: int = 9, min_score: float = 2.2,
              fallback: bool = False) -> dict | None:
    """The on-screen hook title for a clip: the clip's own strongest short line, verbatim.
    kind is question / number / contrast / claim (what the line does), never invented text.
    A hook must read as a finished thought: whole sentence, or a clause that ends at a comma; it must open like a
    sentence (subject, question word, number...) and contain a verb. fallback=True: when nothing is strong, use the
    clip's first complete sentence (weak=True) so every video still opens with a title."""
    if not words:
        return None
    # local import: campaign has no dependency on this module
    import campaign as cmp
    spelling = (camp or {}).get("spelling")
    banned = (lambda t: cmp.banned_hit(camp, t)) if camp else None
    t0 = words[0].s
    names = {norm(v) for v in (spelling or {}).values()}      # brand / person names may open a sentence
    found = []
    for st in sentences(words):
        if len(st.words) < 3:
            continue
        sent_text = st.text
        spans = [sent_text]
        parts = [p for p in re.split(r"(?<=[,;:])\s+", sent_text) if len(p.split()) >= 4]
        if len(parts) > 1:
            spans += parts[:1] + [p for p in parts[1:] if re.match(r"(i|you|we|they|it|he|she|there|nobody|most)\b", p, re.I)]
        for sp in spans:
            h = _headline(sp, max_words=max_words, strict=True)
            if not h or len(h.split()) < 4 or len(h.split()) > max_words + 3:
                continue
            h = apply_spelling(h, spelling)
            if not grounded(h, words, spelling) or re.search(r"(^|\s)[,.]\d|\d\s[,.]\d", h):
                continue    # also refuse detached number fragments ("3 ,000"): they read as typos on screen
            if not _complete(h, sent_text) or not _structurally_ok(h, names):
                continue
            sc = _hook_score(h, sent_text, st.s - t0, banned)
            if sc <= -50:
                continue
            found.append({"text": h.rstrip(".,;:"), "kind": hook_kind(h, sent_text), "start": round(st.s, 2),
                          "score": round(sc, 2), "off": st.s - t0, "whole": norm(h) == norm(sent_text)})
    strong = [f for f in found if f["score"] >= min_score + (0.8 if f["kind"] == "claim" else 0.0)]
    best = max(strong, key=lambda f: f["score"], default=None)
    if best is None and fallback:
        early = [f for f in found if f["off"] < 4 and f["whole"] and f["score"] > -3]
        best = max(early, key=lambda f: f["score"], default=None)
        if best:
            best = dict(best, weak=True)
    if best is None:
        return None
    best = {k: v for k, v in best.items() if k not in ("off", "whole")}
    if income_claim(best["text"]):   # his claim, not ours: quote it
        best["text"] = "\u201c" + best["text"] + "\u201d"
    return best


def emphasis(text: str) -> set[int]:
    """Indexes of words to paint in the accent colour: numbers, money words and negations."""
    out = set()
    for i, w in enumerate(text.split()):
        n = norm(w)
        if NUM_RE.search(w) or n in NEGATION or n in {"million", "millions", "billion", "payout", "payouts",
                                                       "funded", "free", "percent"}:
            out.add(i)
    return out


# ---------------------------------------------------------------- fillers, lead-in, cold open

def drop_fillers(words: list) -> tuple[list, list]:
    """Split off um / uh sounds (kept apart so the audio cut can remove them too)."""
    keep, gone = [], []
    for w in words:
        (gone if re.sub(r"[^a-z]", "", w.w.lower()) in FILLER_SOUNDS else keep).append(w)
    return keep, gone


def lead_in_trim(words: list, min_keep: float = 8.0, max_drop_s: float = 9.0) -> int:
    """How many leading words to drop: pure filler sentences ("Okay, so.") and host chatter ("Tell us about...")
    at the very start, as long as at least `min_keep` seconds remain. 0 = nothing to trim."""
    if len(words) < 8:
        return 0
    sents = sentences(words)
    drop = 0
    for k, st in enumerate(sents[:3]):
        toks = [norm(w.w) for w in st.words]
        weak = (len(toks) <= 4 and all(t in OPENER_FILLER or t in FILLER_SOUNDS for t in toks if t)) \
            or bool(HOST_RE.search(st.text)) or (len(toks) <= 2)
        if not weak or st.e - words[0].s > max_drop_s:
            break
        if words[-1].e - sents[k + 1].s < min_keep if k + 1 < len(sents) else True:
            break
        drop += len(st.words)
    return drop


def cold_open_plan(words: list, camp: dict | None = None, min_offset: float = 6.0) -> dict | None:
    """Teaser cold open: the clip's punchiest complete sentence, when it comes late (>= min_offset into the clip),
    is short (1.4-6.5 s) and stands alone. The renderer plays it first, then the clip from its real start (the sentence
    is heard twice, like a trailer). Returns {"s", "e", "text"} or None."""
    import campaign as cmp
    if len(words) < 12:
        return None
    t0 = words[0].s
    spelling = (camp or {}).get("spelling")
    banned = (lambda t: cmp.banned_hit(camp, t)) if camp else None
    best = None
    for st in sentences(words):
        dur, off = st.e - st.s, st.s - t0
        n = len(st.words)
        if off < min_offset or dur < 1.4 or dur > 6.5 or not 5 <= n <= 16:
            continue
        if not re.search(r"[.!?]$", st.words[-1].w) or st.s - words[0].s > (words[-1].e - t0) - 4:
            continue
        txt = st.text
        toks = [norm(w.w) for w in st.words]
        if toks[0] in DEPENDENT_START or toks[0] in BAD_START or HOST_RE.search(txt) or income_claim(txt):
            continue
        if not grounded(txt, words, spelling):
            continue
        sc = _hook_score(txt, txt, 99, banned)    # offset bonus off: late lines compete on content only
        if sc >= 3.5 and (best is None or sc > best[0]):
            best = (sc, st)
    if not best:
        return None
    st = best[1]
    return {"s": max(t0, st.words[0].s - 0.05), "e": st.words[-1].e + 0.12, "text": st.text, "score": round(best[0], 2)}


def hook_lines(text: str, per_line: int = 16, max_lines: int = 3) -> list[str]:
    """Balanced wrap for the big title: no one-word last line, at most `max_lines`."""
    words = text.split()
    if not words:
        return []
    total = sum(len(w) for w in words) + len(words) - 1
    n = min(max_lines, max(1, -(-total // per_line)))
    target = total / n
    lines, cur = [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > target * 1.12 and len(lines) < n - 1:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    lines.append(cur)
    return lines
