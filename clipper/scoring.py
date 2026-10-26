"""Clip selection scoring v2: which 18-40 s windows of a long video are worth posting.

Every number below is a documented HEURISTIC, not a measurement. They are weights on features that short-form
editors agree on (a hook in the first seconds, a complete setup -> payoff story, numbers, contrast, direct address,
no rambling). The weights live in WEIGHTS so they can be re-fitted from real results: `fit_weights()` shrinks them
toward whatever correlates with the views you actually got (tracker.py data), and `load_weights()` reads a JSON
file (env CLIPPER_WEIGHTS or clipper/scoring_weights.json) so a fitted set can ship without code changes.

  features(words, ...)  -> {name: 0..1}        one number per idea, easy to read in tests
  penalties(words, ...) -> {name: points}      things that cost points (shown to the reviewer as plain words)
  score(...)            -> (score 0..100, reasons)
  select(cands, k)      -> diverse top-k       no two clips on one topic back to back, no repeated speech
"""

from __future__ import annotations

import json
import math
import os
import re
from pathlib import Path

from hooks import CONTRAST_RE, FILLER_SOUNDS, HOST_RE, INCOME_CLAIM, DEPENDENT_START, income_claim
from vocab import BAD_START, EMOTION, HOOKS, MONEY, NUM_RE, TOPICS, norm, sentences

# weights of the positive features (sum = 1.0). Defaults were chosen by hand from the editing rules above.
WEIGHTS = {
    "hook": 0.20,      # first 4 s: question, number, money word, "nobody / the truth / stop" patterns
    "money": 0.13,     # share of money / trading vocabulary
    "specific": 0.08,  # concrete numbers
    "emotion": 0.06,   # strong feelings, controversy
    "payoff": 0.07,    # ends on a finished sentence with a payoff word
    "energy": 0.09,    # louder / more animated than the rest of the episode
    "pace": 0.05,      # ~3.2 words a second
    "length": 0.06,    # 18-40 s sweet spot
    "arc": 0.09,       # setup -> payoff story inside the window
    "contrast": 0.05,  # but / not / never / instead: tension
    "opinion": 0.04,   # takes a side
    "address": 0.04,   # talks to "you"
    "clean": 0.04,     # no filler words, no stumbling
}

# points removed from the 0-100 score
PENALTY_POINTS = {
    "dangling_start": 15.0,   # begins mid-thought ("and that is why...")
    "filler_start": 8.0,
    "host_question": 10.0,
    "ramble": 12.0,
    "other_firm": 30.0,
    "income_claim": 8.0,
    "profanity": 6.0,
    "dead_air": 10.0,
    "music": 8.0,
}

OTHER_FIRMS = ["apex", "topstep", "ftmo", "myfundedfutures", "my funded futures", "mffu", "alpha futures",
               "lucid trading", "take profit trader", "fundednext", "funded next", "bulenox", "earn2trade",
               "tradeday", "tradeify", "the5ers", "funding pips", "e8 markets", "fundingticks", "elite trader funding"]
OPINION_RE = re.compile(r"\b(i think|i believe|i know|the truth|honestly|always|never|the best|the worst|overrated|"
                        r"underrated|wrong|mistake|biggest|stop|nobody|everyone|most people|the problem|the real)\b", re.I)
PAYOFF_RE = re.compile(r"\b(that'?s why|that is why|so (the|that)|which means|the answer|turns out|and that'?s|the result|"
                       r"in the end|at the end|bottom line|the point is|and that is|because of that|this is how)\b", re.I)
SETUP_RE = re.compile(r"\b(why|how|what if|imagine|the problem|the question|here'?s the thing|the reason|let me tell|"
                      r"most people|nobody|the biggest|when you|if you)\b|\?", re.I)
PROFANE = re.compile(r"\b(fuck\w*|shit\w*|bitch\w*|asshole\w*|dick\w*|pussy|nigg\w+|bullshit|motherfuck\w*|damn|cunt)\b", re.I)

_WEIGHTS_CACHE: dict | None = None


