"""
Documentation tests: what the owner and the engineer docs say must be true of the code.

  python -X utf8 -m unittest tests.test_docs -v          (from clipper/, a few seconds)

  * every file path, `python ...` command, command flag, setting key and environment variable named in START_HERE.md,
    OWNER_GUIDE.md, FAQ.md and RUNBOOK.md exists or is valid (checked against the code)
  * links are well formed, relative links and images exist
  * the numbers the docs quote (4 hours, 08:00-22:59, 7 hours, 2 a day, branch and secret names) match the code and the workflow
  * no secret-looking text in any doc
  * the docs have the sections they promise (FAQ with 30+ questions, owner chores, runbook parts, QA list)
"""

from __future__ import annotations

import argparse
import io
import os
import re
import shutil
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent.parent          # clipper/
REPO = HERE.parent
sys.path.insert(0, str(HERE))
import cloud_runner as cr  # noqa: E402
import pipeline as pl  # noqa: E402

STRICT_DOCS = ["START_HERE.md", "OWNER_GUIDE.md", "FAQ.md", "RUNBOOK.md"]
ALL_DOCS = STRICT_DOCS + ["README.md", "PROGRAMS.md", "docs/features/qa.md"]

# files that only exist at run time (in the workspace, the state branch or the site), not in the repo
RUNTIME_FILES = {
    "AUTOPILOT_REPORT.md", "dashboard.html", "data.json", "jobs.db", "cloud_state.json", "runner.lock", "archived_campaigns.json",
    "leads.json", "earnings.json", "index.html", "manifest.webmanifest", "sw.js", "icon-192.png", "autopilot.jsonl", "clipper-workspace",
    "transcript.json", "deck.json", "pyflakes.txt", "campaigns.json", "state.json",
}
# file names that are examples or things the owner creates
EXAMPLE_FILES = {"acme.json", "client_secret.json", "x.mp4", "brief.json"}

SECRET_PATTERNS = [
    r"AKIA[0-9A-Z]{16}", r"gh[pousr]_[A-Za-z0-9]{30,}", r"github_pat_[A-Za-z0-9_]{30,}", r"sk-ant-[A-Za-z0-9_-]{20,}",
    r"\bsk-[A-Za-z0-9]{32,}\b", r"xox[baprs]-[A-Za-z0-9-]{10,}", r"AIza[0-9A-Za-z_-]{35}", r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
    r"Bearer\s+[A-Za-z0-9._-]{24,}", r"ntfy\.sh/(?!\{|\$|<|%)[A-Za-z0-9_-]{8,}", r"\b(?:zk|sk|late)_(?:live|test)_[A-Za-z0-9]{10,}",
    r"GOCSPX-[A-Za-z0-9_-]{20,}",
]

CODE_TEXT = "\n".join(p.read_text(encoding="utf-8", errors="ignore") for p in sorted(HERE.glob("*.py")))
WORKFLOWS = "\n".join(p.read_text(encoding="utf-8") for p in (REPO / ".github" / "workflows").glob("*.yml"))
TESTS_TEXT = "\n".join(p.read_text(encoding="utf-8", errors="ignore") for p in sorted((HERE / "tests").glob("*.py")))
EVERYTHING = CODE_TEXT + "\n" + WORKFLOWS + "\n" + TESTS_TEXT


def read(name: str) -> str:
    return (HERE / name).read_text(encoding="utf-8")


def spans(text: str):
    """(kind, text, line) for inline `code` spans, and 'cmd' for command lines inside fenced blocks."""
    out, fence, lang = [], False, ""
    for n, line in enumerate(text.splitlines(), 1):
        if line.strip().startswith("```"):
            fence = not fence
            lang = line.strip()[3:]
            continue
        if fence:
            s = line.strip().lstrip("$ ").strip()
            if re.match(r"(python3?|git|node|npm)\b", s) and "|" not in s[:6]:
                out.append(("cmd", s, n))
            continue
        for m in re.finditer(r"`([^`\n]+)`", line):
            out.append(("span", m.group(1).strip(), n))
    return out


def resolve_path(p: str) -> Path | None:
    base = [HERE, REPO, HERE / "docs", HERE / "tests", HERE / "campaigns", REPO / ".github" / "workflows", HERE / "docs" / "features"]
    for b in base:
        if (b / p).exists():
            return b / p
    return None


def pipeline_parser():
    return pl.build_parser()


