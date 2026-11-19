---
description: Review the queued "crap" responses — each becomes an eval case or is discarded — then empty the queue
allowed-tools: Read, Write, Bash(cat:*), Bash(jq:*), Bash(ls:*)
---

The queue is `${CLAUDE_PLUGIN_DATA}/crap.jsonl` (fallback: `~/.claude/plugins/data/cut-the-crap/crap.jsonl`). Each line is one response the user rejected by typing `crap`: `at`, `cwd`, `session_id`, `prompt` (the user's message) and `response` (the rejected text).

Eval cases go into the cut-the-crap repository, under `evals/`. If the current directory is that repository (its `.claude-plugin/plugin.json` has `"name": "cut-the-crap"`), write there; otherwise ask for its path once before starting.

Read the queue. If it is empty, say so and stop. Otherwise, for each record, oldest first:

1. Show the user's prompt and the first lines of the rejected response.
2. Say in one line which rule of the output style (`output-styles/cut-the-crap.md`) the response broke, quoting the words that broke it. If you cannot name a rule, say that; it may be a gap in the style, and that is the finding.
3. Ask the user: keep as an eval case, or discard. Do not decide for them.
4. Kept: create `evals/<short-slug>/prompt.md` with frontmatter `max_turns: 3`, `allowed_tools: []`, `disallowed_tools: [Read, Glob, Grep, Bash, Agent, WebFetch, WebSearch]`, and the user's prompt as the body (add one sentence saying the repository is not available, if the prompt assumed one). Copy the four graders every existing case has (`no-closer.md`, `first-line.md`, `plain-and-honest.md`, `no-filler.md`) into its `graders/`; they judge only form, never content. Add a grader only when the failure is a fixed phrase none of them catches: a `regex` grader with `match: not_contains`.
5. If the failure points at a gap in the style, propose the one-sentence change to `output-styles/cut-the-crap.md` and wait for approval before editing.

When every record has been kept or discarded, empty the queue by writing an empty file, and list the cases created. Measure with `claude plugin eval . --runs 1` only when the user asks; each run is a paid session.
