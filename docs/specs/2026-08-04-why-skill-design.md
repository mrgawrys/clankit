# `why` Skill — Design

> **To act on this design:** pick a mode — *vibe* (inline, no machinery),
> *review each task* (per-task diffs), *review at the end* (delegated, reviewed
> per task), or *plan first* (`writing-plans`, then how it gets built).
> Unattended end-to-end is `/autopilot`. Ask the user which; don't pick for
> them.

## Problem

When the user questions Claude's past behavior — "why didn't you use the
brainstorming skill?", "you ignored my rule", "why did you do it that way" —
the default response is an apology and instant agreement. The user wants a
causal analysis: which instructions were in play, what the decision point
looked like, why one action won over another. Sometimes a rule was ignored;
sometimes it was followed and the expectation mismatched; sometimes several
rules competed and one prevailed. All three deserve the same treatment.

A hard constraint shapes the design: a model cannot introspect its own
weights. Any "why" answer risks being a fluent post-hoc rationalization. The
skill's job is to force the answer to be built from checkable evidence —
what was verifiably in context — with anything else explicitly labeled as
hypothesis.

## Identity and invocation

- **Name:** `why`, at `plugins/clankit-dev/skills/why/SKILL.md`.
- **Explicit:** `/why`, optionally with an argument (`/why no brainstorm?`).
- **Auto-trigger:** the `description:` names the situation, not keywords —
  fire whenever the user questions Claude's own past behavior in the session,
  including accusatory phrasings ("you ignored my rule"), which are the ones
  that most reliably produce the apology reflex.
- **Scope:** any behavior question — rule compliance, skill selection,
  approach choices, stopping points. Not for debugging the user's software;
  the subject under investigation is Claude's own decision.

## The protocol

The skill opens with a hard gate:

> No apology, no concession, no "you're right" until the analysis is
> complete. An apology is an answer to a question the user didn't ask. If the
> behavior turns out wrong, the analysis will show it — that is the
> acknowledgment.

Five phases, in order. Phases are mandatory; length is not — a simple case
completes each in a few lines. The phases force coverage, not word count.

1. **Frame the question.** One sentence naming the decision under
   investigation and the turn(s) where it happened. If the user's question is
   ambiguous, ask which decision they mean before analyzing.
2. **Inventory the steering inputs.** Enumerate everything in context that
   could have pulled on the decision: exact CLAUDE.md / flow rules (quoted),
   relevant skill `description:` lines (quoted), the user's own words in the
   triggering turn, and situational factors (session depth, task in flight,
   what the previous turn established). Quoting is mandatory — paraphrase
   hides the ambiguity that is usually the cause.
3. **Reconstruct the decision point.** What the model did, and what the
   competing action was. Classify: (a) the rule never matched, (b) matched
   but lost to another rule, (c) matched but was drowned out (long context,
   mid-task momentum), or (d) was followed — and the user's expectation is
   what mismatched.
4. **Rank causes with evidence labels.** Every candidate cause is tagged
   **checkable** (points at quoted text or a visible turn) or **hypothesis**
   (a claim about model behavior unverifiable from the transcript) with
   low/medium/high confidence. A cause with no quotable evidence can only
   enter as a labeled hypothesis.
5. **Report.** See below.

## The report

One structured terminal reply:

- **Verdict first** — one or two sentences: what happened and the top-ranked
  cause, written to stand alone.
- **Decision trace** — the reconstruction: quoted inputs, the turn, what won
  and why. Prose or a short table.
- **Decision tree** — a mermaid diagram of the actual branch points, taken
  path marked, expected path shown diverging. Only where there was genuinely
  a branch; a straight-line case skips the tree rather than drawing a
  two-node diagram for ceremony.
- **Cause ranking** — the phase-4 list with its checkable/hypothesis labels
  visible, so the reader can see which parts of the story are load-bearing
  and which are speculation.

The cause ranking is the last substantive content: the end of the output is
the answer.

## Fix on request

After the analysis, a single closing line, one of two forms:

- an offer, when the analysis surfaced a fixable cause: a rewording of the
  trigger/rule would likely have caught this — ask and a proposal follows;
- "no fix to suggest — the behavior followed the rules as written."

The actual proposal — current text quoted, proposed text beside it, one
sentence of rationale — is only written when the user asks. Proposals are
never applied by this skill; applying is a new ask, triaged normally.

## Anti-patterns

| Reflex | What it looks like | What the skill demands instead |
|---|---|---|
| Apology | "You're right, I should have used it, sorry." | Run the phases; the verdict speaks for itself. |
| Instant capitulation | Agreeing the behavior was wrong before checking whether it was. | Phase 3 explicitly allows "the rule was followed; expectation mismatched." |
| Fluent rationalization | A confident story with no quotes in it. | Phase 4: no quotable evidence → labeled hypothesis, not fact. |
| Overcorrection | An on-request proposal that makes the rule vastly stricter so it can never miss. | Proposals target the observed miss only. |

## Honest limits

Stated in the skill itself:

- **Summarized-away evidence.** If the decision predates a context
  compaction, the verbatim evidence may be gone. The report must say so
  ("the turn in question is only available as summary; this analysis is
  correspondingly weaker") instead of quoting a reconstruction as transcript.
- **Self-analysis bias.** The same context that produced the miss produces
  the explanation. When confidence is low, the report names this once in a
  footer rather than pretending the phases neutralize it.

## Testing

Prose skill — no automated tests. Verification is behavioral, per
`writing-skills`: exercise the skill against representative "why" questions
(rule ignored, rule followed but expectation mismatched, two rules competing)
and check the output opens with a verdict, quotes its evidence, labels its
hypotheses, and ends with the analysis rather than an unsolicited fix.
