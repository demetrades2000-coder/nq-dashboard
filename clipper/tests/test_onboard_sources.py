"""
Onboarding from any kind of brief / footage link: verdicts on realistic rule phrasings, rule extraction, Notion / PDF /
docx / Dropbox / Drive briefs, YouTube / Twitch / Kick / local footage, and the three-way automation_allowed.

  cd clipper && python3 -m unittest tests.test_onboard_sources
"""

import io
import json
import shutil
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import campaign as cmp  # noqa: E402
import contentrewards as crw  # noqa: E402
import onboard  # noqa: E402
from test_agency import BRIEF, page  # noqa: E402

CID = "1cc66d1c-d7bb-4cd6-addb-68093cb50908"
LINK = f"https://contentrewards.com/c/campaigns/{CID}"
TAIL = "\nClip the podcast. Use a strong hook. Keep the logo visible.\n"

# (name, rules text, expected verdict)
VARIANTS = [
    ("no ai plain", "Rules:\n* No AI.\n* Original clips only.", "banned"),
    ("ai generated not allowed", "AI-generated content is not allowed. Violations are removed.", "banned"),
    ("no ai tools auto clippers", "No AI tools / auto-clippers allowed. Edit your own clips.", "banned"),
    ("manual edit required", "All clips must be manually edited by you.", "banned"),
    ("no automated posting", "No automated posting or scheduling. Post one clip at a time.", "banned"),
    ("native phone", "You must post natively from your phone through the TikTok app.", "banned"),
    ("third party apps", "Do not use third-party apps to edit or post.", "banned"),
    ("no bots only", "No bots.", "banned"),
    ("named tools", "OpusClip, Klap, Vizard and similar tools are not accepted.", "banned"),
    ("human only", "Human edited only. We check every submission.", "banned"),
    ("a.i. spelling", "No A.I. generated voiceovers or footage.", "banned"),
    ("tradever engagement bans", BRIEF, "allowed"),
    ("engagement only", "No bots, fake engagement, purchased views or paid boosting. Be authentic.", "allowed"),
    ("ai welcome", "AI tools are welcome. No bots, fake engagement or purchased views.", "allowed"),
    ("you can use ai", "You can use AI and any editing software you like to make your clips.", "allowed"),
    ("no restrictions", "There are no restrictions on editing tools. Be creative.", "allowed"),
    ("ai in words", "He said the train will maintain its fair schedule. The brand is AIXFunded. Do not impersonate them.", "allowed"),
    ("unrelated negatives", "Do not use copyrighted music. Never mention competitors. No NSFW content. No fake giveaways.", "allowed"),
    ("allowed with a catch", "You may use AI but only for captions, never for footage.", "unclear"),
    ("must disclose", "AI use must be disclosed to the team before posting.", "unclear"),
]


class VerdictTests(unittest.TestCase):
    def test_variants(self):
        for name, text, want in VARIANTS:
            with self.subTest(name):
                a = onboard.automation_analysis(text + TAIL)
                self.assertEqual(a["verdict"], want, (a["reason"], a["banned"], a["soft"]))
                v, why = onboard.automation_verdict(text + TAIL)
                self.assertIs(v, {"allowed": True, "banned": False, "unclear": None}[want])

    def test_exact_sentences_are_returned(self):
        a = onboard.automation_analysis("Be nice.\nOpusClip, Klap, Vizard etc. are not accepted.\nPost daily at least.")
        self.assertEqual(a["banned"], ["OpusClip, Klap, Vizard etc. are not accepted."])
        a = onboard.automation_analysis("Everything is fine. AI tools are welcome here, edit however you like.")
        self.assertEqual(a["allowed"], ["AI tools are welcome here, edit however you like."])

    def test_missing_rules_are_unclear(self):
        self.assertEqual(onboard.automation_analysis("")["verdict"], "unclear")
        self.assertEqual(onboard.automation_analysis("  \n ")["verdict"], "unclear")
        self.assertIsNone(onboard.automation_verdict("")[0])

    def test_ban_wins_over_allow_elsewhere(self):
        a = onboard.automation_analysis("AI tools are welcome for captions.\nNo auto-clippers.\nPost the clips yourself.")
        self.assertEqual(a["verdict"], "banned")