def subparser_choices(parser):
    for a in parser._actions:
        if isinstance(a, argparse._SubParsersAction):
            return a.choices
    return {}


def check_pipeline_command(tokens: list[str]) -> str | None:
    """None if `pipeline.py <tokens>` names real subcommands and flags."""
    parser = pipeline_parser()
    node, rest = parser, [t for t in tokens]
    # global options (before the sub-command)
    while rest and rest[0].startswith("-"):
        flag = rest.pop(0).split("=")[0]
        if flag not in {o for a in parser._actions for o in a.option_strings}:
            return f"unknown global flag {flag}"
        if rest and not rest[0].startswith("-") and flag in ("--home",):
            rest.pop(0)
    depth = 0
    while True:
        choices = subparser_choices(node)
        if not choices:
            break
        # first plain word that is a sub-command; a placeholder or quoted value ends the walk
        word = next((t for t in rest if not t.startswith("-")), None)
        if word is None:
            break
        if word not in choices:
            if depth == 0:
                return f"unknown sub-command '{word}'"
            break           # a positional value after the sub-command (a path, a campaign name ...)
        node = choices[word]
        rest = rest[rest.index(word) + 1:]
        depth += 1
    known = {o for a in node._actions for o in a.option_strings}
    for t in rest:
        if t.startswith("--"):
            f = t.split("=")[0]
            if f not in known and f != "--help":
                return f"unknown flag {f} for this sub-command"
    return None


class Parsed:
    """All spans of the strict docs, parsed once."""
    items = [(d, k, t, n) for d in STRICT_DOCS for (k, t, n) in spans(read(d))]


class PathsCommandsKeys(unittest.TestCase):
    def test_every_path_mentioned_exists_or_is_a_runtime_file(self):
        bad = []
        for doc, kind, text, line in Parsed.items:
            if kind != "span":
                continue
            for tok in re.split(r"\s+", text):
                tok = tok.strip(",;:()'\"").rstrip(".")
                if not re.fullmatch(r"[\w./@-]+\.(py|md|json|yml|yaml|bat|command|html|txt|png|mjs|jsonl)", tok) and not re.fullmatch(r"[\w.-]+/[\w./-]*[\w]", tok):
                    continue
                if re.search(r"[<>*{}$]|^\.\.|^/|https?:|^[A-Z]:|\bN\b", tok) or tok.startswith(("origin/", "owner/", "ws/", "site/", "campaigns/logos")):
                    continue
                name = tok.rsplit("/", 1)[-1]
                if name in RUNTIME_FILES or name in EXAMPLE_FILES or tok in RUNTIME_FILES:
                    continue
                if tok.startswith(("footage", "clipper-cloud", "claude/", "data/", "logos/", "thumbs/", "slides/", "ready/", "sources/")):
                    continue
                if not resolve_path(tok):
                    bad.append(f"{doc}:{line}: `{tok}`")
        self.assertEqual(bad, [], "paths in the docs that do not exist")

    def test_every_python_command_is_valid(self):
        bad = []
        for doc, kind, text, line in Parsed.items:
            text = re.sub(r"^(?:[A-Z_]+=\S+\s+)+", "", text)         # CLIP_CLOUD_DIR=/tmp/cc python ...
            if not re.match(r"python3?\s", text):
                continue
            toks = text.replace("\\", " ").split()
            if len(toks) < 2:
                continue
            i = 1
            while i < len(toks) and toks[i].startswith("-"):          # python -X utf8 -m ...
                if toks[i] == "-m":
                    break
                i += 2 if toks[i] in ("-X", "-W") else 1
            if i >= len(toks):
                continue
            if toks[i] == "-m":
                mod = toks[i + 1]
                if mod == "unittest":
                    tgt = [t for t in toks[i + 2:] if not t.startswith("-") and t != "discover"]
                    for t in tgt:
                        if t.startswith(("tests.", "test_")):
                            f = HERE / "tests" / (t.split(".")[1 if t.startswith("tests.") else 0] + ".py")
                            if not f.exists():
                                bad.append(f"{doc}:{line}: test module {t}")
                elif mod not in ("pip", "pyflakes", "compileall", "yt_dlp"):
                    bad.append(f"{doc}:{line}: unknown module {mod}")
                continue
            script = toks[i]
            if re.search(r"[<>{}]", script):
                continue
            f = HERE / script if (HERE / script).exists() else (REPO / script if (REPO / script).exists() else None)
            if f is None and "/" in script and (HERE / script.split("/", 1)[-1]).exists():
                f = HERE / script.split("/", 1)[-1]
            if f is None:
                bad.append(f"{doc}:{line}: script {script} not found")
                continue
            args = [t for t in toks[i + 1:] if t]
            if f.name == "pipeline.py":
                why = check_pipeline_command([a for a in args if not re.search(r"[<>]", a)])
                if why:
                    bad.append(f"{doc}:{line}: `{text}`: {why}")
            elif f.name == "cloud_runner.py":
                buf = io.StringIO()
                with redirect_stdout(buf):
                    try:
                        cr.main(["--help"])
                    except SystemExit:
                        pass
                for a in args:
                    if a.startswith("--") and a.split("=")[0] not in buf.getvalue():
                        bad.append(f"{doc}:{line}: cloud_runner has no flag {a}")
        self.assertEqual(bad, [])

    def test_every_setting_key_exists_in_the_code(self):
        bad = []
        pat = re.compile(r"^(autopilot|zernio|publish|spend|notify|campaign_live|campaign_state|account_state|supply|leads|launch|runs|"
                         r"bench|switch|dashboard|uploadpost)\.[a-z_<>.\-/]+$")
        for doc, kind, text, line in Parsed.items:
            if kind == "span" and pat.match(text):
                key = re.split(r"[<]", text)[0].rstrip(".")
                if key not in CODE_TEXT:
                    bad.append(f"{doc}:{line}: setting `{text}`")
        self.assertEqual(bad, [])

    def test_every_environment_variable_exists(self):
        bad = []
        for doc, kind, text, line in Parsed.items:
            if kind == "span" and re.fullmatch(r"[A-Z][A-Z0-9_]{5,}", text) and text not in ("TODO", "NEVER"):
                if text not in EVERYTHING and text not in ("GH_TOKEN", "GITHUB_REPOSITORY"):
                    bad.append(f"{doc}:{line}: `{text}`")
        self.assertEqual(bad, [])

    def test_secret_names_in_the_docs_are_the_ones_the_workflow_uses(self):
        for name in ("ZERNIO_API_KEY", "NTFY_TOPIC"):
            self.assertIn(f"secrets.{name}", WORKFLOWS)
            self.assertIn(name, read("START_HERE.md") + read("OWNER_GUIDE.md"))


