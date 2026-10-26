"""Content engine: hooks, cold open, fillers, jump cuts, scoring, audio checks (no network, no ffmpeg needed).

  python -m unittest clipper/tests/test_content_hooks.py -v
"""

import json
import re
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
import audiofx  # noqa: E402
import campaign as cmp  # noqa: E402
import clipper as cl  # noqa: E402
import hooks  # noqa: E402
import scoring  # noqa: E402

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "tradever_podcast_transcript.txt"
CAMP = cmp.load(str(HERE / "campaigns" / "tradever.json"))


def fixture_words(spell=True) -> list:
    """The real podcast transcript fixture as timed words (words spread across each segment)."""
    segs = []
    for line in FIXTURE.read_text(encoding="utf-8").splitlines():
        m = re.match(r"\s*\[\s*([\d.]+)\]\s*(.+)", line)
        if m:
            segs.append((float(m.group(1)), m.group(2).strip()))
    words = []
    for i, (t, txt) in enumerate(segs):
        end = (segs[i + 1][0] if i + 1 < len(segs) else t + 8) - 0.2
        words += cl._spread(txt, t, max(t + 1.0, end))
    return cmp.fix_spelling(words, CAMP.get("spelling")) if spell else words


def W(text, t0=0.0, per=0.3, gap_after=None):
    """Words with fixed length; gap_after={index: seconds} adds pauses."""
    out, t = [], t0
    for i, tok in enumerate(text.split()):
        out.append(cl.Word(tok, t, t + per))
        t += per + (gap_after or {}).get(i, 0.04)
    return out


class Args:
    min, max = 15.0, 40.0
    camp = CAMP


class HookTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.words = fixture_words()

    def windows(self, size=32.0, step=20.0):
        end = self.words[-1].e
        t = 0.0
        while t + size < end:
            yield [w for w in self.words if t <= w.s < t + size]
            t += step

    def test_hook_only_uses_spoken_words(self):
        made = 0
        for ws in self.windows():
            h = hooks.make_hook(ws, CAMP)
            if h is None:
                continue
            made += 1
            self.assertTrue(hooks.grounded(h["text"], ws, CAMP.get("spelling")), h)
            self.assertIn(h["kind"], ("question", "number", "contrast", "claim"))
            self.assertLessEqual(len(h["text"].split()), 13)
            self.assertFalse(cmp.banned_hit(CAMP, h["text"]), h)
        self.assertGreaterEqual(made, 5, "most windows of a real podcast should yield a hook")

    def test_grounded_rejects_invented_words(self):
        ws = W("Most people lose money because they never plan the trade")
        self.assertTrue(hooks.grounded("Most people lose money", ws))
        self.assertTrue(hooks.grounded("most PEOPLE lose, money!", ws))
        self.assertFalse(hooks.grounded("Most people make $9,000 a week", ws))
        self.assertFalse(hooks.grounded("people most lose money", ws))      # order matters
        self.assertFalse(hooks.grounded("", ws))

    def test_spelling_fixes_applied_before_the_check(self):
        raw = W("So Lace told me Trade Ever pays every week and that changed everything")
        fixed = cmp.fix_spelling(raw, CAMP["spelling"])
        h = hooks.make_hook(fixed, CAMP, min_score=-5)
        self.assertIsNotNone(h)
        self.assertNotIn("Trade Ever", h["text"])
        # a hook holding the old spelling is repaired and still grounded
        self.assertEqual(hooks.apply_spelling("Trade Ever pays weekly", CAMP["spelling"]), "Tradever pays weekly")
        self.assertTrue(hooks.grounded("Trade Ever pays every week", fixed, CAMP["spelling"]))

    def test_kinds(self):
        self.assertEqual(hooks.hook_kind("Why do rich people keep buying assets?", ""), "question")
        self.assertEqual(hooks.hook_kind("I lost $600,000 in one month", ""), "number")
        self.assertEqual(hooks.hook_kind("You don't need a high IQ to trade", ""), "contrast")
        self.assertEqual(hooks.hook_kind("Discipline is everything in this game", ""), "claim")

    def test_hook_prefers_a_number_or_contrast_over_filler(self):
        ws = (W("Okay so yeah.", 0) + W("Nine out of ten people fail their first evaluation and never retry it.", 3)
              + W("It is what it is.", 9))
        h = hooks.make_hook(ws, CAMP)
        self.assertIsNotNone(h)
        self.assertIn("Nine out of ten", h["text"])

    def test_income_claim_hook_is_quoted(self):
        ws = W("I made forty thousand dollars a month in revenue within eight months.", 0)
        h = hooks.make_hook(ws, CAMP, min_score=-9)
        if h:
            self.assertTrue(h["text"].startswith("“"), h)

    def test_emphasis_marks_numbers_and_negations(self):
        e = hooks.emphasis("You will never pass with 100 percent risk")
        words = "You will never pass with 100 percent risk".split()
        self.assertEqual({words[i] for i in e}, {"never", "100", "percent"})

    def test_hook_lines_balanced_and_max_three(self):
        for text in ["Nine out of ten people fail because they trade without a plan",
                     "Stop treating your eval like a live account", "Why do rich people keep buying assets?"]:
            ln = hooks.hook_lines(text.upper(), per_line=14)
            self.assertLessEqual(len(ln), 3)
            self.assertEqual(" ".join(ln), text.upper())
            if len(ln) > 1:
                self.assertGreaterEqual(len(ln[-1].split()), 2, f"orphan last line: {ln}")


