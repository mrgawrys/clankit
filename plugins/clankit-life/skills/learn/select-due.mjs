#!/usr/bin/env node
// Select a randomized batch of due items from a /learn queue file.
//
// Reads a markdown-table queue (review-queue.md or glossary-queue.md), finds all
// rows where `due <= today`, shuffles them, and prints up to N. Randomizing the
// whole due set — rather than taking oldest-first — keeps same-topic items
// (created together, sharing a due date) from clustering in the same batch and
// leaking each other's answers.
//
// Usage:
//   node select-due.mjs <queue-file> [N=5] [today=YYYY-MM-DD]
//
// Output (stdout):
//   DUE_TOTAL: <count of all due items>
//   SELECTED: <count in this batch>
//   REMAINING_AFTER: <due items not in this batch>  (drives the Phase 0b menu)
//   ---
//   <verbatim markdown rows of the selected items>

import { readFileSync } from 'node:fs';

const [, , file, nArg, todayArg] = process.argv;

if (!file) {
  console.error('usage: select-due.mjs <queue-file> [N=5] [today=YYYY-MM-DD]');
  process.exit(1);
}

const N = Number.isFinite(Number(nArg)) && nArg != null ? Number(nArg) : 5;
const today = todayArg ?? new Date().toISOString().slice(0, 10);

const lines = readFileSync(file, 'utf8').split('\n');

// Locate the table: the separator line (|---|---|...) sits just below the header.
const sepIdx = lines.findIndex((l) => /^\s*\|[-\s|:]+\|\s*$/.test(l) && l.includes('---'));
if (sepIdx < 1) {
  console.error('no markdown table separator found');
  process.exit(1);
}

const cells = (line) => line.split('|').slice(1, -1).map((s) => s.trim());

const header = cells(lines[sepIdx - 1]);
const dueIdx = header.indexOf('due');
if (dueIdx === -1) {
  console.error('no "due" column in table header');
  process.exit(1);
}

// Data rows: everything after the separator that still looks like a table row.
const rows = [];
for (let i = sepIdx + 1; i < lines.length; i++) {
  const l = lines[i];
  if (!l.trim().startsWith('|')) continue;
  const c = cells(l);
  if (c.length < header.length) continue;
  rows.push({ line: l, due: c[dueIdx] });
}

// `due` is YYYY-MM-DD, so lexicographic compare == chronological compare.
const due = rows.filter((r) => r.due <= today);

// Fisher-Yates shuffle.
for (let i = due.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [due[i], due[j]] = [due[j], due[i]];
}

const selected = due.slice(0, Math.max(0, N));

console.log(`DUE_TOTAL: ${due.length}`);
console.log(`SELECTED: ${selected.length}`);
console.log(`REMAINING_AFTER: ${Math.max(0, due.length - selected.length)}`);
console.log('---');
for (const r of selected) console.log(r.line);
