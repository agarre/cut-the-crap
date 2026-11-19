# cut-the-crap

Makes coding agents answer short, plain and honest. It works through an output style and one hook, not through text you paste into instruction files.

🇬🇧 English · [🇧🇷 Português](README.pt-BR.md)

## What it does

- **An output style carries the rules** ([output-styles/cut-the-crap.md](output-styles/cut-the-crap.md), about 500 words): lead with the answer; say it straight when you are wrong or the agent disagrees; don't make things up; short, not cryptic; no bare references like `PR #482` without saying what they are; lists only when they help; no filler (status recaps, time estimates, next-step lines, "what works now" showcases); errors without drama. Claude Code turns the style on by itself while the plugin is enabled, in every project, and keeps it through compaction. Where your `CLAUDE.md`, `AGENTS.md` or another plugin asks for a different response style, these rules win.
- **Type `crap`** as the whole prompt to get the last response rewritten. That is the only thing the hook does; nothing is added to your other prompts. Each `crap` also queues the rejected response with your prompt (`crap.jsonl` in the plugin's data directory, last 20 only).
- **`/cut-the-crap:crap-review`** goes through that queue with you: for each rejected response it names the rule that was broken, you keep it as an eval case in `evals/` or discard it, and the queue is emptied. That is how the style learns from your real failures instead of invented ones; nothing is learned automatically.

## Install (Claude Code)

```bash
claude plugin marketplace add agarre/cut-the-crap
claude plugin install cut-the-crap@cut-the-crap
```

Restart Claude Code. The hook needs `node` on your `PATH`. To try it for one session without installing, run `claude --plugin-dir <path-to-this-repo>`.

Nothing else to set up. While the plugin is enabled, its style replaces the one picked in `/config`; disable the plugin to get yours back. Response-style rules in your own `CLAUDE.md` or `AGENTS.md` are no longer needed, and you can delete them to save tokens.

Codex, OpenCode and Antigravity come next.

## Limits

- Tested on Linux.
- Subagents do not get the style: a subagent's system prompt carries no output style (checked on Claude Code 2.1.304). Their reports come back to the main agent, which answers you in the style.
- Claude Code runs the copy of the plugin in `~/.claude/plugins/cache/`, refreshed only when the version in `plugin.json` changes; after editing the plugin, bump the version and run `claude plugin update cut-the-crap@cut-the-crap`.

## Development

```bash
python3 -B -m unittest discover -s tests -v
claude plugin validate .
claude plugin eval . --judge-model sonnet --runs 1   # six cases in evals/, scored with and without the plugin; each run is a paid session
```

The eval cases bait the rules (a question that invites praise, a task that invites an offer, a diagnosis full of IDs, a wrong premise, an "explain", a pasted error) and grade only the form of the answer, never its content: one regex for closing offers, and three LLM judges that read the style's own rules (first line is the answer; plain and honest; no filler). Graders that never fired in any run were removed. On 2026-10-20, one run per case: no plugin 0.67, plugin 0.79, with 18% fewer output tokens. The rule that failed most with the plugin on was "no filler": an extra nobody asked for at the end of an otherwise good answer. The style was then cut from about 700 to about 500 words, with that rule made explicit ("only what was asked"), and scored 0.92 on the same cases with 14% fewer output tokens than the long version. One run per case is a signal, not proof. A one-line reminder on every prompt was measured against the style alone and added nothing, so there is none.
