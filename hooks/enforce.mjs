// cut-the-crap hook for Claude Code. The rules live in
// output-styles/cut-the-crap.md, which Claude Code applies as the output style
// while the plugin is enabled. This hook runs on UserPromptSubmit only and acts
// on one kind of prompt: one that starts with the word "crap". It orders a
// rewrite of the previous response; whatever follows the word is the reader's
// reason, and the model decides whether it is one. Any other prompt passes
// through untouched. It never blocks the agent. Any failure exits 0 silently.
//
// AIDEV-NOTE: hooks/reminder — a per-prompt style reminder was measured (evals/, 2026-10-19) and added nothing over the style alone; don't bring it back without new numbers

import fs from "node:fs";

const CRAP = /^crap\b[\s.,:;!-]*(.*)$/is;

const REWRITE = "send only the rewrite, with no apology and no mention of the rules.";
const BARE_ORDER =
  'The user typed "crap": your previous response broke the cut-the-crap output style. ' +
  `Rewrite it following the style and ${REWRITE}`;
const REASON_ORDER =
  'The user\'s prompt starts with "crap": they rejected your previous response, and the rest of the prompt says why. ' +
  `Rewrite it so that it fixes exactly that, following the cut-the-crap output style, and ${REWRITE} ` +
  "If the rest of the prompt is a new request and not a reason, answer it as usual.";

function onPrompt(input) {
  const match = CRAP.exec(String(input.prompt || "").trim());
  if (!match) return;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: match[1] ? REASON_ORDER : BARE_ORDER,
      },
    }),
  );
}

try {
  const input = JSON.parse(fs.readFileSync(0, "utf8"));
  if (input.hook_event_name === "UserPromptSubmit") onPrompt(input);
} catch {
  process.exit(0);
}
