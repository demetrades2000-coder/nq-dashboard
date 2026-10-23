"""
Slideshow (TikTok photo carousel) tests.

  python -m unittest clipper/tests/test_slideshow.py -v
"""

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
import slideshow as ss  # noqa: E402

TRANSCRIPT = (Path(__file__).resolve().parent / "fixtures" / "tradever_podcast_transcript.txt").read_text(encoding="utf-8")
CAMPAIGN = json.loads((HERE / "campaigns" / "tradever.json").read_text(encoding="utf-8"))
REAL_LOGO = HERE / "campaigns" / "logos" / "tradever.png"


def fake_logo(path: Path) -> Path:
    """Wide transparent banner like the official one (logo PNGs are gitignored)."""
    im = Image.new("RGBA", (2170, 230), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.line((20, 95, 520, 95), fill=(22, 222, 74, 255), width=3)
    d.line((1650, 95, 2150, 95), fill=(22, 222, 74, 255), width=3)
    d.rectangle((600, 30, 1600, 150), fill=(255, 255, 255, 255))
    d.rectangle((700, 170, 1450, 195), fill=(22, 222, 74, 255))
    im.save(path)
    return path


def inside(box, area):
    return box[0] >= area[0] and box[1] >= area[1] and box[2] <= area[2] and box[3] <= area[3]


class SlideshowTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.dir = Path(cls.tmp.name)
        cls.logo = REAL_LOGO if REAL_LOGO.is_file() else fake_logo(cls.dir / "logo.png")
        cls.decks = ss.decks_from_transcript(TRANSCRIPT, CAMPAIGN)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    # ---- content
    def test_deck_count_and_angles(self):
        self.assertGreaterEqual(len(self.decks), 10)
        self.assertEqual(len({d["id"] for d in self.decks}), len(self.decks), "ids must be unique")
        angles = {d["angle"] for d in self.decks}
        self.assertTrue({"ceo_quote", "myth_buster", "rule_breakdown", "payout_story"} <= angles, angles)
        # rotation: the first four decks cover four different angles
        self.assertEqual(len({d["angle"] for d in self.decks[:4]}), 4)

    def test_structure(self):
        for d in self.decks:
            s = d["slides"]
            self.assertTrue(5 <= len(s) <= 7, d["id"])
            self.assertEqual(s[0]["kind"], "hook", d["id"])
            self.assertEqual(s[-1]["kind"], "cta", d["id"])
            self.assertFalse(any(x["kind"] == "cta" for x in s[:-1]), d["id"])
            self.assertLessEqual(len(d["title"]), 90)
            self.assertRegex(d["id"], r"^[a-z0-9-]+$")
            for x in s:
                self.assertIn(x["kind"], ("hook", "point", "quote", "cta"))

    def test_captions_end_with_tags(self):
        for d in self.decks:
            self.assertTrue(d["caption"].endswith("@tradeverfunding @laythbanks"), d["caption"])
            self.assertIn("#ad", d["caption"])

    def test_banned_words_absent(self):
        banned = ss.banned_list(CAMPAIGN)
        for w in ("guarantee", "risk free", "get rich", "topstep", "fuck"):
            self.assertIn(w, banned)
        for d in self.decks:
            blob = json.dumps(d, ensure_ascii=False).lower()
            for b in banned:
                self.assertNotIn(b, blob, f"{d['id']}: {b}")
            # Whisper mishearings are fixed
            for bad in ("lace samara", "trade ever", "tradeever", "tredever"):
                self.assertNotIn(bad, blob)

    def test_quotes_are_his_words_and_numbers_he_said(self):
        tn = ss.norm(ss.clean_transcript(TRANSCRIPT))
        said = ss.numbers(ss.clean_transcript(TRANSCRIPT), words=True)
        quotes = 0
        tx_ids = {x["id"] for x in ss.TRANSCRIPT_DECKS}
        for d in self.decks:
            self.assertEqual(ss.verify_deck(d, CAMPAIGN, TRANSCRIPT, from_transcript=d["id"] in tx_ids), [], d["id"])
            for s in d["slides"]:
                if s["kind"] == "quote":
                    quotes += 1
                    self.assertTrue(ss.quote_in(s["text"], tn), s["text"])
                if s["kind"] != "cta" and d["id"] in tx_ids:
                    for n in ss.numbers(ss.plain(s["text"]) + " " + ss.plain(s.get("sub", ""))):
                        self.assertIn(n, said, f"{d['id']}: {n}")
        self.assertGreater(quotes, 20)

    def test_invented_quote_is_dropped(self):
        spec = {"id": "bad", "angle": "ceo_quote", "title": "x", "caption": "x",
                "slides": [("hook", "Hook", ""), ("quote", "Tradever pays $9,999,999 every hour.", ""),
                           ("point", "p", ""), ("point", "q", "")]}
        deck = {"id": "bad", "angle": "ceo_quote", "title": "x", "caption": ss._caption(spec, CAMPAIGN),
                "slides": ss._slides(spec)}
        probs = ss.verify_deck(deck, CAMPAIGN, TRANSCRIPT, from_transcript=True)
        self.assertTrue(any("quote not in transcript" in p for p in probs), probs)
        self.assertTrue(any("number" in p for p in probs), probs)

    def test_builtin_decks_without_transcript(self):
        decks = ss.decks_from_transcript("", CAMPAIGN)
        self.assertEqual({d["id"] for d in decks}, {d["id"] for d in ss.BUILTIN_DECKS})

    def test_deterministic(self):
        again = ss.decks_from_transcript(TRANSCRIPT, CAMPAIGN)
        self.assertEqual(json.dumps(self.decks), json.dumps(again))
        s = self.decks[0]["slides"][0]
        a, _ = ss.render_slide(s, 0, 5, self.logo)
        b, _ = ss.render_slide(s, 0, 5, self.logo)
        self.assertEqual(a.tobytes(), b.tobytes())

    # ---- rendering
    def test_render_sizes_and_files(self):
        deck = self.decks[0]
        paths = ss.render(deck["slides"], self.dir / "deck", self.logo)
        self.assertEqual(len(paths), len(deck["slides"]))
        for p in paths:
            self.assertTrue(p.is_file())
            self.assertLess(p.stat().st_size, 20 * 1024 * 1024)
            with Image.open(p) as im:
                self.assertEqual(im.size, (1080, 1920))
                self.assertEqual(im.mode, "RGB")

    def test_every_slide_fits_safe_area(self):
        x0, y0, x1, y1 = ss.SAFE
        for d in self.decks:
            n = len(d["slides"])
            for i, s in enumerate(d["slides"]):
                _, boxes = ss.render_slide(s, i, n, self.logo)
                for name, box in boxes.items():
                    self.assertTrue(inside(box, ss.SAFE), f"{d['id']} slide {i + 1} {name} {box} outside {ss.SAFE}")
                self.assertIn("logo", boxes, f"{d['id']} slide {i + 1}: logo missing")
                if s["kind"] == "cta":
                    lw = boxes["logo"][2] - boxes["logo"][0]
                    self.assertGreaterEqual(lw, 0.8 * (x1 - x0), "CTA logo must be prominent")
                    self.assertIn("button", boxes)
                else:
                    self.assertLessEqual(boxes["logo"][2] - boxes["logo"][0], 450, "small logo on slides 1-4")
                if s["kind"] == "quote":
                    self.assertIn("attribution", boxes)

    def test_long_text_shrinks_instead_of_overflowing(self):
        long = " ".join(["Discipline beats strategy when the market turns against you"] * 6)
        for kind in ("hook", "point", "quote", "cta"):
            _, boxes = ss.render_slide({"kind": kind, "text": long, "sub": long[:120]}, 1, 5, self.logo)
            for name, box in boxes.items():
                self.assertTrue(inside(box, ss.SAFE), f"{kind} {name} {box}")

    def test_highlight_markup(self):
        toks = ss.tokens("Only about *9 accounts* pass, $121,000 too.")
        self.assertEqual([w for w, h in toks if h], ["9", "accounts"])
        toks = ss.tokens("Biggest payout: $121,000 at 80% split")
        self.assertEqual([w for w, h in toks if h], ["$121,000", "80%"])

    def test_cli_build(self):
        tx = self.dir / "t.txt"
        tx.write_text(TRANSCRIPT, encoding="utf-8")
        camp = json.loads(json.dumps(CAMPAIGN))
        camp["on_screen"]["logo"] = str(self.logo)
        cp = self.dir / "camp.json"
        cp.write_text(json.dumps(camp), encoding="utf-8")
        out = self.dir / "cli"
        r = subprocess.run([sys.executable, str(HERE / "slideshow.py"), "build", "--campaign", str(cp),
                            "--transcript", str(tx), "--out", str(out), "--limit", "2"],
                           capture_output=True, text=True, timeout=300)
        self.assertEqual(r.returncode, 0, r.stderr)
        folders = sorted(p for p in out.iterdir() if p.is_dir())
        self.assertEqual(len(folders), 2)
        for f in folders:
            meta = json.loads((f / "deck.json").read_text(encoding="utf-8"))
            self.assertEqual(len(meta["images"]), len(meta["slides"]))
            for name in meta["images"]:
                self.assertTrue((f / name).is_file())


if __name__ == "__main__":
    unittest.main()
