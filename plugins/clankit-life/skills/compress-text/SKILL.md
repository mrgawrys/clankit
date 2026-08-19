---
name: compress-text
description: Use when the user invokes /compress-text (optionally with a file path) or names a glance-read prose artifact — meeting agenda, questions for a meeting, standup notes, checklist, runbook steps, "notes I'll read during the call". For text read in glances while doing something else, not text read at a desk. Never trigger on a hunch that a doc might be read quickly — only when invoked or when the artifact is named. Prose only, never code.
---

# Compress Text

## Overview

Match density to how the document is **read**, not to how much you know. A
glance-read document is read mid-meeting, mid-task, while someone else is
talking — in glances, not passes. It is a memory jog, not a case.

## The shape of a glance-read document

- A list of items, numbered or bulleted, optionally under 2–4 word headings.
- One item per topic the user gave you. The user's five topics make five items.
- Each item is one line: the thing itself — the question, the step, the
  topic — stated directly, front-loaded. A second line is the ceiling, not
  the norm.
- An optional bold 2–3 word label opens the item so the eye can land on it.
- The reader is the person who already knows the background. The background,
  the reasoning, and the evidence live below a `---` fold at the bottom, or in
  a linked doc — the reader chooses to go there; the scan path stays clean.
- The document starts at item 1 and ends at the last item.

One real item, both ways:

**Desk-writer version (wrong):**

> Their configs assume much higher call frequency than ours — we only generate
> a summary when a survey closes, which is rare. Does the small model tier
> hold up on quality for summarization, or is it validated only for
> high-frequency use? Also, our calls currently appear unmetered on the
> platform side; is that intentional today, or a gap that will close?

**Glance version:**

> 3. **Cost + model.** Small tier enough? Roughly what does one run cost?
>    Nothing's metered platform-side as far as I can tell — is that changing?

The feedback that produced this rule, verbatim:

> "Agenda files are something I open and read during the meeting. It's
> supposed to be extremely short… the absolute minimum required to remember
> what it means. I don't have a lot of time to read it. I look at it during
> the call."

## The anti-pattern, named

Justifying each item — writing the case for the question next to the
question — is writing for the writer's credit, to show the thinking was done.
The reader *is* the person the justification would be explaining things to.
Reasoning that genuinely matters goes below the fold, where the reader can
choose it.

## When the document is desk-read

Specs, design docs, research notes, and reports are read at a desk; their
density is correct and this shape does not apply to them. When invoked on
one, compress only its genuinely glance-read section — a summary, a
checklist — and say which part was compressed.

## Usage

- **Writing fresh:** apply the shape from the first draft.
- **`/compress-text <file>`:** rewrite the file in place to this shape;
  report before → after line counts.
