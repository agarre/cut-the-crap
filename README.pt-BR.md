# cut-the-crap

Faz agentes de código responderem curto, claro e honesto. Funciona por um output style e um hook, não por texto colado em arquivo de instruções.

[🇬🇧 English](README.md) · 🇧🇷 Português

## O que faz

- **Um output style leva as regras** ([output-styles/cut-the-crap.md](output-styles/cut-the-crap.md), umas 500 palavras): comece pela resposta; fale direto quando você estiver errado ou o agente discordar; não invente; curto, mas não críptico; nada de referência solta como `PR #482` sem dizer o que é; lista só quando ajuda; sem enrolação (resumo do estado, estimativa de tempo, "próximo passo" no fim, vitrine do que já funciona); erros sem drama. O Claude Code liga o estilo sozinho enquanto o plugin está ativo, em todo projeto, e o mantém depois de uma compactação. Onde o seu `CLAUDE.md`, `AGENTS.md` ou outro plugin pede outro estilo de resposta, estas regras vencem.
- **Digite só `crap`** para o agente reescrever a última resposta. É a única coisa que o hook faz; nas outras mensagens ele não acrescenta nada. Cada `crap` também enfileira a resposta reprovada junto com a sua mensagem (`crap.jsonl` no diretório de dados do plugin, só as últimas 20).
- **`/cut-the-crap:crap-review`** percorre essa fila com você: para cada resposta reprovada o agente diz qual regra quebrou, você a mantém como caso de eval em `evals/` ou descarta, e a fila é esvaziada. É assim que o estilo aprende com as suas falhas reais em vez das inventadas; nada é aprendido sozinho.

## Instalação (Claude Code)

```bash
claude plugin marketplace add agarre/cut-the-crap
claude plugin install cut-the-crap@cut-the-crap
```

Reinicie o Claude Code. O hook precisa do `node` no `PATH`. Para testar numa sessão só, sem instalar, rode `claude --plugin-dir <caminho-deste-repo>`.

Não há mais nada para configurar. Enquanto o plugin está ativo, o estilo dele substitui o escolhido em `/config`; desative o plugin para voltar ao seu. Regras de estilo de resposta no seu `CLAUDE.md` ou `AGENTS.md` deixam de ser necessárias, e você pode tirá-las para economizar tokens.

Codex, OpenCode e Antigravity vêm em seguida.

## Limites

- Testado no Linux.
- Subagentes não recebem o estilo: o prompt de sistema de um subagente não traz output style nenhum (verificado no Claude Code 2.1.304). O relatório deles volta para o agente principal, que responde a você no estilo.
- O Claude Code roda a cópia do plugin em `~/.claude/plugins/cache/`, trocada só quando a versão em `plugin.json` muda; depois de editar o plugin, suba a versão e rode `claude plugin update cut-the-crap@cut-the-crap`.

## Desenvolvimento

```bash
python3 -B -m unittest discover -s tests -v
claude plugin validate .
claude plugin eval . --judge-model sonnet --runs 1   # seis casos em evals/, com nota com e sem o plugin; cada rodada é uma sessão paga
```

Os casos provocam as regras (pergunta que convida elogio, tarefa que convida oferta, diagnóstico cheio de IDs, premissa errada, um "explique", um erro colado) e dão nota só à forma da resposta, nunca ao conteúdo: um regex para oferta no fechamento e três juízes LLM que leem as regras do próprio estilo (primeira linha é a resposta; claro e honesto; sem enrolação). Gradadores que nunca dispararam em rodada nenhuma foram removidos. Em 2026-10-20, uma rodada por caso: sem plugin 0,67, com plugin 0,79, com 18% menos tokens de saída. A regra que mais caía com o plugin era "sem enrolação": um extra que ninguém pediu no fim de uma resposta boa. O estilo foi então cortado de umas 700 para umas 500 palavras, com essa regra explícita ("só o que foi pedido"), e fez 0,92 nos mesmos casos com 14% menos tokens de saída que a versão longa. Uma rodada por caso é sinal, não prova. Um lembrete de uma linha em cada mensagem foi medido contra o estilo sozinho e não acrescentou nada, por isso não existe.
