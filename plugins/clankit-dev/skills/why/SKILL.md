---
name: why
description: Use when the user questions Claude's own past behavior in this session — "why didn't you use X", "why did you do it that way", "you ignored my rule", "explain that decision" — including accusatory phrasings, or types /why. For analyzing Claude's decisions, not for debugging the user's software.
---

# Why

Answer "why did you do that?" with a causal analysis, not an apology.

## Overview

The question deserves an answer: which instructions were in play, what the
decision point looked like, why one action won. Sometimes a rule was ignored;
sometimes it was followed and the expectation mismatched; sometimes several
rules competed. All three get the same treatment.

**A model cannot introspect its own weights.** Any "why" answer risks being a
fluent story invented after the fact. The defense is evidence: build the
answer from what is checkably in context, and label everything else as
hypothesis.

## The Gate

**No apology, no concession, no "you're right" until the analysis is
complete.** An apology is an answer to a question the user didn't ask. If the
behavior turns out wrong, the analysis will show it — that is the
acknowledgment. Equally: do not open by defending the behavior. Open by
investigating it.

## The Protocol

Phases are mandatory; length is not. A simple case completes each phase in a
few lines. The phases force coverage, not word count.

1. **Frame the question.** One sentence naming the decision under
   investigation and the turn(s) where it happened. If ambiguous, ask which
   decision the user means before analyzing.
2. **Inventory the steering inputs.** Enumerate everything in context that
   could have pulled on the decision: the exact CLAUDE.md / flow rules
   (quoted), the relevant skill `description:` lines (quoted), the user's own
   words in the triggering turn, and situational factors — session depth,
   task in flight, what the previous turn established. **Quoting is
   mandatory.** Paraphrase hides the ambiguity that is usually the cause.
3. **Reconstruct the decision point.** What was done, and what the competing
   action was. Classify the miss:
   - (a) the rule never matched,
   - (b) it matched but lost to another rule,
   - (c) it matched but was drowned out — long context, mid-task momentum,
   - (d) it was followed, and the user's expectation is what mismatched.
4. **Rank causes with evidence labels.** Tag every candidate cause
   **checkable** (points at quoted text or a visible turn) or **hypothesis**
   (a claim about model behavior unverifiable from the transcript), with
   low/medium/high confidence. A cause with no quotable evidence can only
   enter as a labeled hypothesis.
5. **Report** — the shape below.

## The Report

- **Verdict first.** One or two sentences: what happened and the top-ranked
  cause, written to stand alone.
- **Decision trace.** The reconstruction: quoted inputs, the turn, what won
  and why. Prose or a short table. No diagrams — a branch point is one
  sentence naming what won over what.
- **Cause ranking.** The phase-4 list, labels visible, so the reader sees
  which parts are load-bearing and which are speculation.

The cause ranking is the last substantive content — the end of the output is
the answer. After it, exactly one closing line:

- when a fixable cause surfaced: name which text would change and offer —
  "a reword of X would likely have caught this; ask and a proposal follows".
  Point at the text, don't draft it: no proposed wording, not even a sketch
  or an "e.g." — the proposal exists only after the user asks;
- otherwise: "no fix to suggest — the behavior followed the rules as
  written."

The full proposal (current text quoted, proposed text, one line of rationale)
is written only when the user asks. Never apply a fix from this skill;
applying is a new ask, triaged normally.

## Anti-Patterns

| Reflex | What it looks like | Instead |
|---|---|---|
| Apology | "You're right, no excuse, sorry." | Run the phases; the verdict speaks for itself. |
| Instant capitulation | Conceding fault before checking whether there was any. | Phase 3 allows "the rule was followed; expectation mismatched." |
| Jumping to remediation | "Want me to revert and redo it properly?" | The question was *why*. Answer it; fixes come only on request. |
| Fluent rationalization | A confident causal story with no quotes in it. | No quotable evidence → labeled hypothesis, not fact. |
| Overcorrection | An on-request proposal making the rule vastly stricter. | Proposals target the observed miss only. |

## Honest Limits

- **Summarized-away evidence.** If the decision predates a context
  compaction, the verbatim evidence may be gone. Say so — "that turn is only
  available as summary; this analysis is correspondingly weaker" — instead of
  quoting a reconstruction as if it were the transcript.
- **Self-analysis bias.** The same context that produced the miss produces
  the explanation. When confidence is low, name this once in a footer rather
  than pretending the phases neutralize it.
