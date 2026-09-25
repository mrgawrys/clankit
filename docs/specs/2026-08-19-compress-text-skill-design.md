# compress-text Skill — Design

> **To act on this design:** pick a mode — *vibe* (inline, no machinery),
> *review each task* (per-task diffs), *review at the end* (one subagent
> builds, one review at the end), or *plan first* (`writing-plans`, then how it gets built).
> Ask the user which; don't pick for them.

## Problem

AI-written notes meant to be read in glances — meeting agendas, standup notes,
checklists, runbook steps — come out written for a desk reader: preambles,
rationale paragraphs, nested sub-bullets. Every sentence is defensible; the
document as a whole is unusable mid-meeting. A real case: an agenda of eight
meeting questions came out at ~110 lines and had to be cut to 48 by hand, with
nothing of substance dropped — everything removed was the writer's justification
for asking, not something the reader needs in front of them during the call.

## What this is

A prose-style rulebook skill, `clankit-life:compress-text` — the same species as
`writing-clearly-and-concisely`: rules applied while writing, no workflow, no
subagents. One file, `plugins/clankit-life/skills/compress-text/SKILL.md`, well
under a page. A terseness skill that runs long is self-refuting.

Two usage modes:

- **Writing fresh** — the rules shape the draft from the first line.
- **`/compress-text <file>`** — rewrite an existing doc in place; report
  before/after line counts.

Prose only. Not for code — the name says so on purpose.

## Trigger — explicit only

The skill fires when the user invokes `/compress-text` or names a covered
artifact: meeting agenda, questions for a meeting, standup notes, checklist,
runbook steps, "notes I'll read during the call". The doc-type list is
illustrative; the defining concept is the reading situation — *text read in
glances while doing something else*.

It must NOT fire on inference — a hunch that a doc might be read quickly is not
a trigger. The description says this outright. (Decided deliberately over
infer-and-default-short and ask-when-unclear.)

## Skill content, in order

1. **The rule.** Match density to how the doc is *read*, not to how much you
   know. Ceiling: one line per item; two only if the item genuinely needs them.
   Write the question, not the case for the question. No preamble, no closing
   section, no nested rationale. Completeness loses to scannability.
2. **The anti-pattern, named.** Justifying each item to show the thinking was
   done — writing for the writer's credit, not the reader's use. If the
   reasoning matters, it goes where the reader can choose to find it, never in
   the scan path.
3. **The fold convention.** Glance section on top; anything longer goes below a
   `---` or into a linked doc. Detail may exist — just not in the scan path.
4. **Worked example.** A real before/after: one agenda item as the ~10-line
   original beside its 2-line rewrite, with the user feedback that prompted it
   ("Agenda files are something I open and read during the meeting… I look at
   it during the call."). The example is genericized for a public repo — the
   shape and line counts are real; identifying specifics are not.
5. **Escape hatch.** Specs, research docs, and design docs want density; never
   apply this skill to them wholesale. If invoked on one, compress only the
   genuinely glance-read part (a summary, a checklist section) and say so.
6. **Usage modes.** The two modes above, one line each.

## Testing

Prose, not code — no tests. Verification run: apply the finished skill to the
original 110-line agenda failure and check the result lands near the 48-line
human-edited version in both length and feel.