class OpenerTests(unittest.TestCase):
    def test_lead_in_trim_drops_host_chatter_only(self):
        ws = fixture_words()[:300]          # starts "Okay, so for the people that don't know you, introduce yourself..."
        n = hooks.lead_in_trim(ws, min_keep=8)
        self.assertGreater(n, 0)
        self.assertGreater(ws[n].s, ws[0].s)
        # a content opener is never trimmed
        content = W("Most people will never get rich because they trade time for money. " * 3)
        self.assertEqual(hooks.lead_in_trim(content, min_keep=8), 0)

    def test_lead_in_trim_keeps_minimum_length(self):
        ws = W("Okay so. Tell us about your firm.", 0, 0.3) + W("It pays weekly.", 4)
        self.assertEqual(hooks.lead_in_trim(ws, min_keep=30), 0)

    def test_cold_open_picks_a_late_punchy_complete_sentence(self):
        ws = (W("So here is the setup for this whole idea that we are going to unpack together today.", 0)
              + W("It takes a little while to explain the background of how all of this works.", 6)
              + W("Nine out of ten accounts fail because nobody follows the rules.", 14)
              + W("That is the whole story in a nutshell and it never changes.", 19))
        ws[-1].w = "changes."
        for i, w in enumerate(ws):
            if w.w in ("it.", "setup", "today.") or w.w.endswith("."):
                pass
        plan = hooks.cold_open_plan(ws, CAMP)
        self.assertIsNotNone(plan)
        self.assertIn("Nine out of ten", plan["text"])
        self.assertGreaterEqual(plan["s"], 12)
        self.assertTrue(hooks.grounded(plan["text"], ws))

    def test_cold_open_never_on_early_or_dependent_lines(self):
        ws = W("Nine out of ten accounts fail because nobody follows the rules. ", 0)
        ws[-1].w = "rules."
        self.assertIsNone(hooks.cold_open_plan(ws + W("Okay and then we move on to the next thing here today. "
                                                       "That is why it matters.", 4), CAMP))

    def test_fillers_split_out(self):
        ws = W("So um I think uh that works hmm well")
        clean, gone = hooks.drop_fillers(ws)
        self.assertEqual([w.w for w in gone], ["um", "uh", "hmm"])
        self.assertNotIn("um", [w.w for w in clean])


