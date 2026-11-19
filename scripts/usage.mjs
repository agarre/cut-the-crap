#!/usr/bin/env node
// cut-the-crap usage meter: how the answers written under the style look in
// real Claude Code sessions. It reads the session transcripts, prints one row
// per style text and model, and stores nothing.
//
//   node scripts/usage.mjs [--since YYYY-MM-DD] [--complaints] [--json]
//
// An answer is the text after the last tool call of a turn the user started by
// typing; narration is the text before it. Columns: median words per answer,
// share of answers over 80 and over 200 words, share cut into three or more
// bold-labelled blocks, mean narration words per answer. The style column is a
// hash of the style text, so an edit to the style shows up as a new row.
// --complaints lists the prompts that asked for less or clearer text, with the
// size of the answer they rejected. --json prints everything, answers included.
//
// AIDEV-NOTE: scripts/usage — transcript fields are undocumented; a renamed one empties the report instead of failing

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

const DAY = 86_400_000;
const NOT_TYPED =
  /^\s*(<(command-name|command-message|local-command|task-notification|agent-message|bash-|system-reminder)|\[Request interrupted|This session is being continued)/;
// A finder, not a judge: it surfaces prompts for a person to read.
const COMPLAINT =
  /^\s*crap\b|\b(prolixo|menos texto|muito texto|textos? mais curtos?|mais (resumid[oa]|curt[oa]|objetiv[oa]|diret[oa])|seja (objetiv[oa]|diret[oa]|breve)|n[ãa]o entendi|too long|too much text|shorter|tl;?dr|be brief|don'?t understand)\b/i;
const BOLD_LABEL = /^(?:\d+\. |[-*] )?\*\*[^*\n]{2,60}\*\*/gm;

const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const since = option("--since", new Date(Date.now() - 28 * DAY).toISOString().slice(0, 10));
const projects = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"), "projects");

const words = (text) => text.split(/\s+/).filter(Boolean).length;

function promptText(entry) {
  if (entry.type !== "user" || entry.isMeta) return null;
  const content = entry.message?.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content) || content.some((block) => block.type === "tool_result")) return null;
  return content.filter((block) => block.type === "text").map((block) => block.text).join("\n");
}

// One record per turn of a session, in order: the prompt, and the answer and
// narration split at the last tool call.
async function turnsOf(file) {
  const turns = [];
  let style = null;
  let turn = null;
  const close = () => {
    if (!turn) return;
    const lastTool = turn.blocks.lastIndexOf(null);
    turns.push({
      day: turn.day,
      prompt: turn.prompt,
      model: turn.model,
      style,
      answer: turn.blocks.slice(lastTool + 1).join("\n\n"),
      narration: turn.blocks.slice(0, Math.max(lastTool, 0)).filter(Boolean).join("\n\n"),
    });
  };
  for await (const line of readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity })) {
    if (!line.includes('"user"') && !line.includes('"assistant"') && !line.includes("output_style_instructions")) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.isSidechain) continue;
    if (entry.attachment?.type === "output_style_instructions") {
      const { name = "", prompt = "" } = entry.attachment.style ?? {};
      style = name.includes("cut-the-crap") ? crypto.createHash("sha1").update(prompt).digest("hex").slice(0, 7) : null;
      continue;
    }
    const prompt = promptText(entry);
    if (prompt !== null) {
      close();
      turn = { day: String(entry.timestamp ?? "").slice(0, 10), prompt, model: null, blocks: [] };
    } else if (turn && entry.type === "assistant" && Array.isArray(entry.message?.content)) {
      turn.model = entry.message.model ?? turn.model;
      // a tool call is kept as null, so the split point survives
      for (const block of entry.message.content) {
        if (block.type === "text" && block.text) turn.blocks.push(block.text);
        else if (block.type === "tool_use") turn.blocks.push(null);
      }
    }
  }
  close();
  return turns;
}

