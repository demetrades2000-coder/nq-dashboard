"""Shared vocabulary and sentence helpers for the content engine (clipper, hooks, scoring).

Kept free of any import from clipper.py so hooks.py / scoring.py can use it without a cycle.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

MONEY = set("""money cash rich wealth wealthy millionaire millionaires billionaire billionaires million millions
billion billions revenue profit profits profitable income salary paycheck broke debt invest investing investment
investments investor investors stock stocks market markets crypto bitcoin btc ethereum business businesses
entrepreneur entrepreneurs entrepreneurship company companies sales sell selling sold client clients customer
customers offer offers price pricing margin margins equity passive dividend dividends portfolio trading trade
trades trader traders leverage scale scaling agency ecommerce dropshipping hustle startup funding valuation deal
deals tax taxes bank banks loan loans credit mortgage rent property properties dollars dollar bucks grand figures
roi cashflow cash-flow networth assets liabilities inflation recession economy real-estate realestate options
forex futures nasdaq spy fund funds hedge capital raise acquisition exit buyout franchise affiliate brand
marketing ads leads closer closing commission commissions retire retirement savings budget spend spending
expensive cheap afford luxury lambo ferrari rolex mansion jet""".split())

EMOTION = set("""crazy insane shocking shocked hate love fired quit lost lose losing failed fail failure scam scams
lie lies lying liar wrong stupid dumb poor worst best never everyone nobody truth honest honestly brutal
controversial regret afraid fear scared war destroy destroyed dangerous secret secrets mistake mistakes biggest
huge massive unbelievable ridiculous disgusting angry pissed embarrassing cried crying died dead kill killed
genius addicted obsessed""".split())

HOOKS = [
    r"\bthe (real )?reason\b", r"\bhere'?s (how|why|what|the)\b", r"\bnobody\b", r"\bno one\b",
    r"\bmost people\b", r"\bthe truth\b", r"\bsecret\b", r"\b(biggest|worst|#1|number one) (mistake|lesson|regret)",
    r"\bmistake\b", r"\bif you\b", r"\byou (need|have) to\b", r"\bstop\b", r"\bnever\b", r"\bwhy\b",
    r"\bhow (i|to|we)\b", r"\bi (made|lost|went from|turned|built|quit|got fired)\b", r"\bthe only\b",
    r"\blet me tell you\b", r"\bwhat if\b", r"\bimagine\b", r"\bthe problem\b", r"\b(rich|poor|broke) people\b",
    r"\bthe difference\b", r"\bunpopular opinion\b", r"\bi guarantee\b", r"\bthe fastest\b", r"\bdon'?t\b",
    r"\bwould you rather\b", r"\bhot take\b", r"\bhere'?s the thing\b", r"\bpeople don'?t (realize|understand)\b",
]
BAD_START = {"and", "um", "uh", "like", "yeah", "but", "or", "because", "cause", "mm", "hmm", "okay", "ok",
             "right", "anyway", "also", "which", "that"}
NUM_RE = re.compile(r"(\$\s?\d|\d+\s?(k|m|b|%|x)\b|\d[\d,.]*|\b(hundred|thousand|million|billion|percent)\b)", re.I)
TOPICS = {
    "crypto": ({"crypto", "bitcoin", "btc", "ethereum", "coin", "coins", "blockchain"}, ["#crypto", "#bitcoin"]),
    "trading": ({"trading", "trade", "trader", "forex", "futures", "options", "nasdaq", "spy", "chart"},
                ["#trading", "#daytrading", "#stockmarket"]),
    "realestate": ({"realestate", "real-estate", "property", "properties", "rent", "mortgage", "house", "houses"},
                   ["#realestate", "#investing"]),
    "sales": ({"sales", "sell", "selling", "closer", "closing", "client", "clients", "offer", "leads"},
              ["#sales", "#salestips"]),
    "business": ({"business", "company", "startup", "agency", "ecommerce", "brand", "marketing", "scale"},
                 ["#business", "#entrepreneur", "#smallbusiness"]),
    "investing": ({"invest", "investing", "stocks", "stock", "portfolio", "dividend", "fund", "etf"},
                  ["#investing", "#stocks", "#personalfinance"]),
    "mindset": ({"discipline", "mindset", "motivation", "success", "work", "grind", "habits"},
                ["#mindset", "#motivation", "#discipline"]),
}


def norm(w: str) -> str:
    return re.sub(r"[^a-z0-9$%'-]", "", w.lower())


@dataclass
class Sentence:
    words: list
    s: float
    e: float

    @property
    def text(self) -> str:
        return " ".join(w.w for w in self.words)


def sentences(words: list[Word]) -> list[Sentence]:
    out, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        gap = words[i + 1].s - w.e if i + 1 < len(words) else 9
        if re.search(r"[.?!]$", w.w) or gap > 0.7 or len(cur) >= 30:
            out.append(Sentence(cur, cur[0].s, cur[-1].e))
            cur = []
    if cur:
        out.append(Sentence(cur, cur[0].s, cur[-1].e))
    return out


