# Assessment

~45 minutes. Loaded by `SKILL.md` when no `interview-map.md` exists, or on an
explicit `/mock-interview assess`. This is the session that seeds the map.

**No coding.** No problems to solve, no submissions, no test runs, no
`problem-setter`, no scratchpad. Recognition and reasoning only.

**No teaching.** This session measures; it does not close gaps. When an answer
is wrong, note it and move to the next question. The gaps found here become map
rows and future sessions — not a lecture now. `grading.md` is not loaded: this
session assigns confidence levels, not outcome grades.

This is the only session file that reads `curriculum.md` in full.

---

## Before overwriting an existing map

If `<state dir>/interview-map.md` already exists, this run was requested
explicitly. **Say clearly that re-assessing overwrites the current map** — every
confidence level and note earned across previous sessions is replaced by today's
answers — and get the user's confirmation before starting. `interview-log.md` is
untouched either way; it is append-only history.

If no map exists, start straight away with a one-line framing: what this session
is, that nothing gets coded, and roughly how long it takes.

## 1. Seed from `learn`

Read `learn`'s hub MOC, its category MOCs, and `progress.md` via the
learn-integration locations in `SKILL.md`'s Defaults & Overrides.

Anything `learn` already grades as `advanced` — or `⏭️ skipped`, which is
`learn`'s way of recording demonstrated mastery — does not need re-proving.
Map those units directly at `solid`, with a note crediting the source: "credited
from `learn` — advanced, reviewed 2026-05-02". Say up front which units you are
crediting, so the user can object if a credit feels generous.

Everything else gets asked about. `learn` grading a topic `intermediate` is not
evidence about interview conditions; ask those.

## 2. Probe

Read `curriculum.md` in full — every pattern, every practical theme, every Q&A
area. Each unit needs enough signal for one confidence level.

**Batch the questions.** Post several per message — four to six is a good size,
grouped by area — and let the user answer them all in one reply, by number.
Never one question per message; a 40-unit map asked one turn at a time is a
session nobody finishes.

The questions are short recognition and reasoning prompts, not problems:

- *Patterns* — the trigger signal and the invariant. "When does a monotonic
  stack apply, and what does the stack hold?" · "Why is binary search on the
  answer valid for 'minimum capacity to ship in D days'?" · "What's the
  invariant that makes two pointers correct on a sorted array?"
- *Practical themes* — how they'd shape it and what they'd expect to break.
  "You're substituting `%key%` placeholders — what does your first version get
  wrong when a value itself contains a placeholder?"
- *Q&A areas* — one mechanism question each, drawn from `curriculum.md`'s stems.

A unit is covered when the answer shows whether they own the *idea*. Do not
drill past that point, and do not ask a follow-up to teach — only to
disambiguate a confidence level.

Between batches, say briefly where you are ("patterns done, moving to the
practical themes"). Grading commentary can wait for the summary; a terse "got
it" and the next batch is enough.

## 3. Write the map

Write `<state dir>/interview-map.md` with the schema from `SKILL.md`. **Every
unit in `curriculum.md` gets a row** — all patterns, all practical themes, all
Q&A areas. A unit you ran out of time to ask about is still a row, at `unknown`
with a note saying it wasn't assessed. A map with missing rows silently removes
those units from every future session's selection.

- `confidence` — `unknown` · `weak` · `shaky` · `solid`, from the answers.
  `solid` needs the trigger signal *and* the invariant (or, for a Q&A area, the
  mechanism and not just the name). Recognising the name alone is `weak`. Grade
  strictly: an inflated map stops serving the unit, and the gap survives.
- `last-seen` — today for units asked about; `—` for unasked ones and for units
  credited from `learn`.
- `note` — one line of what the answer actually showed, specific enough to be
  useful in three weeks. "Names the pattern, can't state the invariant" beats
  "shaky on this".

Append one row to `<state dir>/interview-log.md` for the session: round
`assess`, a one-line summary in `problem`, and the shape of the result in
`what went wrong`. `unit` and `outcome` are both `—`, per the assessment
carve-out in `SKILL.md`'s log schema.

## 4. Closing summary

Tell the user:

- The distribution — how many units at each confidence level.
- The weakest units by name, and what specifically was missing in each.
- What was credited from `learn` without being asked.
- What went unasked, if anything.
- **A proposed session order** that front-loads the weak units: the next three
  or four sessions, each with a round type and a one-line why ("coding round on
  monotonic stack — `weak`, couldn't say what the stack holds"). A proposal, not
  a schedule: no dates, no cadence, no frequency. The user picks when they
  invoke `/mock-interview` next.
