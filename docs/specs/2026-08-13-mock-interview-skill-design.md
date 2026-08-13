# Mock Interview Skill — Design

> **To act on this design:** pick a mode — *vibe* (inline, no machinery),
> *review each task* (per-task diffs), *review at the end* (one subagent
> builds, one review at the end), or *plan first* (`writing-plans`, then how it gets built).
> Ask the user which; don't pick for them.

## What & why

A new portable skill, **`mock-interview`**, in the `clankit-life` plugin, sibling to
`learn`. It simulates technical interview rounds — coding, architecture/design, and
verbal Q&A — grades them harshly against a written rubric, and tracks per-pattern
confidence over time. `learn` teaches; `mock-interview` simulates and grades, then
hands discovered gaps back to `learn`'s machinery.

Driving user context (Michał's, but the skill itself stays generic): full-stack
product engineer preparing over 8–12 weeks (~4–6 h/week) for roles at startups,
scale-ups, founding-engineer and CTO conversations — **not** big-tech loops. Four
gaps, in priority order: producing architecture (not just critiquing it), writing
clean code without tooling/AI, algorithmic understanding, and verbalising while
solving.

Decisions made during design:

- **Practical-first curriculum.** Architecture weighted highest, practical coding
  second. Algorithms slimmed to Tier 1 + useful Tier 2 (heaps, linked lists, trees,
  graph traversal, connected components, topo sort, BFS shortest path, union-find);
  no interval DP, number theory, or bit-manipulation grinding.
- **Separate skill, shared state.** Not a mode flag inside `learn` — the interviewer
  posture (silence, no scaffolds) is the opposite of `learn`'s always-teach contract,
  and counter-instructions invite mode bleed. Shared pieces are files and
  conventions, not prompts.
- **Generated problems with a verified reference.** Every generated problem ships
  with a hidden reference solution; the adversarial test suite must pass against the
  reference before the drill counts. Kills the wrong-expected-output risk without
  the recognition risk of curated lists.
- **No cadence baked in.** The skill proposes the next most valuable session from
  state and asks; it never schedules or nags.
- **Glossary reviews are removed from `learn`** (see last section). Term capture
  into `Glossary.md` stays; nothing quizzes it anymore.

## Skill structure

```
plugins/clankit-life/skills/mock-interview/
├── SKILL.md              ← dispatcher + shared rules (postures, timer, state I/O)
├── sessions/
│   ├── coding.md         ← coding round (practical + algorithmic buckets)
│   ├── architecture.md   ← one-interviewer design conversation
│   ├── qa.md             ← verbal technical Q&A round, learn-aware
│   └── assessment.md     ← first session: measures the user, seeds the map
├── curriculum.md         ← patterns, practical themes, Q&A topic areas
└── grading.md            ← rubric, outcome grades, anti-pattern instructions

plugins/clankit-life/agents/
└── problem-setter.md     ← generates + verifies problems off-screen (first agent
                            definition in this plugin; plugins support agents/)
```

Progressive disclosure: `SKILL.md` stays small and loads only the session file it
needs. `grading.md` is loaded **only at post-mortem time** — an interviewer holding
the scorecard in context starts leaking hints. `curriculum.md` is loaded by the
problem-setter and the assessment, not by the solve phase.

## Invocation

- `/mock-interview` — reads the map and log, proposes the most valuable next
  session with a one-line why, and asks. The user always picks.
- `/mock-interview code | arch | qa` — force a round type.
- `/mock-interview assess` — (re-)run the assessment. Auto-runs if no map exists;
  otherwise only on explicit request.

## The two postures (core constraint)

- **Solve phase — interviewer.** Terse. States the problem, answers only explicit
  clarifying questions the way a real interviewer would, volunteers nothing. No
  hints, no encouragement, no reaction that leaks whether the user's path is right.
  Never reveals the solution, even when asked — especially when asked. Letting the
  user fail completely is the mechanism.
- **Post-mortem — teacher.** Switches to `learn`'s Phase 3 teaching rhythm
  (dialogue, find the edge, explain why, verify by application). Grades against
  `grading.md` first, bluntly, then teaches.

The user talks during the solve phase (verbalising is gap #4, and voice capture
makes it natural): narrating approach, assumptions, edge cases. The interviewer
responds with terse acknowledgments and direct answers to explicit questions only.
Verbalisation quality is a grading dimension.

## Session types

### Coding round (`coding.md`, ~45 min + post-mortem)

1. Optional 5-minute recognition warm-up at session start: 2–3 quick problem
   statements, user names the pattern and trigger signal, no solving.
2. Problem is **deliberately underspecified**. The user must ask clarifying
   questions and state assumptions/edge cases before writing. The interviewer
   answers tersely from the clarification key. The generated tests probe the
   underspecified decisions whether or not the user asked — guessing wrong and
   finding out at pass/fail time is the lesson.
3. Before code: user states approach, data structure, invariant, and time/space
   complexity out loud. A wrong complexity claim is recorded even if tests pass.
4. Timer starts (wall-clock via `date`; honest, not enforced — elapsed feeds the
   `slow` grade). User solves **outside the session** (vim, no LSP/AI, code not
   run), then submits by pasting or pointing at a file path — either works.
5. Skill runs the adversarial suite against the submission and reports
   **pass/fail per test, nothing else**.
6. One follow-up constraint (escaping, streaming, error positions, recovery…),
   ~10 more minutes, same treatment. Repeat once if time allows.
7. Post-mortem.

Problems come from two buckets — practical themes (the `%key%` interpolation
family: parsing, tokenizers, small transforms, mini state machines) and the
algorithm pattern curriculum — chosen by the confidence map.

### Architecture round (`architecture.md`, ~60 min + post-mortem)

One interviewer persona for the whole session — an engineer/CTO/founder who states
a deliberately vague product prompt ("design commenting for our docs product") and
lets the user drive: scope, clarifying questions, data model, service boundaries,
API shape, failure modes, what to defer. The interviewer answers what's asked with
realistic product constraints and probes progressively harder as the design firms
up — a peer poking at choices, not a theatrical role-switch. Scenario flavor sets
who the interviewer is: a founder pushes on build-vs-buy and speed; a staff
engineer on migrations and operational cost. Scenarios biased toward product
engineering: multi-tenant SaaS, permissions, event ingestion, sync, background
jobs.

Each generated scenario carries a pre-written **pressure list** (5–6 things the
design must survive), created before the session; coverage of that list is part of
the grade so grading isn't purely in-the-moment impression.

### Q&A round (`qa.md`, ~30–45 min + post-mortem)

Verbal technical questions, no code — the "how does an index decide to be used?",
"what is the event loop doing during `await`?" round. **Learn-aware in both
directions:**

- *Selection:* reads the `learn` hub MOC, topic notes, and progress log. Probes
  both studied material (does it survive interview pressure without scaffolds?)
  and interview-common areas the user hasn't studied (an interviewer won't skip
  auth because the user hasn't gotten to it).
- *Feedback:* concept gaps become meanings cards in `learn`'s `review-queue.md`;
  the session log notes "flunked X under interview conditions — worth a
  `/learn X` session".

### Assessment (`assessment.md`, ~45 min, first session)

No coding. Short recognition and reasoning questions across the patterns and Q&A
areas, seeded by what the hub MOC already shows (don't re-prove known-solid
topics). Output: the initial per-pattern confidence map and a proposed order that
front-loads weaknesses. The map updates itself after every subsequent session;
re-assessment is manual-only.

## Problem generation — the `problem-setter` agent

Information hiding, not parallelism: the main session's context is the
interviewer's knowledge, and the solution must never enter it (nor the visible
chat). The agent:

