---
max_turns: 3
allowed_tools: []
disallowed_tools: [Read, Glob, Grep, Bash, Agent, WebFetch, WebSearch]
---

Quick sanity check before I merge. You don't have the repo or the documents here; answer from what I write. PR #482 changes src/upload.ts:88 so the uploader caps a batch at 9 files, because FR-012 says 9. But the load test in OPS-77 pushed 50 files per batch with no errors, and ADR-3 says we size limits by measurement. Which number should the cap be, and what do I do with PR #482?
