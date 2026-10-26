"""Content engine: rendering, output hygiene, covers and b-roll on synthetic ffmpeg media (no network).

  python -m unittest clipper/tests/test_content_render.py -v
"""

import copy
import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import broll  # noqa: E402
import campaign as cmp  # noqa: E402
import captions as capt  # noqa: E402
import clipper as cl  # noqa: E402
import covers  # noqa: E402
import hooks  # noqa: E402
import hygiene  # noqa: E402

CAMP = cmp.load(str(HERE / "campaigns" / "tradever.json"))


def ff(*args, check=True):
    return subprocess.run([cl.Tools.ffmpeg, "-y", "-v", "error", *args], capture_output=True, text=True, check=check)


def fake_logo(path: Path) -> Path:
    im = Image.new("RGBA", (1000, 110), (0, 0, 0, 0))
    ImageDraw.Draw(im).rectangle((300, 10, 700, 100), fill=(255, 255, 255, 255))
    im.save(path)
    return path


def words(text, t0, per=0.3, pauses=None):
    out, t = [], t0
    for i, tok in enumerate(text.split()):
        out.append(cl.Word(tok, t, t + per))
        t += per + (pauses or {}).get(i, 0.05)
    return out


def ass_events(path: Path):
    ev = []
    for line in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"Dialogue: (\d+),([\d:.]+),([\d:.]+),(\w+),", line)
        if m:
            h, mi, s = m.group(3).split(":")
            ev.append((m.group(4), float(h) * 3600 + float(mi) * 60 + float(s), line))
    return ev


class RenderBase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cl.Tools.setup(False)
        cls.tmp = tempfile.TemporaryDirectory()
        cls.dir = Path(cls.tmp.name)
        cls.src = cls.dir / "src.mp4"
        ff("-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30:duration=40", "-f", "lavfi",
           "-i", "sine=frequency=220:sample_rate=48000:duration=40", "-c:v", "libx264", "-preset", "ultrafast",
           "-c:a", "aac", "-shortest", str(cls.src))
        cls.info = cl.probe(cls.src)
        cls.logo = fake_logo(cls.dir / "logo.png")
        p = cl.build_parser()
        p.set_defaults(**cmp.cli_defaults(copy.deepcopy(CAMP)))
        cls.args = p.parse_args([])
        cls.args.camp = copy.deepcopy(CAMP)
        cls.args.logo = str(cls.logo)
        cls.args.preset = "ultrafast"
        cls.args.keep_ass = True
        cls.args.layout = "blur"
        cls.args.min, cls.args.max = 10, 40

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def clip(self, ws=None, s=1.0, e=24.0):
        ws = ws or (words("Okay so tell us about your firm.", 1.0)
                    + words("Nine out of ten accounts fail because nobody follows the rules.", 4.0)
                    + words("So um we built weekly payouts and uh that changes the game for everyone here.", 9.0,
                            pauses={4: 1.6})
                    + words("This is bullshit when people hide the rules from you.", 16.0)
                    + words("Read the rules first and plan every single trade.", 20.0))
        for w in ws:
            if w.w in ("firm.", "rules.", "here.", "you.", "trade."):
                pass
        return cl.Clip(s, e, ws)

    def render(self, c, idx=1, **over):
        a = copy.copy(self.args)
        for k, v in over.items():
            setattr(a, k, v)
        out = self.dir / f"out{idx}"
        out.mkdir(exist_ok=True)
        c.title = c.title or "test clip"
        p = cl.render(self.src, self.info, c, idx, out, "DejaVu Sans", a)
        return p, out, a


