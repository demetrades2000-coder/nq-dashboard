"""Content engine: post captions, hashtags, history rotation (no network, no ffmpeg).

  python -m unittest clipper/tests/test_content_posts.py -v
"""

import copy
import re
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import campaign as cmp  # noqa: E402
import captions as capt  # noqa: E402
import clipper as cl  # noqa: E402
from test_content_hooks import W, fixture_words  # noqa: E402

CAMP = cmp.load(str(HERE / "campaigns" / "tradever.json"))
TEXTS = [
    "Nine out of ten accounts fail because nobody follows the rules. Weekly payouts change how you plan a week.",
    "Why do traders blow evaluations? Because discipline breaks first. Your risk plan matters more than your setup.",
    "Drawdown is the rule that ends most accounts. End of day drawdown updates once at the close.",
    "Most people never read the consistency rule before they buy. That is the mistake that costs them the payout.",
]


def clip(i, **kw):
    c = cl.Clip(0, 30, W(TEXTS[i % len(TEXTS)] + " more words to fill the clip nicely", 0.0))
    c.title = TEXTS[i % len(TEXTS)].split(".")[0]
    c.hook = {"text": c.title, "kind": cl.hooks.hook_kind(c.title), "start": 0, "score": 5}
    for k, v in kw.items():
        setattr(c, k, v)
    return c


class PostCaptionTests(unittest.TestCase):
    def test_follows_campaign_rules(self):
        for i in range(8):
            t = capt.post_caption(clip(i), CAMP)
            self.assertTrue(t.startswith("#ad"), t)
            self.assertTrue(t.rstrip().endswith("@tradeverfunding @laythbanks"), t)
            tags = re.findall(r"#\w+", t.replace("#ad", ""))
            self.assertTrue(3 <= len(tags) <= 5, tags)
            self.assertIn("#tradever", tags)
            self.assertTrue(set(tags) <= set(CAMP["caption"]["hashtags"]), tags)
            self.assertIsNone(cmp.banned_hit(CAMP, t), t)
            self.assertNotRegex(t, r"(?i)guarantee|risk.?free|financial advice")
            self.assertLessEqual(len(t), 2200)

    def test_varied_across_clips(self):
        caps = {capt.post_caption_info(clip(i), CAMP)["body"] for i in range(4)}
        self.assertGreaterEqual(len(caps), 3)

    def test_consecutive_posts_differ_in_angle_tags_and_text(self):
        hist, infos = [], []
        c = clip(0)
        for n in range(8):
            info = capt.post_caption_info(c, CAMP, hist)      # even the SAME clip text must not repeat back to back
            infos.append(info)
            hist.append({"caption": info["text"], "hashtags": info["hashtags"], "angle": info["angle"]})
        for a, b in zip(infos, infos[1:]):
            self.assertNotEqual(a["angle"], b["angle"])
            self.assertNotEqual(set(a["hashtags"]), set(b["hashtags"]))
            self.assertNotEqual(a["body"].lower(), b["body"].lower())

    def test_history_as_plain_strings(self):
        first = capt.post_caption(clip(1), CAMP)
        second = capt.post_caption(clip(1), CAMP, [first])
        self.assertNotEqual(first, second)
        self.assertNotEqual(capt.infer_angle(first), "") 

    def test_series_part_numbers(self):
        c = clip(2, source_key="ep9")
        seen = set()
        hist = []
        for _ in range(12):
            info = capt.post_caption_info(c, CAMP, hist)
            seen.add(info["angle"])
            hist.append({"caption": info["text"], "hashtags": info["hashtags"], "angle": info["angle"], "source": "ep9"})
        self.assertIn("series", seen)
        parts = [h["caption"] for h in hist if "Part " in h["caption"]]
        self.assertTrue(parts)
        self.assertRegex(parts[0], r"Part \d+ \|")

    def test_income_claim_is_quoted_and_banned_never_produced(self):
        c = clip(0)
        c.hook = {"text": "I made forty thousand dollars a month", "kind": "claim", "start": 0, "score": 1}
        c.title = c.hook["text"]
        info = capt.post_caption_info(c, CAMP)
        if info["angle"] in ("claim", "number", "contrast"):
            self.assertIn("“", info["body"])
        c.hook = {"text": "This strategy has guaranteed returns every month", "kind": "claim", "start": 0, "score": 1}
        c.title = c.hook["text"]
        t = capt.post_caption(c, CAMP)
        self.assertNotIn("guaranteed", t.lower())

    def test_no_campaign_still_works(self):
        t = capt.post_caption(clip(0), None)
        self.assertTrue(t)

    def test_make_copy_uses_it_and_rotates_without_pipeline_changes(self):
        words = fixture_words()
        c = cl.Clip(words[0].s, words[0].s + 30, [w for w in words if w.s < words[0].s + 30])
        cl.make_copy(c, {}, CAMP)
        self.assertTrue(c.hashtags and 3 <= len(c.hashtags) <= 5, c.hashtags)
        self.assertTrue(c.posts["tiktok"]["caption"].startswith("#ad"))
        self.assertTrue(c.posts["tiktok"]["caption"].rstrip().endswith("@tradeverfunding @laythbanks"))
        self.assertTrue(hasattr(c, "hook"))

    def test_hashtag_pool_rotation_covers_pool(self):
        used, hist = set(), []
        for i in range(12):
            tags = capt.pick_hashtags(CAMP, i, hist)
            used |= set(tags)
            hist.append({"caption": " ".join(tags), "hashtags": tags})
        self.assertEqual(used, set(CAMP["caption"]["hashtags"]))

    def test_mask_word(self):
        self.assertEqual(capt.mask_word("bullshit,"), "b*******,")
        self.assertEqual(capt.mask_word("Fucking"), "F******")
        self.assertTrue(capt.is_profane("shit!"))
        self.assertFalse(capt.is_profane("class"))
        self.assertFalse(capt.is_profane("assess"))


if __name__ == "__main__":
    unittest.main()