class JumpCutTests(unittest.TestCase):
    def clip(self, words):
        return cl.Clip(words[0].s, words[-1].e + 0.2, words)

    def test_no_silence_longer_than_1_2s_and_no_word_cut(self):
        ws = W("This is a sentence with long pauses in the middle of it and then more words after the pauses end now",
               1.0, 0.25, {3: 2.5, 8: 4.0, 12: 1.4})
        c = self.clip(ws)
        iv = cl.keep_intervals(c, True)
        out = cl.remap(ws, iv)
        rep = cl.pacing_report(out, sum(b - a for a, b in iv))
        self.assertTrue(rep["ok"], rep)
        for w in ws:   # every word is inside a kept interval, whole
            self.assertTrue(any(a - 1e-6 <= w.s and w.e <= b + 1e-6 for a, b in iv), (w, iv))

    def test_filler_sounds_are_cut_from_audio_and_captions(self):
        ws = W("So we start here um and then we keep going uh until the very end of it", 0.0, 0.3)
        clean, gone = hooks.drop_fillers(ws)
        c = self.clip(ws)
        plan = {"start": c.s, "words": clean, "fillers": gone, "teaser": None}
        iv = cl.keep_intervals(c, True, plan)
        for f in gone:
            mid = (f.s + f.e) / 2
            self.assertFalse(any(a <= mid <= b for a, b in iv), f"filler at {mid} still inside {iv}")
        self.assertNotIn("um", [w.w for w in cl.remap(clean, iv)])

    def test_teaser_comes_first_and_is_a_separate_interval(self):
        ws = W("Word " * 40, 0.0, 0.3)
        c = self.clip(ws)
        plan = {"start": c.s, "words": ws, "fillers": [], "teaser": {"s": 9.0, "e": 11.0, "text": "x"}}
        iv = cl.keep_intervals(c, True, plan)
        self.assertEqual(iv[0], (9.0, 11.0))
        self.assertLess(iv[1][0], 1.0)

    def test_without_jumpcuts_the_pauses_stay(self):
        ws = W("a b c d e f g h", 0.0, 0.3, {3: 2.0})
        iv = cl.keep_intervals(self.clip(ws), False)
        self.assertEqual(len(iv), 1)

    def test_prepare_clip_flags(self):
        ws = fixture_words()[:150]
        c = cl.Clip(ws[0].s, ws[-1].e, ws)
        a = cl.build_parser().parse_args([])
        a.camp = CAMP
        a.cold_open = "off"
        p = cl.prepare_clip(c, a)
        self.assertEqual(p["trimmed_words"], 0)
        self.assertIsNone(p["teaser"])
        a.cold_open = "trim"
        p = cl.prepare_clip(c, a)
        self.assertGreater(p["trimmed_words"], 0)
        self.assertGreater(p["start"], c.s)
        if p["hook"]:
            self.assertTrue(hooks.grounded(p["hook"]["text"], p["words"], CAMP["spelling"]))


class ScoringTests(unittest.TestCase):
    def score(self, text, dur=None, **kw):
        ws = W(text, 0.0, 0.3)
        d = dur or ws[-1].e
        s, reasons, feats = scoring.score(ws, d, Args, camp=CAMP, **kw)
        return s, reasons, feats

    GOOD = ("Most people lose money because they never plan the trade. Here is the problem, you risk too much on one "
            "idea. But if you cut your size to one percent, you can survive twenty losses in a row. That is why "
            "discipline beats strategy every single time you sit down to trade.")

    def test_good_story_beats_filler_start(self):
        good, r_good, _ = self.score(self.GOOD)
        bad, r_bad, _ = self.score("And yeah so like um that is kind of what I was saying about the thing. " + self.GOOD)
        self.assertGreater(good, bad)
        self.assertTrue(any("watch" in r for r in r_bad), r_bad)

    def test_story_arc_rewarded(self):
        _, _, f = self.score(self.GOOD, dur=24)
        self.assertGreaterEqual(f["arc"], 0.8)
        _, _, f2 = self.score("Banana. " * 40, dur=24)
        self.assertLess(f2["arc"], 0.3)

    def test_penalties_named_in_plain_english(self):
        _, r, f = self.score("Tell us about your trading journey and how you started. " + self.GOOD)
        self.assertIn("watch: opens on a host question", r)
        _, r, f = self.score(self.GOOD + " Apex pays quickly and Topstep does too.")
        self.assertIn("watch: mentions another firm", r)
        self.assertGreaterEqual(f["_penalties"]["other_firm"], 30)
        _, r, _ = self.score("I made forty thousand dollars a month in revenue. " + self.GOOD)
        self.assertTrue(any("income claim" in x for x in r), r)
        _, r, _ = self.score("This is bullshit and everyone knows it. " + self.GOOD)
        self.assertTrue(any("swearing" in x for x in r), r)

    def test_dangling_start(self):
        _, r, _ = self.score("That is why it matters so much to everyone. " + self.GOOD)
        self.assertIn("watch: starts mid-thought", r)

    def test_rambling_penalised(self):
        ramble = ("so um like you know the thing is the thing is like you know it is what it is you know " * 4)
        _, r, f = self.score(ramble)
        self.assertIn("ramble", f["_penalties"])

    def test_length_sweet_spot(self):
        lo = scoring.features(W(self.GOOD), 10, Args)[0]["length"]
        mid = scoring.features(W(self.GOOD), 28, Args)[0]["length"]
        hi = scoring.features(W(self.GOOD), 70, Args)[0]["length"]
        self.assertGreater(mid, lo)
        self.assertGreater(mid, hi)
        self.assertEqual(mid, 1.0)

    def test_weights_sum_to_one_and_are_documented(self):
        self.assertAlmostEqual(sum(scoring.WEIGHTS.values()), 1.0, places=6)
        self.assertAlmostEqual(sum(scoring.load_weights().values()), 1.0, places=6)

    def test_weights_file_override_and_fit(self):
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / "w.json"
            p.write_text(json.dumps({"hook": 0.6, "nonsense": 9}))
            w = scoring.load_weights(p)
            self.assertGreater(w["hook"], scoring.WEIGHTS["hook"])
            self.assertNotIn("nonsense", w)
        # a feature that really predicts views gains weight once there is enough data
        import random
        rnd = random.Random(3)
        samples = []
        for _ in range(300):
            f = {k: rnd.random() for k in scoring.WEIGHTS}
            samples.append((f, 1000 * (1 + 8 * f["contrast"]) * rnd.uniform(0.8, 1.2)))
        fitted = scoring.fit_weights(samples)
        self.assertGreater(fitted["contrast"], scoring.WEIGHTS["contrast"] * 2)
        self.assertAlmostEqual(sum(fitted.values()), 1.0, places=2)
        # too little data: the prior is unchanged
        self.assertEqual(scoring.fit_weights(samples[:5]), scoring.WEIGHTS)

    def test_select_is_diverse_and_non_overlapping(self):
        def mk(s, e, score, topics, text):
            c = cl.Clip(s, e, W(text, s))
            c.score, c.topics = score, topics
            return c
        a = mk(0, 25, 90, ["trading"], "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi")
        b = mk(30, 55, 88, ["trading"], "one two three four five six seven eight nine ten eleven twelve thirteen")
        c = mk(60, 85, 80, ["mindset"], "red orange yellow green blue indigo violet black white grey brown pink")
        d = mk(10, 35, 95, ["trading"], a.text)   # overlaps a and repeats its speech
        picked = scoring.select([a, b, c, d], 2)
        self.assertEqual(len(picked), 2)
        self.assertIn(c, picked, "second clip should move to a different topic")
        self.assertFalse(any(not (x.e + 3 <= y.s or x.s >= y.e + 3) for x in picked for y in picked if x is not y))
        # drop-in: clipper.pick uses it
        self.assertEqual([x.s for x in cl.pick([a, b, c, d], 2)], [x.s for x in picked])

    def test_real_transcript_windows_score_and_have_reasons(self):
        words = fixture_words()
        cands = cl.candidates_from_words(words, Args)
        self.assertGreater(len(cands), 50)
        for c in cands[:80]:
            cl.score_clip(c, None, Args)
            self.assertTrue(all(isinstance(r, str) for r in c.reasons))
        best = max(cands, key=lambda c: c.score)
        self.assertGreater(best.score, 30)