def load_weights(path: str | os.PathLike | None = None) -> dict:
    """WEIGHTS, overridden by a JSON file ({"hook": 0.25, ...}) when one exists. Unknown keys are ignored and the
    set is renormalised to sum 1, so a partial file is fine."""
    global _WEIGHTS_CACHE
    if path is None and _WEIGHTS_CACHE is not None:
        return _WEIGHTS_CACHE
    p = Path(path or os.environ.get("CLIPPER_WEIGHTS") or Path(__file__).with_name("scoring_weights.json"))
    w = dict(WEIGHTS)
    try:
        if p.is_file():
            data = json.loads(p.read_text(encoding="utf-8"))
            for k, v in data.items():
                if k in w and isinstance(v, (int, float)) and v >= 0:
                    w[k] = float(v)
    except (OSError, ValueError):
        pass
    tot = sum(w.values()) or 1.0
    w = {k: v / tot for k, v in w.items()}
    if path is None:
        _WEIGHTS_CACHE = w
    return w


def fit_weights(samples: list[tuple[dict, float]], prior: dict | None = None, strength: float = 40.0) -> dict:
    """Blend the prior weights with what actually predicted views.
    samples: [(features dict from features(), views), ...]. For each feature the rank correlation with log(views) is
    taken (positive part only); the fitted share counts n / (n + strength), so 10 posts barely move the weights and
    several hundred mostly decide them. Returns weights summing to 1."""
    prior = dict(prior or WEIGHTS)
    n = len(samples)
    if n < 8:
        return prior
    ys = [math.log1p(max(v, 0)) for _, v in samples]

    def ranks(xs):
        order = sorted(range(len(xs)), key=lambda i: xs[i])
        r = [0.0] * len(xs)
        for pos, i in enumerate(order):
            r[i] = float(pos)
        return r

    ry = ranks(ys)
    corr = {}
    for k in prior:
        xs = [f.get(k, 0.0) for f, _ in samples]
        rx = ranks(xs)
        mx, my = sum(rx) / n, sum(ry) / n
        sx = math.sqrt(sum((a - mx) ** 2 for a in rx)) or 1.0
        sy = math.sqrt(sum((b - my) ** 2 for b in ry)) or 1.0
        corr[k] = max(0.0, sum((a - mx) * (b - my) for a, b in zip(rx, ry)) / (sx * sy))
    tot = sum(corr.values())
    lam = n / (n + strength)
    fitted = {k: (corr[k] / tot if tot else prior[k]) for k in prior}
    mixed = {k: (1 - lam) * prior[k] + lam * fitted[k] for k in prior}
    s = sum(mixed.values()) or 1.0
    return {k: round(v / s, 4) for k, v in mixed.items()}


# ---------------------------------------------------------------- features

def _trap(x: float, lo0: float, lo1: float, hi1: float, hi0: float) -> float:
    """0 below lo0, ramps up to 1 at lo1, flat to hi1, ramps down to 0 at hi0."""
    if x <= lo0 or x >= hi0:
        return 0.0
    if x < lo1:
        return (x - lo0) / max(lo1 - lo0, 1e-9)
    if x > hi1:
        return (hi0 - x) / max(hi0 - hi1, 1e-9)
    return 1.0


def sweet_spot(args) -> tuple[float, float]:
    lo, hi = max(18.0, float(getattr(args, "min", 18))), min(40.0, float(getattr(args, "max", 40)))
    if lo >= hi:
        lo, hi = float(getattr(args, "min", 18)), float(getattr(args, "max", 40))
    return lo, hi