class RuleTests(unittest.TestCase):
    def test_tradever_fixture(self):
        r = onboard.parse_brief(BRIEF)
        self.assertEqual((r["min_seconds"], r["max_seconds"], r["posts_per_week"], r["min_engagement"]), (7, None, 5, 0.02))
        self.assertEqual(r["page_word"], "Tradever")
        self.assertEqual(r["mentions"], ["@tradeverfunding", "@laythbanks"])
        self.assertTrue(r["mentions_last"] and r["no_watermark"] and r["logo_required"] and r["no_competitors"])
        self.assertEqual(r["language"], "en")
        self.assertIn("Tier 1", r["geo_audience"])
        self.assertEqual(r["keep_live_days"], 30)
        self.assertIsNone(r["face_voice"])

    def test_tags_hashtags_disclosure(self):
        r = onboard.parse_brief("Tag @brandofficial and @ceo_name in every post.\nCaption must end with the tags.\n"
                                "Use the hashtags #BrandClips and #Trading. Add #ad to every caption.\nDo not use #fyp.\n"
                                "Example: https://www.tiktok.com/@someclipper/video/1")
        self.assertEqual(r["mentions"], ["@brandofficial", "@ceo_name"])
        self.assertTrue(r["mentions_last"])
        self.assertEqual(r["hashtags"], ["#BrandClips", "#Trading"])
        self.assertEqual(r["disclosure"], "#ad")

    def test_length_and_pace(self):
        r = onboard.parse_brief("Videos must be at least 15 seconds and no longer than 60 seconds.\n"
                                "Strong hook in the first 1-3 seconds.\nPost 3 times per week minimum.")
        self.assertEqual((r["min_seconds"], r["max_seconds"], r["posts_per_week"]), (15, 60, 3))
        r = onboard.parse_brief("Clips should be 20-45 seconds long.\nPost once a day.")
        self.assertEqual((r["min_seconds"], r["max_seconds"], r["posts_per_week"]), (20, 45, 7))
        r = onboard.parse_brief("Minimum 1 minute per video. Engagement rate of 3% or higher is required.")
        self.assertEqual((r["min_seconds"], r["min_engagement"]), (60, 0.03))

    def test_page_name_variants(self):
        for t, w in (("Your page name must include Acme.", "Acme"), ("The account username should contain the word clips247.", "clips247"),
                     ("Page name must contain \"Zeta\"", "Zeta")):
            self.assertEqual(onboard.parse_brief(t)["page_word"], w)

    def test_warnings_for_things_the_clipper_cannot_do(self):
        r = onboard.parse_brief("You must show your face on camera in every video.\nA voice-over is required.\n"
                                "Creators must be located in the US.\nNo co-posting or collabs.\n"
                                "Audience must be 70% US viewers.")
        w = onboard.rules_warnings(r, {"types": ["UGC (With Face)"], "rates": {"instagram": {}}})
        text = " ".join(w)
        for needle in ("face", "Creator location", "Audience location", "co-posting", "UGC", "not TikTok"):
            self.assertIn(needle, text)

    def test_faceless_is_not_a_warning(self):
        r = onboard.parse_brief("No face required. Faceless pages are fine. Voice-over is optional.")
        self.assertIsNone(r["face_voice"])

    def test_other_language(self):
        r = onboard.parse_brief("Spanish only. All captions must be in Spanish.")
        self.assertTrue(r["other_language"])


