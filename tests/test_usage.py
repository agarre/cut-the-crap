"""Runs scripts/usage.mjs against a transcript tree built in a temporary directory."""

import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TODAY = "2026-01-02T10:00:00.000Z"


def style(name="cut-the-crap:cut-the-crap", prompt="rules"):
    return {"type": "attachment", "attachment": {"type": "output_style_instructions", "style": {"name": name, "prompt": prompt}}}


def user(content, **extra):
    return {"type": "user", "timestamp": TODAY, "message": {"role": "user", "content": content}, **extra}


def assistant(*blocks, model="claude-opus-5-5"):
    return {"type": "assistant", "timestamp": TODAY, "message": {"role": "assistant", "model": model, "content": list(blocks)}}


def text(value):
    return {"type": "text", "text": value}


TOOL = {"type": "tool_use", "name": "Read", "input": {}}
RESULT = user([{"type": "tool_result", "content": "log"}])


@unittest.skipUnless(shutil.which("node"), "node is required")
class UsageMeterTest(unittest.TestCase):
    def setUp(self):
        self.home = Path(tempfile.mkdtemp(prefix="ctc-test-"))
        self.addCleanup(shutil.rmtree, self.home, True)

    def session(self, name, *entries):
        path = self.home / "projects" / "-some-project" / f"{name}.jsonl"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("".join(json.dumps(entry) + "\n" for entry in entries))

    def report(self, *flags):
        done = subprocess.run(
            ["node", str(ROOT / "scripts" / "usage.mjs"), "--since", "2000-01-01", *flags],
            env={**os.environ, "CLAUDE_CONFIG_DIR": str(self.home)},
            capture_output=True, text=True, check=False,
        )
        self.assertEqual(0, done.returncode, done.stderr)
        return done.stdout

    def test_an_answer_is_the_text_after_the_last_tool_call(self):
        self.session(
            "s1",
            user("why is the build red?"),
            style(),
            assistant(text("Reading the build log now.")),
            assistant(TOOL),
            RESULT,
            assistant(text("The build is red.")),
        )
        (group,) = json.loads(self.report("--json"))["groups"]
        self.assertEqual(1, group["answers"])
        self.assertEqual(4, group["medianWords"])
        self.assertEqual(5, group["narrationWords"])
        self.assertEqual("claude-opus-5-5", group["model"])

    def test_long_and_sectioned_answers_are_counted(self):
        long_answer = "\n".join(f"**Part {n}.** " + "word " * 80 for n in range(3))
        self.session(
            "s1",
            user("q1"), style(), assistant(text("Short.")),
            user("q2"), assistant(text(long_answer)),
        )
        (group,) = json.loads(self.report("--json"))["groups"]
        self.assertEqual(2, group["answers"])
        self.assertEqual(50, group["over80"])
        self.assertEqual(50, group["over200"])
        self.assertEqual(50, group["sectioned"])

    def test_turns_the_user_did_not_type_or_without_the_style_are_left_out(self):
        self.session(
            "s1",
            user("q"), style(), assistant(text("Typed.")),
            {**assistant(text("From a subagent.")), "isSidechain": True},
            user("<command-name>/clear</command-name>"), assistant(text("From a slash command.")),
            user("crap"), assistant(text("Rewritten.")),
        )
        self.session("s2", user("q"), style(name="default"), assistant(text("Another style.")))
        self.session("s3", user("q"), assistant(text("No style at all.")))
        report = json.loads(self.report("--json"))
        self.assertEqual(["Typed."], [row["answer"] for row in report["answers"]])

    def test_an_edit_to_the_style_text_starts_a_new_row(self):
        self.session("s1", user("q"), style(prompt="old rules"), assistant(text("One.")))
        self.session("s2", user("q"), style(prompt="new rules"), assistant(text("Two.")))
        groups = json.loads(self.report("--json"))["groups"]
        self.assertEqual(2, len({group["style"] for group in groups}))

    def test_a_complaint_points_at_the_answer_it_rejected(self):
        self.session(
            "s1",
            user("explain the deploy"), style(), assistant(text("word " * 300)),
            user("seja menos prolixo"), assistant(text("Curto.")),
            user("crap nao entendi"), assistant(text("Mais claro.")),
        )
        first, second = json.loads(self.report("--json"))["complaints"]
        self.assertEqual("explain the deploy", first["rejectedPrompt"])
        self.assertEqual(300, first["rejectedWords"])
        self.assertEqual("Curto.", second["rejectedAnswer"])
        self.assertIn("300 words", self.report("--complaints"))

    def test_the_table_has_one_line_per_style_and_model(self):
        self.session("s1", user("q"), style(), assistant(text("One.")), user("q"), assistant(text("Two."), model="claude-fable-5-2"))
        lines = self.report().splitlines()
        self.assertEqual(4, len(lines))
        self.assertTrue(lines[0].startswith("style"))
        self.assertIn("0 complaints", lines[-1])


if __name__ == "__main__":
    unittest.main()
