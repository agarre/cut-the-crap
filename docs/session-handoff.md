# Session handoff

## Last session — 2026-10-19 — system-prompt inventory, competing sentences rewritten, Codex manifests removed

### Delivered (all uncommitted)

- **Codex manifests removed.** `.codex-plugin/plugin.json` and `.agents/plugins/marketplace.json` are staged as deleted; nothing else referenced them. The README line "Codex, OpenCode and Antigravity come next" stays.
- **Inventory of the system prompt.** A temporary mod (`~/.claude/dev-mods/63c4d23a-…/ctc-inventory`) called `$.prompt.compose()` and recorded every `prompt.section` of this session (13 sent, 11 computed empty); the texts this session does not compose (full prompt's `tone`, `focus_mode`, `overcorrection`, the four `communication` variants) were read from the Claude Code 2.1.304 binary (`~/.local/share/claude/versions/2.1.304`, `rg -a -U`). Verdict: `communication` and `willow_tern` compete whole; `autonomy_append` and `focus_mode` compete in one sentence each; `tone`, `act_dont_rederive`, `action_caution`, `delivering_work_max`, `overcorrection` agree with the style and stay. `brook_heron`/`heron_brook` carry server-sent text (empty here), unreachable; `brief` exists in the binary but its text was not found.
- **`hooks/register.ts` extended.** Still drops `communication` and `willow_tern` (text regex now covers all four communication variants). New `REWRITES`: in `autonomy_append`, "Offering follow-ups after the task is done is fine; asking permission before doing the work is not." → "Do not ask permission before doing the work."; in `focus_mode`, ", decisions you made, and what's next." → ", and decisions you made.". Matched by text, so a renamed id still works; a miss leaves the section untouched. `hooks/register.test.ts` has 2 tests; `claude plugin test .` and `claude plugin validate .` pass; `python3 -B -m unittest discover -s tests` 5 tests pass. Both READMEs describe the two rewrites.
- `/reload-plugins` was run; Hugo is opening a fresh session to verify.

### Open

- **Verify in the fresh session:** the "You are operating autonomously" block must read "Do not ask permission before doing the work." and no longer "Offering follow-ups…"; "# Writing for the user" and "say in a line what you're about to do" must be absent.
- **Measure (Hugo: "medir no final").** Nothing is measured yet. Plan: `claude plugin eval` (not yet confirmed to run here) or fresh sessions over one prompt set, three arms — no plugin, style only, style + per-prompt reminder — counting openers, closers, offers, bare IDs and tokens. Keep the 40-token reminder in `hooks/enforce.mjs` only if the numbers show a gain; otherwise the hook stays for `crap` alone.
- **Commit.** Whole rewrite from i-have-adhd to cut-the-crap plus two sessions of work; Hugo reviews and commits, no attribution footers.
- `crap` rewrite not yet tried live (type `crap` as the whole prompt after a bad response).
- Subagents: not verified whether the style and the module reach their prompts.

### Next action

In the fresh session, confirm the rewritten autonomy sentence, then design the measurement.

### Gotchas

- **Verify only in a fresh session.** A resumed session keeps the system prompt it started with. `-p` mode composes other sections (`print` trait), so it cannot verify either.
- `$.prompt.compose()` from a mod always returns this session's composition: `lean`/`bare` are derived by the engine, so passing another `model`/`promptModel`/`outputStyle: null` changes nothing (all four variants came back identical to the lean Fable prompt). To see other compositions, read the binary.
- The hooks-module API is early access; re-run `claude plugin validate .` and `claude plugin test .` after each Claude Code update, and re-check the rewritten sentences against the binary (`rg -a "Offering follow-ups" <binary>`).
- Inside the agent sandbox `claude plugin validate .` warns "directory: not a regular file": sandbox mask on `.mcp.json`, not a plugin problem. Untracked `.claude/` and `.mcp.json` of 0 bytes are sandbox masks.
- Nested `claude -p` inside the sandbox fails the plugin hooks with EROFS on `~/.claude/plugins`; each run costs about US$0.85.
- The agent's `rm` is denied; cleanup commands go to Hugo as `command rm -rf …`.

### Backlog

- B-001 Delete stale `scripts/__pycache__/` and `tests/__pycache__/` (gitignored leftovers of removed scripts): `command rm -rf scripts/__pycache__ tests/__pycache__`.
- B-002 Delete `~/.claude/plugins/data/cut-the-crap-inline/` (slip log from testing; the feature no longer exists).
- B-004 Delete the temporary inventory mod and its dump, unless the measurement reuses the mod: `command rm -rf ~/.claude/dev-mods/63c4d23a-189d-448e-a629-859839c9d717/ctc-inventory /tmp/claude-1000/-home-hbreda-Documentos-git-cut-the-crap/63c4d23a-189d-448e-a629-859839c9d717/scratchpad/sections`.