class Links(unittest.TestCase):
    def test_links_are_well_formed_and_relative_ones_exist(self):
        bad = []
        for doc in ALL_DOCS:
            p = HERE / doc
            if not p.exists():
                bad.append(f"{doc}: missing")
                continue
            text = p.read_text(encoding="utf-8")
            clean = re.sub(r"```.*?```", "", text, flags=re.S)
            for m in re.finditer(r"!?\[([^\]]*)\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)", clean):
                url = m.group(2)
                if url.startswith(("http://", "https://")):
                    u = urlparse(url)
                    if not u.netloc or " " in url or url.endswith((".", ",")):
                        bad.append(f"{doc}: bad url {url}")
                elif url.startswith("#") or url.startswith("mailto:"):
                    continue
                else:
                    rel = url.split("#")[0]
                    if rel and not ((p.parent / rel).exists() or (HERE / rel).exists()):
                        bad.append(f"{doc}: broken relative link {url}")
            for m in re.finditer(r"<img[^>]+src=\"([^\"]+)\"", clean):
                if not m.group(1).startswith("http") and not (p.parent / m.group(1)).exists():
                    bad.append(f"{doc}: broken image {m.group(1)}")
            for m in re.finditer(r"(?<![(\[\"'`<])https?://[^\s)>\]`\"']+", clean):
                u = urlparse(m.group(0).rstrip(".,;:"))
                if not u.netloc or "." not in u.netloc:
                    bad.append(f"{doc}: bad bare url {m.group(0)}")
        self.assertEqual(bad, [])

    def test_the_dashboard_url_in_the_docs_matches_the_code_and_workflow(self):
        want = "https://raw.githack.com/demetrades2000-coder/nq-dashboard/clipper-cloud/site/index.html"
        self.assertIn(want, read("START_HERE.md"))
        self.assertIn(want, read("OWNER_GUIDE.md"))
        self.assertIn("raw.githack.com/${{ github.repository }}/clipper-cloud/site/index.html", WORKFLOWS)
        self.assertIn('"demetrades2000-coder/nq-dashboard"', CODE_TEXT)

    def test_the_restart_branch_in_the_docs_matches_the_workflow_comment(self):
        branch = "claude/determined-shannon-94kfrp"
        self.assertIn(branch, WORKFLOWS)
        for d in ("START_HERE.md", "OWNER_GUIDE.md", "RUNBOOK.md"):
            self.assertIn(branch, read(d))

    def test_the_secrets_page_link_points_into_this_repo(self):
        s = read("START_HERE.md")
        self.assertRegex(s, r"https://github\.com/demetrades2000-coder/nq-dashboard/settings/secrets/actions")