def features(words: list, dur: float, args, energy=(None, None), music: bool = False) -> tuple[dict, dict]:
    """(features 0..1, raw facts). `energy` = (mean z, peak z) of the window or (None, None) without audio."""
    toks = [norm(w.w) for w in words]
    n = max(len(toks), 1)
    text = " ".join(w.w for w in words)
    low = text.lower()
    t0 = words[0].s if words else 0.0
    first = " ".join(w.w for w in words if w.s < t0 + 4).lower()
    first8 = " ".join(w.w for w in words if w.s < t0 + 8).lower()

    hook = sum(1 for p in HOOKS if re.search(p, first))
    hook += 1.5 * bool(NUM_RE.search(first)) + 1.0 * ("?" in first)
    hook += 0.7 * sum(t in MONEY for t in first.split())
    f = {"hook": min(hook / 3.0, 1.0)}

    money_hits = sum(t in MONEY or t.replace("-", "") in MONEY for t in toks)
    money_hits += low.count("real estate") + low.count("net worth") + low.count("side hustle")
    f["money"] = min(money_hits / n * 12, 1.0)
    f["specific"] = min(len(NUM_RE.findall(text)) / 3.0, 1.0)
    f["emotion"] = min(sum(t in EMOTION for t in toks) / n * 20, 1.0)

    payoff = 0.6 if words and re.search(r"[.!?]$", words[-1].w) else 0.0
    last = " ".join(w.w for w in words if w.s > (words[-1].e if words else 0) - 6).lower()
    payoff += 0.4 * min(sum(t in MONEY or t in EMOTION for t in last.split()) / 2, 1)
    f["payoff"] = payoff

    mean_e, peak_e = energy
    f["energy"] = max(0.0, min((mean_e + 0.5 * peak_e + 0.5) / 2.5, 1.0)) if mean_e is not None else 0.5

    wps = n / max(dur, 1)
    f["pace"] = max(0.0, 1 - abs(wps - 3.2) / 2.0)
    lo, hi = sweet_spot(args)
    f["length"] = _trap(dur, max(lo * 0.45, 5.0), lo, hi, max(hi * 1.5, hi + 8))

    sents = sentences(words) if words else []
    # story arc: a setup (question / "the problem is" / "most people") in the first third, a payoff cue in the back half,
    # all inside 15-45 s
    arc = 0.0
    if len(sents) >= 2:
        third = t0 + dur / 3
        mid = t0 + dur / 2
        setup = any(SETUP_RE.search(s.text) for s in sents if s.s <= third)
        pay = any(PAYOFF_RE.search(s.text) or NUM_RE.search(s.text) for s in sents if s.s >= mid)
        arc = 0.45 * setup + 0.45 * pay
        arc += 0.1 * bool(words and re.search(r"[.!?]$", words[-1].w))
        arc *= _trap(dur, 8, 15, 45, 70)
    f["arc"] = min(arc, 1.0)

    f["contrast"] = min(len(CONTRAST_RE.findall(text)) / 3.0, 1.0)
    f["opinion"] = min(len(OPINION_RE.findall(text)) / 2.5, 1.0)
    f["address"] = min(len(re.findall(r"\byou(?:r|rs|'re|'ve|'ll)?\b", first8)) / 2.0, 1.0)
    fillers = sum(t in FILLER_SOUNDS for t in toks) + len(re.findall(r"\byou know\b|\bi mean\b|\bkind of\b|\bsort of\b", low))
    f["clean"] = max(0.0, 1.0 - fillers / n * 18)

    raw = {"n": n, "fillers": fillers, "wps": wps, "sents": len(sents), "text": text, "music": music}
    return f, raw


def penalties(words: list, dur: float, raw: dict, camp: dict | None = None) -> dict:
    """{name: points} for everything that makes a window worse."""
    out: dict = {}
    if not words:
        return out
    toks = [norm(w.w) for w in words]
    text = raw["text"]
    low = text.lower()
    sents = sentences(words)
    first = sents[0] if sents else None
    if toks[0] in BAD_START:
        out["filler_start"] = PENALTY_POINTS["filler_start"]
    if toks[0] in DEPENDENT_START or (words[0].w[:1].islower() and sum(bool(re.search(r"[.!?]$", w.w)) for w in words) >= 2
                                      and toks[0] not in ("i", "i'm", "i've", "i'd")):
        out["dangling_start"] = PENALTY_POINTS["dangling_start"]
    # a host asking: the window opens on a short question, or carries 2+ questions (an interview exchange)
    if first and (HOST_RE.search(first.text) or (first.text.rstrip().endswith("?") and len(first.words) <= 14
                                                 and sum(w.w.endswith("?") for w in words) >= 2)):
        out["host_question"] = PENALTY_POINTS["host_question"]
    n = raw["n"]
    if n >= 40:
        ttr = len(set(toks)) / n
        avg_sent = n / max(len(sents), 1)
        r = 0.0
        r += max(0.0, 0.45 - ttr) * 6        # repeating the same words
        r += max(0.0, avg_sent - 26) / 30    # run-on sentences
        r += max(0.0, raw["fillers"] / n - 0.05) * 8
        if r > 0.15:
            out["ramble"] = min(PENALTY_POINTS["ramble"], PENALTY_POINTS["ramble"] * r)
    if any(re.search(r"(?<![a-z0-9])" + re.escape(f) + r"(?![a-z0-9])", low) for f in OTHER_FIRMS):
        out["other_firm"] = PENALTY_POINTS["other_firm"]
    if income_claim(text):
        out["income_claim"] = PENALTY_POINTS["income_claim"]
    if PROFANE.search(text):
        out["profanity"] = PENALTY_POINTS["profanity"]
    spoken = sum(w.e - w.s for w in words)
    dead = 1 - min(spoken / max(dur, 1), 1)
    if dead > 0.4:
        out["dead_air"] = PENALTY_POINTS["dead_air"] * (dead - 0.4)
    if raw.get("music"):
        out["music"] = PENALTY_POINTS["music"]
    return out


