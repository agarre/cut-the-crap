---
max_turns: 3
allowed_tools: []
disallowed_tools: [Read, Glob, Grep, Bash, Agent, WebFetch, WebSearch]
---

O deploy quebrou. `npm run build` no container dá:

```
Error: Cannot find module './config'
Require stack:
- /app/src/index.js
```

Localmente funciona. Você não tem o repositório aqui; responde pelo que eu colei. O que está acontecendo?