class RenderTests(RenderBase):
    def test_render_hygiene_hook_and_captions(self):
        c = self.clip()
        p, out, a = self.render(c, 1)
        self.assertIsNotNone(p)
        rep = hygiene.validate_output(p, ffmpeg=cl.Tools.ffmpeg, ffprobe=cl.Tools.ffprobe)
        self.assertTrue(rep["ok"], rep)
        st = rep["stats"]
        self.assertEqual((st["width"], st["height"], st["fps"]), (1080, 1920, 30.0))
        self.assertTrue(hygiene.has_faststart(p))
        self.assertLessEqual(p.stat().st_size, rep["stats"]["cap_bytes"] * 1.1)
        self.assertEqual([w for w in rep["warnings"] if "metadata" in w], [], rep)
        # jump cuts shortened it (the 1.6 s pause and the fillers are gone)
        self.assertLess(c.out_duration, 23.0)
        self.assertTrue(c.pacing["ok"], c.pacing)
        self.assertTrue(c.logo_on)
        # the hook is only spoken words and is on screen for the first ~2.5 s only
        self.assertIsNotNone(c.hook)
        self.assertTrue(hooks.grounded(c.hook["text"], c.words, CAMP["spelling"]), c.hook)
        ev = ass_events(out / "captions_01.ass")
        hook_ev = [e for e in ev if e[0] == "Hook"]
        self.assertEqual(len(hook_ev), 1)
        self.assertLessEqual(hook_ev[0][1], 2.6)
        self.assertGreater(hook_ev[0][1], 1.5)
        # disclosure for the whole clip, captions never use the bottom UI zone
        disc = [e for e in ev if e[0] == "Disclose"]
        self.assertEqual(len(disc), 1)
        self.assertAlmostEqual(disc[0][1], c.out_duration, delta=0.1)
        text = (out / "captions_01.ass").read_text(encoding="utf-8")
        cap_style = [l for l in text.splitlines() if l.startswith("Style: Cap,")][0].split(",")
        self.assertGreaterEqual(int(cap_style[-2]), 420)                 # MarginV: above the bottom 420 px
        self.assertGreaterEqual(int(cap_style[-3]), 140)                 # MarginR: clear of the right buttons
        hook_style = [l for l in text.splitlines() if l.startswith("Style: Hook,")][0].split(",")
        self.assertGreaterEqual(int(hook_style[-2]), 220)                # below the TikTok top bar
        # um / uh never reach the captions; profanity is masked
        caps = " ".join(l for l in text.splitlines() if ",Cap," in l)
        self.assertNotRegex(caps, r"\bUM\b|\bUH\b")
        self.assertNotIn("BULLSHIT", caps)
        self.assertIn("B*******", caps)

    def test_profanity_is_muted_in_the_audio(self):
        c = self.clip()
        p, out, a = self.render(c, 2)
        self.assertTrue(c.mutes, "the swear word should be muted")
        s, e = c.mutes[0]
        def level(a0, a1):
            r = subprocess.run([cl.Tools.ffmpeg, "-v", "info", "-ss", f"{a0:.2f}", "-t", f"{a1 - a0:.2f}", "-i", str(p),
                                "-af", "volumedetect", "-vn", "-f", "null", "-"], capture_output=True, text=True)
            m = re.search(r"mean_volume: ([-\d.]+) dB", r.stderr)
            return float(m.group(1)) if m else -99.0
        self.assertLess(level(s + 0.05, e - 0.05), -50)
        self.assertGreater(level(max(0, s - 1.0), max(0.3, s - 0.4)), -40)

    def test_style_block_changes_colours_and_mask_can_be_off(self):
        a = copy.copy(self.args)
        a.camp = copy.deepcopy(CAMP)
        a.camp["style"] = {"highlight": "#00FFAA", "money": "#FF00FF", "negation": "#0000FF", "mask_profanity": False,
                           "bold": False, "font_size": 70}
        st = capt.style_for(a)
        self.assertEqual((st["highlight"], st["money"], st["mask_profanity"], st["font_size"]),
                         ("#00FFAA", "#FF00FF", False, 70))
        c = self.clip()
        out = self.dir / "style"
        out.mkdir(exist_ok=True)
        a.keep_ass = True
        cl.write_ass(out / "x.ass", cl.remap(c.words, [(c.s, c.e)]), c.e - c.s, "Nine out of ten fail", "Inter", a)
        t = (out / "x.ass").read_text(encoding="utf-8")
        self.assertIn(cl.ass_color("#00FFAA"), t)
        self.assertIn(cl.ass_color("#0000FF"), t)         # "nobody" is a negation
        self.assertIn("BULLSHIT", t)                      # mask switched off
        self.assertIn("Style: Cap,Inter,70,", t)
        # brand_color is used when no highlight is set anywhere
        b = copy.copy(self.args)
        b.camp = {"style": {"brand_color": "#123456"}, "on_screen": {}}
        b.highlight = "#FFE600"
        self.assertEqual(capt.style_for(b)["highlight"], "#123456")
        # no style block: today's look (campaign on_screen.highlight)
        self.assertEqual(capt.style_for(self.args)["highlight"], CAMP["on_screen"]["highlight"])

    def test_caption_sizing_two_lines_max_and_safe_width(self):
        self.assertEqual(cl.caption_size(84, 10), 84)
        self.assertLess(cl.caption_size(84, 24), cl.caption_size(84, 14))
        self.assertGreaterEqual(cl.caption_size(84, 80), 54)
        for t in ["Nine out of ten people fail because they trade without a plan at all today",
                  "Why do rich people keep buying assets in a recession?"]:
            fs, lines = cl.hook_layout(t.upper())
            self.assertLessEqual(len(lines), 3)
            self.assertLessEqual(max(len(x) for x in lines) * 0.60 * fs, 900)
        c = self.clip()
        out = self.dir / "two"
        out.mkdir(exist_ok=True)
        cl.write_ass(out / "y.ass", cl.remap(c.words, [(c.s, c.e)]), 23, "", "Inter", self.args)
        for l in (out / "y.ass").read_text(encoding="utf-8").splitlines():
            if ",Cap," in l:
                self.assertLessEqual(l.count("\\N"), 1, l)

    def test_cold_open_teaser_and_trim_flags(self):
        ws = (words("Okay so.", 1.0) + words("Welcome back everyone to the show today.", 2.0)
              + words("We talk about prop firms and how the whole thing works in practice for most traders.", 5.0)
              + words("It takes a while to explain all the background of the rules and the payouts first.", 10.0)
              + words("Nine out of ten accounts fail because nobody follows the rules.", 17.0)
              + words("So that is the idea and we will keep going from here on out okay.", 21.0))
        c = cl.Clip(1.0, 26.0, ws)
        p, out, a = self.render(c, 3, cold_open="teaser")
        self.assertIsNotNone(p)
        self.assertIn("teaser cold open", c.plan_notes)
        self.assertTrue(any("lead-in" in n for n in c.plan_notes), c.plan_notes)
        # flag off: nothing trimmed, no teaser
        c2 = cl.Clip(1.0, 26.0, copy.deepcopy(ws))
        p2, _, _ = self.render(c2, 4, cold_open="off")
        self.assertEqual([n for n in c2.plan_notes if "teaser" in n or "lead-in" in n], [])
        self.assertGreater(c2.out_duration, 0)

    def test_parallel_render(self):
        c1, c2 = self.clip(), self.clip(s=2.0, e=22.0)
        out = self.dir / "par"
        out.mkdir(exist_ok=True)
        c1.title, c2.title = "first", "second"
        paths = cl.render_parallel(self.src, self.info, [c1, c2], out, "DejaVu Sans", self.args, workers=2)
        self.assertEqual(len(paths), 2)
        for p in paths:
            self.assertTrue(p and p.exists(), paths)
            self.assertTrue(hygiene.validate_output(p, ffmpeg=cl.Tools.ffmpeg, ffprobe=cl.Tools.ffprobe)["ok"])
        self.assertNotEqual(paths[0].name, paths[1].name)

    def test_logo_sits_in_the_safe_area(self):
        c = self.clip()
        camp = copy.deepcopy(CAMP)
        camp["style"] = {"logo_safe": True}
        p, out, a = self.render(c, 5, camp=camp)
        r = subprocess.run([cl.Tools.ffmpeg, "-y", "-v", "error", "-ss", "1.0", "-i", str(p), "-frames:v", "1",
                            str(self.dir / "f5.png")], capture_output=True)
        im = Image.open(self.dir / "f5.png").convert("RGB")
        # the fake logo's white box is 400 px wide centred at x=540; nothing white-ish in the top 200 px
        top = im.crop((0, 0, 1080, 200)).getdata()
        self.assertFalse(any(min(px) > 235 for px in top))
        band = im.crop((300, 232, 780, 330)).getdata()
        self.assertTrue(any(min(px) > 235 for px in band), "logo should be visible just under the TikTok top bar")