class Secrets(unittest.TestCase):
    def test_no_secret_looking_text_in_any_doc(self):
        hits = []
        docs = [p for p in HERE.rglob("*.md") if "__pycache__" not in p.parts] + list(HERE.glob("*.txt"))
        for p in docs:
            text = p.read_text(encoding="utf-8", errors="ignore")
            for rx in SECRET_PATTERNS:
                for m in re.finditer(rx, text):
                    line = text[text.rfind("\n", 0, m.start()) + 1: text.find("\n", m.end())]
                    if re.search(r"(?i)example|placeholder|dummy|fake|<[a-z _-]+>|xxxx", line):
                        continue
                    hits.append(f"{p.relative_to(HERE)}: {m.group(0)[:14]}...")
        self.assertEqual(hits, [])

    def test_docs_never_ask_the_owner_to_paste_secrets_into_chat_or_files(self):
        t = (read("OWNER_GUIDE.md") + read("FAQ.md")).lower()
        self.assertIn("never paste a key into a chat", t)


class FactsMatchCode(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix="docs-ws-")
        cls.ws = pl.WS(cls.tmp)
        cr.configure(cls.ws, 2, [])

    @classmethod
    def tearDownClass(cls):
        cls.ws.close()
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_cadence_is_four_hours(self):
        self.assertEqual(self.ws.setting("autopilot.every_hours"), 4)
        self.assertIn("wait_minutes=230", WORKFLOWS)
        for d in ("FAQ.md", "OWNER_GUIDE.md", "START_HERE.md"):
            self.assertRegex(read(d), r"4 hours|every 4|4-hourly")

    def test_posting_window_is_08_to_2259_new_york(self):
        self.assertEqual(self.ws.setting("autopilot.post_hours"), [8, 23])
        self.assertEqual(self.ws.setting("autopilot.post_tz"), "America/New_York")
        self.assertIn("08:00", read("FAQ.md"))
        self.assertIn("22:59", read("FAQ.md"))

    def test_gap_and_caps(self):
        self.assertEqual(self.ws.setting("autopilot.min_gap_hours"), 7)
        self.assertEqual(self.ws.setting("autopilot.max_uploads_per_day"), 2)
        self.assertEqual(self.ws.setting("autopilot.max_slides_per_day"), 2)
        self.assertEqual(self.ws.setting("autopilot.per_account_per_run"), 1)
        faq = read("FAQ.md")
        self.assertIn("7 hours", faq)
        self.assertRegex(faq, r"2 videos and 2 slideshows")

    def test_cloud_posts_to_tiktok_only(self):
        self.assertEqual(self.ws.setting("autopilot.platforms"), ["tiktok"])
        self.assertRegex(read("FAQ.md"), r"post to TikTok only")

    def test_footage_size_limit_quoted_in_the_faq(self):
        self.assertEqual(cr.MAX_SOURCE_BYTES, 2_500_000_000)
        self.assertIn("2.5 GB", read("FAQ.md"))

    def test_workflow_facts(self):
        wf = (REPO / ".github" / "workflows" / "clipper-cloud.yml").read_text(encoding="utf-8")
        self.assertIn("timeout-minutes: 340", wf)
        self.assertIn("cancel-in-progress: false", wf)
        self.assertIn("timeout-minutes: 340", read("RUNBOOK.md"))
        self.assertIn("cancel-in-progress: false", read("RUNBOOK.md"))
        self.assertEqual(cr.STATE_BRANCH, "clipper-cloud")

    def test_runbook_gitignore_claims(self):
        for need in ("ws/clips/", "ws/logs/", "footage/"):
            self.assertIn(need, cr.GITIGNORE)
            self.assertIn(need, read("RUNBOOK.md"))