class AudioChecks(unittest.TestCase):
    def test_music_suspect_distinguishes_quiet_gaps_from_loud_ones(self):
        ws = W("a b c d e f g h i j k l m n o p", 0.0, 0.25, {i: 0.5 for i in range(16)})
        hop = 0.1
        n = int((ws[-1].e + 1) / hop)
        def curve(gap_db):
            db = [gap_db] * n
            for w in ws:
                for i in range(int(w.s / hop), int(w.e / hop) + 1):
                    if i < n:
                        db[i] = -20.0
            return db
        quiet, diff_q = audiofx.music_suspect(curve(-55), hop, ws, 0, ws[-1].e)
        loud, diff_l = audiofx.music_suspect(curve(-26), hop, ws, 0, ws[-1].e)
        self.assertFalse(quiet)
        self.assertTrue(loud)
        self.assertLess(diff_q, diff_l)

    def test_clarity_chain_skips_missing_filters(self):
        full = audiofx.clarity_chain(lambda n: True)
        self.assertIn("highpass", full)
        self.assertIn("acompressor", full)
        none = audiofx.clarity_chain(lambda n: False)
        self.assertEqual(none, "")
        self.assertNotIn("afftdn", audiofx.clarity_chain(lambda n: n != "afftdn"))

    def test_whisper_plan_fits_budget(self):
        p = cl.whisper_plan(33 * 60, cores=4)
        self.assertLessEqual(p["est_s"], 600)
        self.assertIn(p["model"], ("small", "base", "tiny"))
        short = cl.whisper_plan(5 * 60, cores=4)
        self.assertEqual((short["model"], short["beam"]), ("small", 5))
        self.assertEqual(cl.whisper_plan(3600, cores=4, model="medium")["model"], "medium")   # explicit model respected
        self.assertEqual(cl.whisper_plan(33 * 60, cores=4, quality="best")["beam"], 5)


if __name__ == "__main__":
    unittest.main()