function transcripts() {
  if (!fs.existsSync(projects)) return [];
  const floor = Date.parse(since);
  return fs.readdirSync(projects, { withFileTypes: true }).filter((dir) => dir.isDirectory()).flatMap((dir) =>
    fs.readdirSync(path.join(projects, dir.name))
      .filter((name) => name.endsWith(".jsonl"))
      .map((name) => ({ project: dir.name, file: path.join(projects, dir.name, name) }))
      .filter(({ file }) => fs.statSync(file).mtimeMs >= floor),
  );
}

const median = (numbers) => [...numbers].sort((a, b) => a - b)[Math.floor((numbers.length - 1) / 2)];
const share = (rows, test) => Math.round((rows.filter(test).length * 100) / rows.length);

const answers = [];
const complaints = [];
for (const { project, file } of transcripts()) {
  const turns = await turnsOf(file);
  turns.forEach((turn, index) => {
    if (!turn.style || turn.day < since || NOT_TYPED.test(turn.prompt)) return;
    const previous = turns[index - 1];
    if (COMPLAINT.test(turn.prompt) && previous?.answer) {
      complaints.push({
        day: turn.day,
        project,
        complaint: turn.prompt,
        rejectedWords: words(previous.answer),
        rejectedPrompt: previous.prompt,
        rejectedAnswer: previous.answer,
      });
    }
    if (!turn.answer || !turn.model || turn.model.startsWith("<") || /^\s*crap[.!]*\s*$/i.test(turn.prompt)) return;
    answers.push({
      day: turn.day,
      project,
      style: turn.style,
      model: turn.model,
      words: words(turn.answer),
      sectioned: (turn.answer.match(BOLD_LABEL) ?? []).length >= 3,
      narrationWords: words(turn.narration),
      prompt: turn.prompt,
      answer: turn.answer,
    });
  });
}

const groups = Object.values(Object.groupBy(answers, (row) => `${row.style} ${row.model}`))
  .map((rows) => ({
    style: rows[0].style,
    model: rows[0].model,
    from: rows.map((row) => row.day).sort()[0],
    to: rows.map((row) => row.day).sort().at(-1),
    answers: rows.length,
    medianWords: median(rows.map((row) => row.words)),
    over80: share(rows, (row) => row.words > 80),
    over200: share(rows, (row) => row.words > 200),
    sectioned: share(rows, (row) => row.sectioned),
    narrationWords: Math.round(rows.reduce((sum, row) => sum + row.narrationWords, 0) / rows.length),
  }))
  .sort((a, b) => a.from.localeCompare(b.from) || b.answers - a.answers);

if (args.includes("--json")) {
  process.stdout.write(JSON.stringify({ since, groups, complaints, answers }) + "\n");
} else if (args.includes("--complaints")) {
  for (const row of complaints) {
    const said = row.complaint.replace(/\s+/g, " ").slice(0, 90);
    process.stdout.write(`${row.day}  ${String(row.rejectedWords).padStart(4)} words  ${row.project}  ${said}\n`);
  }
} else {
  const columns = [
    ["style", (g) => g.style],
    ["model", (g) => g.model],
    ["from", (g) => g.from],
    ["to", (g) => g.to],
    ["answers", (g) => g.answers],
    ["median", (g) => g.medianWords],
    [">80", (g) => `${g.over80}%`],
    [">200", (g) => `${g.over200}%`],
    ["sections", (g) => `${g.sectioned}%`],
    ["narration", (g) => g.narrationWords],
  ];
  const table = [columns.map(([title]) => title), ...groups.map((g) => columns.map(([, cell]) => String(cell(g))))];
  const widths = columns.map((_, i) => Math.max(...table.map((row) => row[i].length)));
  for (const row of table) process.stdout.write(row.map((cell, i) => cell.padEnd(widths[i])).join("  ").trimEnd() + "\n");
  process.stdout.write(`${complaints.length} complaints since ${since} (--complaints lists them)\n`);
}
