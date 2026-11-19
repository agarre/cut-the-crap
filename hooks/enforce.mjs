// cut-the-crap hook for Claude Code. The rules live in
// output-styles/cut-the-crap.md, which Claude Code applies as the output style
// while the plugin is enabled. This hook runs on UserPromptSubmit only and acts
// on one prompt: "crap". It orders a rewrite of the previous response and
// queues that response, with the prompt that produced it, for /crap-review.
// Any other prompt passes through untouched. It never blocks the agent. Any
// failure exits 0 silently; a failure in the queue never cancels the rewrite.
//
// AIDEV-NOTE: hooks/reminder — a per-prompt style reminder was measured (evals/, 2026-10-19) and added nothing over the style alone; don't bring it back without new numbers
// AIDEV-NOTE: hooks/queue — crap.jsonl is a queue, not an archive: capped at QUEUE_LIMIT, emptied by /crap-review; nothing here grows unbounded

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const QUEUE_LIMIT = 20;
const CRAP = /^crap[.!]*$/i;

const REWRITE_ORDER =
  'The user typed "crap": your previous response broke the cut-the-crap output style. ' +
  "Rewrite it following the style and send only the rewrite, with no apology and no mention of the rules.";

// Hook processes get CLAUDE_PLUGIN_DATA (~/.claude/plugins/data/<id>/, kept
// across plugin updates) in their environment; older builds do not set it.
function dataDir() {
  return process.env.CLAUDE_PLUGIN_DATA || path.join(os.homedir(), ".claude", "plugins", "data", "cut-the-crap");
}

// The transcript is JSONL: user prompts carry message.content as a string,
// tool results as an array, assistant turns as content blocks. The previous
// response is every text block after the last real prompt that is not "crap".
// AIDEV-NOTE: hooks/transcript — the file is written asynchronously and may lag the turn; the format is undocumented (read from a real session, 2026-10-20)
function previousExchange(transcriptPath) {
  const lines = fs.readFileSync(transcriptPath, "utf8").split("\n");
  let prompt = null;
  let response = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.isSidechain) continue;
    const content = entry.message?.content;
    if (entry.type === "user" && typeof content === "string") {
      if (CRAP.test(content.trim())) continue;
      prompt = content;
      response = [];
    } else if (entry.type === "assistant" && Array.isArray(content)) {
      for (const block of content) if (block.type === "text" && block.text) response.push(block.text);
    }
  }
  return { prompt, response: response.join("\n\n") };
}

function enqueue(input) {
  const { prompt, response } = previousExchange(input.transcript_path);
  if (!response) return;
  const dir = dataDir();
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "crap.jsonl");
  const kept = fs.existsSync(file) ? fs.readFileSync(file, "utf8").split("\n").filter(Boolean) : [];
  kept.push(
    JSON.stringify({
      at: new Date().toISOString(),
      cwd: input.cwd ?? null,
      session_id: input.session_id ?? null,
      prompt,
      response,
    }),
  );
  fs.writeFileSync(file, kept.slice(-QUEUE_LIMIT).join("\n") + "\n");
}

function onPrompt(input) {
  if (!CRAP.test(String(input.prompt || "").trim())) return;
  try {
    if (input.transcript_path) enqueue(input);
  } catch {
    // the queue is a convenience; the rewrite order goes out regardless
  }
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: REWRITE_ORDER },
    }),
  );
}

try {
  const input = JSON.parse(fs.readFileSync(0, "utf8"));
  if (input.hook_event_name === "UserPromptSubmit") onPrompt(input);
} catch {
  process.exit(0);
}
