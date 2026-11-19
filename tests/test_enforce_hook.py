"""Runs hooks/enforce.mjs through the exact command hooks/hooks.json declares."""

import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOOKS = json.loads((ROOT / "hooks" / "hooks.json").read_text())["hooks"]


def transcript_line(kind, content):
    return json.dumps({"type": kind, "message": {"role": kind, "content": content}})


@unittest.skipUnless(shutil.which("node"), "node is required")
class EnforceHookTest(unittest.TestCase):
    def setUp(self):
        self.data = Path(tempfile.mkdtemp(prefix="ctc-test-"))
        self.addCleanup(shutil.rmtree, self.data, True)
        self.queue = self.data / "crap.jsonl"

    def transcript(self, *lines):
        path = self.data / "transcript.jsonl"
        path.write_text("\n".join(lines) + "\n")
        return str(path)

    def context(self, prompt="next question", transcript=None):
        env = {**os.environ, "CLAUDE_PLUGIN_ROOT": str(ROOT), "CLAUDE_PLUGIN_DATA": str(self.data)}
        payload = {"hook_event_name": "UserPromptSubmit", "session_id": "s1", "prompt": prompt}
        if transcript:
            payload["transcript_path"] = transcript
        done = subprocess.run(
            HOOKS["UserPromptSubmit"][0]["hooks"][0]["command"],
            shell=True, env=env, input=json.dumps(payload),
            capture_output=True, text=True, check=False,
        )
        self.assertEqual(0, done.returncode, done.stderr)
        if not done.stdout.strip():
            return ""
        return json.loads(done.stdout)["hookSpecificOutput"]["additionalContext"]

    def test_the_hook_runs_on_prompts_only(self):
        self.assertEqual(["UserPromptSubmit"], list(HOOKS))

    def test_the_plugin_forces_its_output_style(self):
        head = (ROOT / "output-styles" / "cut-the-crap.md").read_text().split("---")[1]
        self.assertIn("force-for-plugin: true", head)
        self.assertIn("keep-coding-instructions: true", head)

    def test_an_ordinary_prompt_gets_nothing_added(self):
        for prompt in ("next question", "crap, the build broke", ""):
            with self.subTest(prompt=prompt):
                self.assertEqual("", self.context(prompt))

    def test_crap_orders_a_rewrite(self):
        self.assertIn("Rewrite it", self.context(" CRAP! "))

    def test_only_a_bare_crap_orders_a_rewrite(self):
        for prompt in ("crap, the build broke", "fix the crap in auth.ts", ""):
            with self.subTest(prompt=prompt):
                self.assertNotIn("Rewrite it", self.context(prompt))

    def test_crap_queues_the_rejected_response_with_its_prompt(self):
        transcript = self.transcript(
            transcript_line("user", "first question"),
            transcript_line("assistant", [{"type": "text", "text": "old answer"}]),
            transcript_line("user", "why is the build red?"),
            transcript_line("assistant", [{"type": "tool_use", "name": "Read", "input": {}}]),
            transcript_line("user", [{"type": "tool_result", "content": "log"}]),
            transcript_line("assistant", [{"type": "text", "text": "Great question! "}, {"type": "text", "text": "The build is red."}]),
            transcript_line("user", "crap"),
        )
        self.assertIn("Rewrite it", self.context("crap", transcript))
        (record,) = [json.loads(line) for line in self.queue.read_text().splitlines()]
        self.assertEqual("why is the build red?", record["prompt"])
        self.assertEqual("Great question! \n\nThe build is red.", record["response"])
        self.assertEqual("s1", record["session_id"])

    def test_the_queue_keeps_only_the_last_twenty(self):
        transcript = self.transcript(
            transcript_line("user", "q"),
            transcript_line("assistant", [{"type": "text", "text": "a"}]),
        )
        self.queue.write_text("".join(json.dumps({"prompt": f"old {n}"}) + "\n" for n in range(25)))
        self.context("crap", transcript)
        records = [json.loads(line) for line in self.queue.read_text().splitlines()]
        self.assertEqual(20, len(records))
        self.assertEqual("old 6", records[0]["prompt"])
        self.assertEqual("q", records[-1]["prompt"])

    def test_a_missing_transcript_still_orders_the_rewrite(self):
        self.assertIn("Rewrite it", self.context("crap", str(self.data / "absent.jsonl")))
        self.assertFalse(self.queue.exists())


if __name__ == "__main__":
    unittest.main()