def fake_pdf(text: str) -> bytes:
    objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>"]
    stream = "BT /F1 12 Tf 50 700 Td (%s) Tj ET" % text.replace("(", "").replace(")", "")
    objs += [f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
    out, offs = b"%PDF-1.4\n", []
    for i, o in enumerate(objs, 1):
        offs.append(len(out))
        out += f"{i} 0 obj\n{o}\nendobj\n".encode()
    x = len(out)
    out += f"xref\n0 {len(objs)+1}\n0000000000 65535 f \n".encode()
    out += b"".join(f"{o:010d} 00000 n \n".encode() for o in offs)
    return out + f"trailer\n<< /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{x}\n%%EOF\n".encode()


def fake_docx(text: str) -> bytes:
    b = io.BytesIO()
    with zipfile.ZipFile(b, "w") as z:
        z.writestr("word/document.xml", "<w:document><w:body>" + "".join(
            f"<w:p><w:r><w:t>{l}</w:t></w:r></w:p>" for l in text.split("\n")) + "</w:body></w:document>")
    return b.getvalue()


def notion_resp(pid, lines):
    ids = [f"b{i}" for i in range(len(lines))]
    blocks = {pid: {"role": "reader", "value": {"id": pid, "type": "page", "properties": {"title": [["Clipper Brief"]]},
                                                "content": ids}}}
    for i, l in zip(ids, lines):
        blocks[i] = {"role": "reader", "value": {"value": {"id": i, "type": "bulleted_list", "properties": {"title": [[l]]}},
                                                 "role": "reader"}}
    return {"recordMap": {"block": blocks}, "cursor": {"stack": []}}


class SourceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="onb-"))
        self.fetch = lambda url: crw.parse_campaign(page(name="Acme Prop Firm Clipping | $2k Budget"), CID)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def build(self, links, get=None, **kw):
        kw.setdefault("resolve", None)
        p = onboard.build(LINK, links, campaigns_dir=self.tmp, get=get or (lambda u: b""), fetch=self.fetch,
                          today="2026-10-25", **kw)
        return json.loads(p.read_text(encoding="utf-8"))

    def test_classify(self):
        k = onboard.classify
        self.assertEqual(k("https://docs.google.com/document/d/abc/edit"), "gdoc")
        self.assertEqual(k("https://drive.google.com/drive/folders/F1?usp=sharing"), "gfolder")
        self.assertEqual(k("https://drive.google.com/file/d/X/view"), "gfile")
        self.assertEqual(k("https://acme.notion.site/Brief-0123456789abcdef0123456789abcdef"), "notion")
        self.assertEqual(k("https://www.dropbox.com/scl/fi/abc/brief.pdf?rlkey=1&dl=0"), "dropbox_file")
        self.assertEqual(k("https://www.dropbox.com/scl/fo/abc/xyz?rlkey=1&dl=0"), "dropbox_folder")
        self.assertEqual(k("https://mega.nz/folder/abc#key"), "mega")
        self.assertEqual(k("https://www.youtube.com/@acme/videos"), "youtube")
        self.assertEqual(k("https://www.twitch.tv/videos/123456"), "twitch")
        self.assertEqual(k("https://kick.com/acme/videos/abc-123"), "kick")
        self.assertEqual(k("https://www.tiktok.com/@x/video/1"), "example_post")
        self.assertEqual(k(str(self.tmp)), "local")

    def test_url_prefixes_pass_source_allowed(self):
        cases = [("https://www.youtube.com/@AcmeShow/videos?view=0", "https://www.youtube.com/@AcmeShow/videos", "youtube.com/@AcmeShow"),
                 ("https://youtube.com/playlist?list=PL123&si=x", "https://www.youtube.com/playlist?list=PL123", "youtube.com/playlist?list=PL123"),
                 ("https://www.youtube.com/watch?v=abc123&t=5", "https://www.youtube.com/watch?v=abc123", "youtube.com/watch?v=abc123"),
                 ("https://youtu.be/abc123?si=z", "https://youtu.be/abc123", "youtu.be/abc123"),
                 ("https://www.twitch.tv/acme", "https://www.twitch.tv/acme/videos", "twitch.tv/acme"),
                 ("https://www.twitch.tv/videos/987654?filter=archives", "https://www.twitch.tv/videos/987654", "twitch.tv/videos/987654"),
                 ("https://kick.com/acme/videos/aa-bb", "https://kick.com/acme/videos/aa-bb", "kick.com/acme/videos/aa-bb"),
                 ("https://kick.com/acme", "https://kick.com/acme/videos", "kick.com/acme")]
        for link, src, pre in cases:
            with self.subTest(link):
                self.assertEqual(onboard.url_source(link), (src, pre))
                self.assertTrue(cmp.source_allowed({"permission": {"allowed_sources": [pre]}}, src)[0])

    def test_youtube_twitch_kick_sources(self):
        c = self.build(["https://www.youtube.com/@AcmeShow", "https://www.twitch.tv/videos/987654",
                        "https://kick.com/acme/videos/aa-bb", "https://www.tiktok.com/@x/video/1"],
                       brief_text="Clip the show. Post natively is not needed. Be kind.")
        self.assertEqual(c["sources"], ["https://www.youtube.com/@AcmeShow/videos", "https://www.twitch.tv/videos/987654",
                                        "https://kick.com/acme/videos/aa-bb"])
        al = c["permission"]["allowed_sources"]
        for s in c["sources"]:
            self.assertTrue(cmp.source_allowed({"permission": {"allowed_sources": al}}, s)[0], s)
        self.assertTrue(any("example post" in s for s in c["onboard_skipped"]))
        self.assertEqual(cmp.permission_problems(cmp.load(self.tmp / "acme.json")), [])
        self.assertNotIn("footage_drive_folder", c)

    def test_playlist_adds_channel_via_resolver(self):
        c = self.build(["https://www.youtube.com/playlist?list=PL1"], resolve=lambda u: "youtube.com/@AcmeShow", brief_text=BRIEF)
        self.assertIn("youtube.com/@AcmeShow", c["permission"]["allowed_sources"])

    def test_dropbox_mega_folders_are_skipped_with_a_message(self):
        c = self.build(["https://www.dropbox.com/scl/fo/abc/xyz?rlkey=1&dl=0", "https://mega.nz/folder/abc#k"], brief_text=BRIEF)
        self.assertEqual(len(c["onboard_skipped"]), 2)
        self.assertIn("Google Drive", c["onboard_skipped"][0])
        self.assertTrue(any("footage" in m for m in c["onboard_missing"]))

    def test_dropbox_video_is_a_url_source(self):
        c = self.build(["https://www.dropbox.com/s/abc/ep1.mp4?dl=0"], brief_text=BRIEF)
        self.assertEqual(c["sources"], ["https://www.dropbox.com/s/abc/ep1.mp4?dl=1"])
        self.assertTrue(cmp.source_allowed({"permission": {"allowed_sources": c["permission"]["allowed_sources"]}}, c["sources"][0])[0])

    def test_local_folder_is_copied_and_allowed(self):
        src = self.tmp / "mine"
        src.mkdir()
        (src / "ep1.mp4").write_bytes(b"x")
        (src / "logo.png").write_bytes(b"p")
        c = self.build([str(src)], brief_text=BRIEF)
        self.assertTrue((self.tmp / "footage" / "acme" / "ep1.mp4").exists())
        self.assertEqual(c["sources"], ["footage/acme"])
        self.assertEqual(c["on_screen"]["logo"], "logos/acme/logo.png")

    def test_drive_pdf_brief_and_logo(self):
        pdf = fake_pdf("No AI generated content is allowed. Tag @acmeofficial in every caption.")

        def download(fid, dest):
            dest.mkdir(parents=True, exist_ok=True)
            if fid == "PDF1":
                (dest / "brief.pdf").write_bytes(pdf)
                return dest / "brief.pdf"
            (dest / "logo.png").write_bytes(b"png")
            return dest / "logo.png"
        c = self.build(["https://drive.google.com/file/d/PDF1/view", "https://drive.google.com/file/d/L1/view"], download=download)
        pdf_ok = bool(onboard.pdf_text(pdf)[0])
        if pdf_ok:
            self.assertIs(c["automation_allowed"], False)
            self.assertEqual(c["caption"]["required_mentions"], ["@acmeofficial"])
        else:
            self.assertIsNone(c["automation_allowed"])
        self.assertEqual(c["on_screen"]["logo"], "logos/acme/logo.png")

    def test_drive_docx_and_dropbox_pdf_and_plain_text(self):
        docx = fake_docx("Rules\nAll clips must be manually edited.")
        get = {"https://www.dropbox.com/s/abc/brief.docx?dl=1": docx,
               "https://example.org/rules.txt": b"AI tools are welcome. Tag @acme.",
               "https://www.dropbox.com/scl/fi/x/brief.pdf?rlkey=k&dl=1": fake_pdf("No bots. No automated posting.")}.__getitem__
        c = self.build(["https://www.dropbox.com/s/abc/brief.docx?dl=0"], get=get)
        self.assertIs(c["automation_allowed"], False)
        c = self.build(["https://example.org/rules.txt"], get=get)
        self.assertIs(c["automation_allowed"], True)
        if onboard.pdf_text(fake_pdf("hello world text here"))[0]:
            c = self.build(["https://www.dropbox.com/scl/fi/x/brief.pdf?rlkey=k&dl=0"], get=get)
            self.assertIs(c["automation_allowed"], False)

    def test_unreadable_brief_degrades_to_null_with_a_message(self):
        def boom(u):
            raise OSError("401 login required")
        c = self.build(["https://docs.google.com/document/d/abc/edit", "https://example.org/private.pdf"], get=boom)
        self.assertIsNone(c["automation_allowed"])
        self.assertEqual(len(c["onboard_skipped"]), 2)
        self.assertIn("--brief-text", " ".join(c["onboard_skipped"]))
        self.assertIn("brief", c["onboard_missing"][0])
        self.assertEqual(cmp.automation_allowed(cmp.load(self.tmp / "acme.json")), None)

    def test_notion_page_via_public_endpoint(self):
        pid = "0123456789abcdef0123456789abcdef"
        uid = "01234567-89ab-cdef-0123-456789abcdef"
        calls = []

        def post(url, body):
            calls.append(body)
            return notion_resp(uid, ["AI-generated content is not allowed.", "Tag @acmeofficial on every post."])
        for link in (f"https://acme.notion.site/Clipper-Brief-{pid}", f"https://www.notion.so/acme/Brief-{pid}?pvs=4"):
            c = self.build([link], post=post)
            self.assertIs(c["automation_allowed"], False)
            self.assertEqual(c["caption"]["required_mentions"], ["@acmeofficial"])
        self.assertEqual(calls[0]["page"]["id"], uid)

    def test_notion_unreachable_or_private(self):
        def down(url, body):
            raise OSError("blocked")
        c = self.build(["https://acme.notion.site/Brief-0123456789abcdef0123456789abcdef"], post=down)
        self.assertIsNone(c["automation_allowed"])
        self.assertIn("--brief-text", c["onboard_skipped"][0])
        c = self.build(["https://acme.notion.site/just-a-slug"], post=down)
        self.assertIn("no page id", c["onboard_skipped"][0])
        c = self.build(["https://acme.notion.site/Brief-0123456789abcdef0123456789abcdef"], post=lambda u, b: {"recordMap": {}})
        self.assertIn("isn't public", c["onboard_skipped"][0])

    def test_brief_text_argument(self):
        c = self.build([], brief_text="No automated posting or scheduling. Tag @acme. Post at least 4 times per week.")
        self.assertIs(c["automation_allowed"], False)
        self.assertEqual(c["posts_per_week"], 4)
        self.assertIn("No automated posting", c["brief_text"])

    def test_no_brief_means_unclear_unless_the_page_lists_no_rules(self):
        c = self.build([])    # page(): rules (0, 0) -> nothing hidden behind the join wall
        self.assertIs(c["automation_allowed"], True)
        hidden = lambda url: crw.parse_campaign(page(rules=(3, 2)), CID)  # noqa: E731
        p = onboard.build(LINK, [], campaigns_dir=self.tmp, fetch=hidden, today="2026-10-25", resolve=None)
        c = json.loads(p.read_text())
        self.assertIsNone(c["automation_allowed"])
        self.assertIn("brief", c["onboard_missing"][0])
        self.assertTrue(c["onboard_missing"])

    def test_description_feeds_the_rules(self):
        html = page(rules=(3, 0)).replace('\\"requiresApplication\\"',
                                          '\\"description\\":\\"Clip our podcast. No AI tools or auto-clippers. Page name must '
                                          'include Acme. Tag @acmeofficial.\\",\\"requiresApplication\\"')
        live = crw.parse_campaign(html, CID)
        self.assertIn("No AI tools", live["description"])
        p = onboard.build(LINK, [], campaigns_dir=self.tmp, fetch=lambda u: live, today="2026-10-25", resolve=None)
        c = json.loads(p.read_text())
        self.assertIs(c["automation_allowed"], False)
        self.assertEqual((c["account_match"], c["caption"]["required_mentions"]), ("acme", ["@acmeofficial"]))
        self.assertIn("No AI tools", c["notes"])
        self.assertIn("auto-clippers", c["brief_text"])

    def test_unclear_with_brief_present(self):
        c = self.build([], brief_text="You may use AI but only for captions. Tag @acme in every post.")
        self.assertIsNone(c["automation_allowed"])
        self.assertIn("automation", c["onboard_missing"][0])

    def test_warnings_and_rules_land_in_the_json(self):
        c = self.build([], brief_text=BRIEF + "\nYou must show your face on camera.\nUse #BrandClips in every caption.")
        self.assertTrue(any("face" in w for w in c["onboard_warnings"]))
        self.assertTrue(any("logo" in w for w in c["onboard_warnings"]))
        self.assertTrue(any("Audience" in w for w in c["onboard_warnings"]))
        self.assertEqual(c["onboard_rules"]["posts_per_week"], 5)
        self.assertEqual(c["language"], "en")
        self.assertEqual(c["caption"]["required_hashtags"], ["#BrandClips"])
        self.assertEqual(c["clip"]["min"], 8)

    def test_length_rules_set_clip_bounds(self):
        c = self.build([], brief_text="Videos must be at least 20 seconds and under 45 seconds. Be original.")
        self.assertEqual((c["clip"]["min"], c["clip"]["max"]), (21, 44))

    def test_summary_text(self):
        self.build([], brief_text="No bots or automation to post. Tag @acme.")
        out = onboard.summary(self.tmp / "acme.json")
        self.assertIn("BANNED", out)
        self.assertIn("NEXT:", out)
        self.assertIn("automation", out)
        self.build(["https://www.youtube.com/@AcmeShow"], brief_text="Clip the show. Tag @acme.")
        self.assertIn("nothing", onboard.summary(self.tmp / "acme.json").split("NEXT:")[-1])


if __name__ == "__main__":
    unittest.main()