1. Receives pattern/theme + difficulty.
2. Writes problem statement, reference solution, and adversarial test suite to the
   session scratchpad.
3. Runs the suite against the reference; iterates until green.
4. Returns **only**: the problem statement, the clarification key (intended answers
   to the underspecified decisions), and "reference verified, N tests".

Follow-up constraints go through the same agent (updated reference, new tests,
re-verified). At grading time the runner executes tests against the submission
from disk; the reference is never printed.

Runner: `tsx` + `node:assert` — standalone TS functions, no framework setup.
Artifacts live in the scratchpad and die with the session; only outcomes persist.

## Grading (`grading.md`)

Dimensions: correctness · edge cases identified **before** being told · complexity
stated correctly · readability and naming · how the design absorbed the follow-up
constraint · assumptions stated up front · verbalisation quality.

Outcome grades: **clean** (correct, in time, edge cases unprompted) · **slow**
(correct, over time) · **hinted** (needed a nudge) · **failed**. A problem is
never served twice — the grade updates the pattern's confidence in the map (so a
weak pattern soon gets a *fresh* problem) and is recorded in the log; a bad
session's post-mortem may recommend a `/learn` session on the underlying topic.

Anti-pattern instructions (verbatim intent from the design brief): no generous
grading; no praise openers; if a session was bad, say so and say why; run the
tests, never eyeball correctness; never reveal solutions early; don't serve
comfortable patterns; the user produces, the skill evaluates — exposition belongs
in the post-mortem only; never accept skipping the clarifying-questions phase.

## State files

Same portability model as `learn`: a **Defaults & Overrides** table in SKILL.md;
state dir defaults to `learn`'s (`.learn/`), so the two skills share state
wherever they're installed. Plain markdown tables, user-editable.

- **`interview-map.md`** — one row per curriculum unit (pattern / practical theme /
  Q&A area): confidence (`unknown / weak / shaky / solid`), last-seen date,
  one-line note. Read by the dispatcher to propose sessions (weakest + stalest
  first — the structural fix for "serving what feels good").
- **`interview-log.md`** — append-only session log: date, round type,
  pattern/theme, one-line problem summary, outcome, time taken, what specifically
  went wrong.

There is no problem queue and no re-serving — problems are single-use. Repetition
happens at the pattern level (the map steers fresh problems toward weak patterns)
and at the concept level (meanings cards in `learn`'s `review-queue.md`).

## Vault integration (Obsidian repo, separate change)

Add to the vault `CLAUDE.md` a "Skill overrides: mock-interview" entry: state dir
`.clanker/learning/`, notes/conventions consistent with the `learn` overrides.

## Glossary removal from `learn`

- `learn/SKILL.md`: remove Phase 0b menu option 2, the whole "Glossary Review"
  section, and the queue-writing half of glossary capture (Phase 3 bucket and
  Phase 4 step 6). Teaching mode still adds newly-met terms to `Glossary.md` as a
  lookup reference; nothing quizzes them.
- Vault: delete `.clanker/learning/glossary-queue.md`. `Learning/Glossary.md`
  stays.

## Testing / verification

Prose skill — no automated tests. Verification is a named dry run: fresh session
invokes `/mock-interview` with no state (assessment auto-runs, map gets seeded),
then one short coding round end-to-end — problem-setter generates and verifies off-
screen (confirm the solution never appears in chat), submission via file path,
tests actually execute, grade lands in both state files, and a meanings card
lands in `review-queue.md`. Glossary removal verified by re-reading `learn/SKILL.md`
for dangling references.

## Out of scope

- Behavioral/experience rounds ("tell me about a conflict").
- Scheduling, calendars, cadence enforcement.
- Take-home simulation (multi-hour projects).
- Any change to `learn`'s teaching flow beyond the glossary removal.
