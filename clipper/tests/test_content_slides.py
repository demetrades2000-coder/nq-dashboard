"""Content engine: slideshow layouts, balance, alt text, portrait, ranking.

  python -m unittest clipper/tests/test_content_slides.py -v
"""

import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import slideshow as ss  # noqa: E402
from test_slideshow import CAMPAIGN, REAL_LOGO, TRANSCRIPT, fake_logo, inside  # noqa: E402


class LayoutTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.dir = Path(cls.tmp.name)
        cls.logo = REAL_LOGO if REAL_LOGO.is_file() else fake_logo(cls.dir / "logo.png")
        cls.decks = ss.decks_from_transcript(TRANSCRIPT, CAMPAIGN, mine=12)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def boxes(self, slide, i=1, n=5):
        img, boxes = ss.render_slide(slide, i, n, self.logo)
        self.assertEqual(img.size, (1080, 1920))
        for name, b in boxes.items():
            self.assertTrue(inside(b, ss.SAFE), f"{slide.get('layout')} {name} {b}")
        if slide["kind"] != "cta":
            self.assertLessEqual(boxes["logo"][2] - boxes["logo"][0], 450)
        return boxes

    def test_number_layout_hero_is_big_and_safe(self):
        b = self.boxes({"kind": "hook", "layout": "number", "text": "His biggest payout ever: *$121,000*.",
                        "sub": "The part nobody posts comes next."}, 0)
        self.assertGreater(b["text"][3] - b["text"][1], 120)           # hero line is tall
        # no figure: the layout declines and the slide is drawn normally
        self.boxes({"kind": "point", "layout": "number", "text": "No figure in here at all."})

    def test_hero_picks_dollar_over_plain_number(self):
        toks = ss.tokens("Out of *100* accounts, *$3,000* is the target.")
        i, n = ss._hero_index(toks)
        self.assertEqual(toks[i][0], "$3,000")

    def test_fact_split_list_fit_the_safe_area(self):
        self.boxes({"kind": "point", "layout": "fact", "text": "Swings during the session don't move an *EOD* limit.",
                    "sub": "Tradever uses EOD drawdown."})
        b = self.boxes({"kind": "point", "layout": "split", "text": "Same name. Different rules.",
                        "left": {"label": "Intraday", "text": "Follows your *open profit*, tick by tick."},
                        "right": {"label": "End-of-day", "text": "Updates once, at the *close*."}})
        self.assertIn("left", b)
        self.assertIn("right", b)
        b = self.boxes({"kind": "point", "layout": "list", "text": "Check these before you buy.",
                        "items": ["How often does it *pay out*?", "Is there a *consistency rule*?",
                                  "Intraday or *end-of-day* drawdown?", "A fourth item that is rather long indeed"]})
        self.assertEqual([k for k in b if k.startswith("item")], ["item1", "item2", "item3", "item4"])
        # absurdly long text shrinks instead of overflowing
        long = " ".join(["Discipline beats strategy when the market turns"] * 8)
        for lay in ("fact", "number"):
            self.boxes({"kind": "point", "layout": lay, "text": long + " *9*", "sub": long[:150]})
        self.boxes({"kind": "point", "layout": "split", "text": long[:80],
                    "left": {"label": "A", "text": long}, "right": {"label": "B", "text": long}})

    def test_new_builtin_decks_are_valid_and_use_layouts(self):
        by_id = {d["id"]: d for d in self.decks}
        for did in ("rule-intraday-vs-eod-split", "myth-checklist-before-you-buy"):
            d = by_id[did]
            self.assertEqual(ss.verify_deck(d, CAMPAIGN), [])
            self.assertTrue(5 <= len(d["slides"]) <= 7)
            self.assertEqual(d["slides"][-1]["kind"], "cta")
            for i, s in enumerate(d["slides"]):
                self.boxes(s, i, len(d["slides"]))
        layouts = {s.get("layout") for d in self.decks for s in d["slides"]}
        self.assertTrue({"split", "list", "fact", "number"} <= layouts, layouts)

    def test_layouts_never_change_text(self):
        for d in self.decks:
            for s in d["slides"]:
                self.assertIn(s.get("layout", "x"), list(ss.LAYOUTS) + ["x"])
        self.assertEqual(ss.verify_deck(dict(self.decks[0], slides=self.decks[0]["slides"][:-1] +
                                             [dict(self.decks[0]["slides"][-1])]), CAMPAIGN, TRANSCRIPT,
                                        from_transcript=self.decks[0]["id"] in {x["id"] for x in ss.TRANSCRIPT_DECKS}), [])
        bad = copy.deepcopy(self.decks[0])
        bad["slides"][1]["layout"] = "wobble"
        self.assertTrue(any("unknown layout" in p for p in ss.verify_deck(bad, CAMPAIGN)))
        bad2 = copy.deepcopy(self.decks[0])
        bad2["slides"][1]["items"] = list("abcde")
        self.assertTrue(any("more than 4" in p for p in ss.verify_deck(bad2, CAMPAIGN)))

    def test_banned_words_are_checked_inside_layout_fields(self):
        d = copy.deepcopy(next(x for x in self.decks if x["id"] == "rule-intraday-vs-eod-split"))
        d["slides"][1]["left"]["text"] = "Guaranteed profits every week"
        self.assertTrue(any("banned" in p for p in ss.verify_deck(d, CAMPAIGN)))

    def test_alt_text_per_slide(self):
        for d in self.decks:
            self.assertEqual(len(d["alt"]), len(d["slides"]))
            self.assertTrue(all(a.startswith(("Title slide", "Slide", "Quote slide", "Call to action")) for a in d["alt"]))
        d = next(x for x in self.decks if x["id"] == "rule-intraday-vs-eod-split")
        self.assertIn("Intraday:", d["alt"][1])

    def test_balance_removes_orphans(self):
        f = ss.font("display", 90)
        toks = ss.tokens("Nobody tells you the rules page is the first page to read")
        w = 760
        lines = ss.wrap(toks, f, w)
        bal = ss.balance(toks, f, w, lines)
        self.assertEqual(len(bal), len(lines))
        self.assertLessEqual(max(ss.line_width(l, f) for l in bal), w)
        self.assertLessEqual(max(ss.line_width(l, f) for l in bal), max(ss.line_width(l, f) for l in lines))
        self.assertEqual([x for l in bal for x in l], [x for l in lines for x in l])

    def test_mined_ranking_hookiness_and_theme_cap(self):
        mined = ss.mine_decks(TRANSCRIPT, CAMPAIGN)
        self.assertGreaterEqual(len(mined), 30)
        self.assertTrue(all(len(d["slides"]) <= 7 for d in mined))
        self.assertTrue(all(len(d["alt"]) == len(d["slides"]) for d in mined))
        first = mined[:12]
        avg_first = sum(ss.hookiness(d) for d in first) / 12
        avg_all = sum(ss.hookiness(d) for d in mined) / len(mined)
        self.assertGreaterEqual(avg_first, avg_all - 0.01)
        self.assertGreater(ss.hookiness({"slides": [{"text": "Only *9* of 100 accounts pass. Why?"}]}),
                           ss.hookiness({"slides": [{"text": "Some thoughts about stuff in general terms here today"}]}))

    def test_portrait_only_for_ceo_quote_decks_and_skipped_without_face(self):
        png = self.dir / "p.png"
        Image.new("RGB", (300, 300), (120, 90, 60)).save(png)
        ceo = next(d for d in self.decks if d["angle"] == "ceo_quote")
        other = next(d for d in self.decks if d["angle"] == "rule_breakdown")
        ss.attach_portrait(ceo, png)
        ss.attach_portrait(other, png)
        qs = [s for s in ceo["slides"] if s["kind"] == "quote"]
        self.assertTrue(qs and all(s["portrait"] == str(png) for s in qs))
        self.assertFalse(any("portrait" in s for s in other["slides"]))
        i = ceo["slides"].index(qs[0])
        b = self.boxes(qs[0], i, len(ceo["slides"]))
        self.assertIn("portrait", b)
        self.assertIn("attribution", b)
        # a flat colour video has no face: no portrait
        vid = self.dir / "flat.mp4"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=gray:size=640x360:rate=10:duration=3",
                        "-c:v", "libx264", str(vid)], check=True)
        self.assertIsNone(ss.portrait_from_video(vid, self.dir / "face.png"))

    def test_render_all_layout_slides(self):
        d = next(x for x in self.decks if x["id"] == "myth-checklist-before-you-buy")
        paths = ss.render(d["slides"], self.dir / "r", self.logo)
        self.assertEqual(len(paths), len(d["slides"]))


if __name__ == "__main__":
    unittest.main()