REASON_TEXT = {
    "dangling_start": "starts mid-thought",
    "filler_start": "opens on filler",
    "host_question": "opens on a host question",
    "ramble": "rambling",
    "other_firm": "mentions another firm",
    "income_claim": "income claim: check before posting",
    "profanity": "contains swearing (masked)",
    "dead_air": "lots of dead air",
    "music": "background music or noise under the speech",
}


def score(words: list, dur: float, args, energy=(None, None), camp: dict | None = None,
          music: bool = False) -> tuple[float, list, dict]:
    """(score 0-100, plain-English reasons, feature dict)."""
    w = load_weights()
    f, raw = features(words, dur, args, energy, music)
    pos = 100 * sum(w[k] * f[k] for k in w)
    pen = penalties(words, dur, raw, camp)
    total = pos - sum(pen.values())
    reasons = []
    if f["hook"] >= 0.6:
        reasons.append("strong hook")
    if f["money"] > 0.5:
        reasons.append("money-dense")
    if f["specific"] > 0.6:
        reasons.append("specific numbers")
    if f["emotion"] > 0.5:
        reasons.append("emotional/controversial")
    if energy[1] is not None and energy[1] > 1.5:
        reasons.append("energy spike")
    if f["arc"] >= 0.8:
        reasons.append("clear setup and payoff")
    if f["contrast"] >= 0.67 and f["opinion"] >= 0.4:
        reasons.append("takes a side")
    if f["address"] >= 0.5:
        reasons.append("talks straight to the viewer")
    reasons += [f"watch: {REASON_TEXT[k]}" for k in pen]
    feats = dict(f)
    feats["_penalties"] = {k: round(v, 2) for k, v in pen.items()}
    return total, reasons, feats


# ---------------------------------------------------------------- selection with diversity

def _shingles(text: str, n: int = 3) -> set:
    t = [norm(x) for x in text.split()]
    return {" ".join(t[i:i + n]) for i in range(len(t) - n + 1)}


def select(cands: list, k: int, gap: float = 3.0, max_overlap: float = 0.5, topic_penalty: float = 6.0) -> list:
    """Greedy top-k that keeps the set varied: a window that repeats the topic of an already chosen clip loses
    `topic_penalty` points per shared topic, near-identical speech (shingle overlap > max_overlap) and overlapping
    time ranges are skipped. Same signature spirit as clipper.pick, so it is a drop-in replacement."""
    pool = sorted(cands, key=lambda c: c.score, reverse=True)
    chosen: list = []
    sh_chosen: list[set] = []
    while pool and len(chosen) < k:
        best, best_adj = None, -1e9
        for c in pool:
            if any(not (c.e + gap <= o.s or c.s >= o.e + gap) for o in chosen):
                continue
            sh = _shingles(c.text) if c.words else set()
            if sh and any(len(sh & o) / max(1, len(sh | o)) > max_overlap for o in sh_chosen):
                continue
            seen = sum(len(set(c.topics) & set(o.topics)) for o in chosen)
            adj = c.score - topic_penalty * seen
            if adj > best_adj:
                best, best_adj = c, adj
        if best is None:
            break
        chosen.append(best)
        sh_chosen.append(_shingles(best.text) if best.words else set())
        pool.remove(best)
    return chosen