class HygieneTests(RenderBase):
    def make(self, name, vf, af, dur=8, size="1080x1920", **kw):
        p = self.dir / name
        args = ["-f", "lavfi", "-i", f"{vf}{':' if '=' in vf else '='}size={size}:rate=30:duration={dur}"]
        if af:
            args += ["-f", "lavfi", "-i", af]
        args += ["-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p"]
        if af:
            args += ["-c:a", "aac", "-shortest"]
        ff(*args, str(p))
        return p

    def val(self, p, **kw):
        return hygiene.validate_output(p, ffmpeg=cl.Tools.ffmpeg, ffprobe=cl.Tools.ffprobe, **kw)

    def test_good_file_passes_and_bad_ones_fail(self):
        good = self.make("good.mp4", "testsrc2", f"sine=frequency=300:sample_rate=48000:duration=8")
        self.assertTrue(self.val(good)["ok"], self.val(good))
        small = self.make("small.mp4", "testsrc2", "sine=frequency=300:duration=8", size="640x360")
        self.assertTrue(any("640x360" in x for x in self.val(small)["problems"]))
        black = self.make("black.mp4", "color=c=black", "sine=frequency=300:duration=8")
        self.assertTrue(any("black" in x for x in self.val(black)["problems"]), self.val(black))
        silent = self.make("silent.mp4", "testsrc2", "anullsrc=r=48000:cl=mono")
        self.assertIn("audio is silent", self.val(silent)["problems"])
        noaudio = self.make("noaudio.mp4", "testsrc2", None)
        self.assertIn("no audio stream", self.val(noaudio)["problems"])
        self.assertTrue(self.val(noaudio, expect_audio=False)["ok"])
        short = self.make("short.mp4", "testsrc2", "sine=frequency=300:duration=4", dur=4)
        self.assertTrue(any("minimum" in x for x in self.val(short)["problems"]))

    def test_long_silence_is_a_warning_not_a_failure(self):
        p = self.dir / "gap.mp4"
        ff("-f", "lavfi", "-i", "testsrc2=size=1080x1920:rate=30:duration=10", "-f", "lavfi",
           "-i", "sine=frequency=300:sample_rate=48000:duration=10",
           "-af", "volume=enable='between(t,3,5.5)':volume=0", "-c:v", "libx264", "-preset", "ultrafast",
           "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(p))
        r = self.val(p)
        self.assertTrue(r["ok"], r)
        self.assertTrue(any("silence" in w for w in r["warnings"]), r)

    def test_encode_args_cap_and_metadata(self):
        a = hygiene.encode_args(30, "veryfast", 20, True)
        self.assertIn("-map_metadata", a)
        self.assertEqual(a[a.index("-map_metadata") + 1], "-1")
        self.assertIn("+faststart", a)
        vk = hygiene.video_kbps_cap(30)
        # 8 MB / 30 s total, audio included
        self.assertLessEqual((vk + hygiene.AUDIO_KBPS) * 30 * 1000 / 8, 8 * 1024 * 1024)
        self.assertGreater(vk, 1500)

    def test_shrink_to_cap(self):
        p = self.dir / "fat.mp4"
        ff("-f", "lavfi", "-i", "testsrc2=size=1080x1920:rate=30:duration=10", "-f", "lavfi",
           "-i", "sine=frequency=300:sample_rate=48000:duration=10", "-vf", "noise=alls=40:allf=t", "-c:v", "libx264",
           "-preset", "ultrafast", "-b:v", "9M", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(p))
        before = p.stat().st_size
        cap = int(before * 0.5)
        self.assertGreater(before, cap)
        self.assertTrue(hygiene.shrink_to_cap(p, cap, ffmpeg=cl.Tools.ffmpeg))
        self.assertLessEqual(p.stat().st_size, cap * 1.05)
        self.assertTrue(self.val(p)["ok"])


class CoverTests(RenderBase):
    def test_best_cover_is_sharp_and_after_the_title(self):
        p = self.dir / "cov.mp4"
        # static bars: blurred for the first 6 s, sharp afterwards
        ff("-f", "lavfi", "-i", "smptebars=size=1080x1920:rate=30:duration=12", "-vf", "boxblur=40:enable='lt(t,6)'",
           "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", str(p))
        ms, rep = covers.best_cover_ms(p, cl.Tools.ffmpeg, duration=12.0)
        self.assertGreaterEqual(ms, 6000, rep)
        self.assertLessEqual(ms, 12000)
        self.assertIsInstance(ms, int)

    def test_cover_timestamp_always_valid(self):
        p = self.dir / "tiny.mp4"
        ff("-f", "lavfi", "-i", "testsrc2=size=540x960:rate=30:duration=3", "-c:v", "libx264", "-preset", "ultrafast", str(p))
        ms, _ = covers.best_cover_ms(p, cl.Tools.ffmpeg)
        self.assertTrue(0 <= ms <= 3000)

    def test_cover_image_has_title_logo_and_size(self):
        p = self.dir / "cov2.mp4"
        ff("-f", "lavfi", "-i", "testsrc2=size=1080x1920:rate=30:duration=6", "-c:v", "libx264", "-preset", "ultrafast", str(p))
        camp = copy.deepcopy(CAMP)
        camp["on_screen"]["logo"] = str(self.logo)
        img = covers.cover_image(p, "Nine out of ten accounts fail", camp, self.dir / "cover.jpg")
        im = Image.open(img)
        self.assertEqual(im.size, (1080, 1920))
        self.assertEqual(im.format, "JPEG")
        # white title text sits inside the TikTok safe area (nothing but gradient above y=220)
        arr = im.convert("L").crop((0, 0, 1080, 215))
        self.assertLess(max(arr.getdata()), 140)


class BrollTests(RenderBase):
    def test_only_when_the_campaign_allows_lifestyle(self):
        out = self.dir / "b1.mp4"
        self.assertIsNone(broll.broll_clip(self.src, out, CAMP))
        self.assertFalse(out.exists())
        self.assertFalse(broll.lifestyle_allowed(CAMP))
        camp = copy.deepcopy(CAMP)
        camp["style"] = {"lifestyle": True}
        self.assertTrue(broll.lifestyle_allowed(camp))

    def test_broll_render_and_safe_hooks(self):
        camp = copy.deepcopy(CAMP)
        camp["style"] = {"lifestyle": True}
        camp["on_screen"]["logo"] = str(self.logo)
        args = copy.copy(self.args)
        args.camp = camp
        out = self.dir / "b2.mp4"
        # an unsafe hook (money claim) is replaced from the bank; a bank hook is kept
        p = broll.broll_clip(self.src, out, camp, hook="Make $5,000 a week guaranteed", seed=2, target=9, args=args)
        self.assertIsNotNone(p)
        rep = hygiene.validate_output(p, ffmpeg=cl.Tools.ffmpeg, ffprobe=cl.Tools.ffprobe, expect_audio=False)
        self.assertTrue(rep["ok"], rep)
        self.assertGreaterEqual(rep["stats"]["duration"], 7.0)
        self.assertEqual((rep["stats"]["width"], rep["stats"]["height"]), (1080, 1920))
        for h in broll.safe_hooks(camp):
            self.assertIsNone(broll.UNSAFE_HOOK.search(h), h)
            self.assertIsNone(cmp.banned_hit(camp, h), h)
        self.assertGreaterEqual(len(broll.safe_hooks(camp)), 5)
        # a campaign-supplied unsafe hook is dropped from the bank
        camp["style"]["broll_hooks"] = ["Safe line about process.", "Earn $9,000 a month"]
        self.assertEqual(broll.safe_hooks(camp), ["Safe line about process."])

    def test_short_source_loops_to_seven_seconds(self):
        short = self.dir / "short_src.mp4"
        ff("-f", "lavfi", "-i", "testsrc2=size=720x1280:rate=30:duration=3", "-c:v", "libx264", "-preset", "ultrafast", str(short))
        camp = copy.deepcopy(CAMP)
        camp["style"] = {"lifestyle": True}
        p = broll.broll_clip(short, self.dir / "b3.mp4", camp, args=self.args)
        self.assertIsNotNone(p)
        self.assertGreaterEqual(cl.probe(p).duration, 6.9)


if __name__ == "__main__":
    unittest.main()
