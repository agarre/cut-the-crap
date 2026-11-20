"""Runs hooks/enforce.mjs through the exact command hooks/hooks.json declares."""

import json
import os
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOOKS = json.loads((ROOT / "hooks" / "hooks.json").read_text())["hooks"]


@unittest.skipUnless(shutil.which("node"), "node is required")
class EnforceHookTest(unittest.TestCase):
    def context(self, prompt):
        payload = {"hook_event_name": "UserPromptSubmit", "session_id": "s1", "prompt": prompt}
        done = subprocess.run(
            HOOKS["UserPromptSubmit"][0]["hooks"][0]["command"],
            shell=True, env={**os.environ, "CLAUDE_PLUGIN_ROOT": str(ROOT)}, input=json.dumps(payload),
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

    def test_a_prompt_that_does_not_start_with_crap_gets_nothing_added(self):
        for prompt in ("next question", "fix the crap in auth.ts", "crappy build again", ""):
            with self.subTest(prompt=prompt):
                self.assertEqual("", self.context(prompt))

    def test_a_bare_crap_orders_a_rewrite_by_the_style(self):
        for prompt in ("crap", " CRAP! "):
            with self.subTest(prompt=prompt):
                order = self.context(prompt)
                self.assertIn("Rewrite it following the style", order)
                self.assertNotIn("says why", order)

    def test_crap_with_a_reason_orders_a_rewrite_that_fixes_it(self):
        for prompt in ("crap nao entendi", "Crap, too long", "crap:\nwhat is FR-012?"):
            with self.subTest(prompt=prompt):
                order = self.context(prompt)
                self.assertIn("the rest of the prompt says why", order)
                self.assertIn("fixes exactly that", order)

    def test_text_after_crap_may_be_a_new_request(self):
        self.assertIn("answer it as usual", self.context("crap, the build broke"))


if __name__ == "__main__":
    unittest.main()