class Structure(unittest.TestCase):
    def test_all_promised_docs_exist(self):
        for d in ALL_DOCS + ["LEADS.md"]:
            self.assertTrue((HERE / d).is_file() and (HERE / d).stat().st_size > 500, d)
        self.assertTrue((REPO / ".github" / "workflows" / "clipper-linux.yml").is_file())

    def test_faq_has_thirty_plus_questions_with_answers(self):
        faq = read("FAQ.md")
        qs = re.findall(r"^\*\*(\d+)\. (.+?)\*\*\s*\n(.+)", faq, re.M)
        self.assertGreaterEqual(len(qs), 30)
        self.assertEqual([int(q[0]) for q in qs], list(range(1, len(qs) + 1)), "numbering must run 1..N without gaps")
        for n, q, a in qs:
            self.assertTrue(q.endswith("?"), q)
            self.assertGreater(len(a.strip()), 15, q)

    def test_faq_is_honest_about_money(self):
        t = read("FAQ.md").lower()
        for must in ("estimate", "bot score", "related accounts", "hidden", "10 days", "minimum"):
            self.assertIn(must, t)
        self.assertNotRegex(t, r"guarantee[sd]? (income|earnings|money)|you will (earn|make) \$")

    def test_owner_guide_sections(self):
        g = read("OWNER_GUIDE.md")
        for h in ("What it does", "daily chore", "What the colours mean", "How you get paid", "Add a campaign",
                  "Add or rename a TikTok page", "When something goes wrong", "What NOT to do"):
            self.assertRegex(g, rf"(?im)^## .*{re.escape(h)}", h)
        for must in ("brand-name rule", "7-day", "3-day", "Rules", "ZERNIO_API_KEY", "Run workflow", "estimate"):
            self.assertIn(must, g)

    def test_owner_guide_is_plain_english(self):
        g = re.sub(r"```.*?```|`[^`]*`|\[[^\]]*\]\([^)]*\)|https?://\S+|\|.*", " ", read("OWNER_GUIDE.md"), flags=re.S)
        sentences = [s for s in re.split(r"(?<=[.!?:])\s+|\n+", g) if len(s.split()) > 2]
        avg = sum(len(s.split()) for s in sentences) / len(sentences)
        self.assertLess(avg, 20, f"average sentence is {avg:.1f} words: shorten")
        for jargon in ("sqlite", "json", "ffmpeg", "yaml", "stdout", "regex", "sha ", "rebase", "subprocess"):
            self.assertNotIn(jargon, g.lower(), f"jargon in the owner guide: {jargon}")

    def test_runbook_has_its_parts_and_a_diagram(self):
        r = read("RUNBOOK.md")
        for h in ("Picture", "Moving parts", "Settings", "State layout", "workflow chain", "Debug a failed run", "Rotating secrets",
                  "Roll back the state branch", "Tests", "Known limits"):
            self.assertRegex(r, rf"(?im)^## .*{re.escape(h)}", h)
        self.assertRegex(r, r"```\n\s+GitHub Actions")
        self.assertIn("raw.githack.com", r)

    def test_start_here_describes_the_cloud_autopilot_first(self):
        s = read("START_HERE.md")
        self.assertLess(s.index("GitHub Actions"), s.index("## Optional: the same tool on your own computer"),
                        "the cloud autopilot comes before the PC setup")
        self.assertIn("OWNER_GUIDE.md", s)
        self.assertIn("RUNBOOK.md", s)

    def test_qa_report_is_complete(self):
        qa = read("docs/features/qa.md")
        for h in ("Deliverables", "Bugs for the lead", "Supply chain", "Code quality", "Top 5 risks"):
            self.assertRegex(qa, rf"(?im)^#+ .*{re.escape(h)}", h)
        nums = re.findall(r"^(\d+)\. ", qa.split("Deliverables", 1)[1].split("\n## ", 1)[0], re.M)
        self.assertGreaterEqual(len(nums), 20)

    def test_every_expected_failure_bug_is_in_the_qa_report(self):
        """Each `BUG n` named in a test docstring has a matching entry in docs/features/qa.md."""
        qa = read("docs/features/qa.md")
        found = set()
        for f in ("test_security.py", "test_resilience.py", "test_e2e_cloud.py"):
            found |= set(re.findall(r"BUG (\d+)", (HERE / "tests" / f).read_text(encoding="utf-8")))
        for n in sorted(found, key=int):
            self.assertRegex(qa, rf"(?m)^#+ .*\bBug {n}\b|^\*\*Bug {n}\b|^- \*\*Bug {n}\b", f"Bug {n} missing from qa.md")


if __name__ == "__main__":
    unittest.main()
