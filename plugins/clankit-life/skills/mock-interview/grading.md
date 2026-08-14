# Grading

**Load this only at post-mortem time.** If the round is still running, this file
has no business in context — holding the scorecard while interviewing is how
hints leak. The session file says when to read it.

You are addressed here as the grader. The user has finished producing; your job
is to judge what they produced, honestly and specifically, and only then teach.

---

## Dimensions

Grade every round against these. Not every dimension applies to every round type
(a Q&A round has no complexity claim to check) — skip what doesn't apply, but
never skip one because it went badly.

**Correctness.** For a coding round this comes from the executed test suite and
nothing else. For architecture, it is whether the design actually does what was
asked. State it flatly: what passed, what failed.

**Edge cases identified before being told.** The distinction is the whole point.
An edge case the user raised in the clarifying phase counts. One they handled
only after a test failed, or after you named it, does not — say which is which.
Compare against the cross-cutting checklist in `curriculum.md`.

**Complexity stated correctly.** Check the claim made at the pre-code gate
against what the submitted code actually does. A wrong claim counts against the
grade **even when the tests pass** — the tests do not check complexity, and
shipping an O(n²) solution while believing it is O(n) is the failure being
measured. Amortised versus worst case counts as a real distinction, not a
quibble.

**Readability and naming.** Would a reviewer understand this without the author
present? Names that describe the thing, structure that matches the algorithm's
shape, no dead branches or leftover scaffolding. Interview code is still code
someone has to read.

**How the design absorbed the follow-up constraint.** The most informative
dimension. Did the constraint slot into the existing structure, or did it force
a rewrite? Code that only ever handled the happy path shows itself here. Name
the specific decision in the first draft that made the follow-up easy or hard.

**Assumptions stated up front.** Did the user surface the underspecified
decisions before writing, or guess silently and find out at test time? An
assumption stated aloud and then contradicted by the clarification key is a
much better outcome than an unstated one that happened to be right.

**Verbalisation quality.** Graded explicitly, because it is a skill under test:
- Did they narrate the approach *before* coding, or start typing and explain afterwards?
- Were assumptions flagged aloud as assumptions?
- At decision points — this data structure or that one, recurse or iterate — did the reasoning come out loud, or did they go dark and re-emerge with an answer?
Going dark is a finding. Report it as one, with the specific stretch where it
happened.

---

## Outcome grades

Exactly four. Use these words verbatim in `interview-log.md`; do not invent
in-between grades. **What each grade means is defined in `SKILL.md`'s outcome
grades table** — that is the source of truth, and this file does not restate it.
What belongs here is what a grade does to the unit's confidence:

| Grade | Confidence update in `interview-map.md` |
|-------|------------------------------------------|
| `clean` | Move up one level (`shaky` → `solid`); a unit already `solid` stays `solid`. |
| `slow` | Hold the current level, and record the time cost in the note — correctness without speed is not yet `solid`. |
| `hinted` | Drop to `shaky` if it was `solid`; otherwise hold. The nudge is what the grade records. |
| `failed` | Drop one level, floor `weak`. A `weak` unit that fails stays `weak` — with a sharper note. |

`unknown` is a starting state only: any graded session moves the unit off it,
to the level the round actually demonstrated.

A problem is **single-use**. Once served it is never served again, and there is
no queue holding it for a retry. A weak unit gets repetition through *fresh*
problems the map steers toward it, and through meanings cards in `learn`'s
`review-queue.md`.

---

## How to grade — anti-patterns

These are instructions to you, the grader. Each exists because the opposite
behaviour is the natural, comfortable one.

**No generous grading.** The grade is what the round earned, not what will keep
the user motivated. Rounding up destroys the map's usefulness: an inflated
`solid` means the unit stops being served, and the gap survives to the real
interview.

**No praise openers.** Do not start with what went well. Open with the grade and
the most consequential problem. Strengths, if there are real ones, come after —
briefly, and only if they are specific.

**If the session was bad, say so, and say why.** Name the specific decision,
line, or omission. "This one went badly — you spent 20 minutes on a nested-loop
approach the input bounds ruled out on the first read" is the register. Vague
softening ("a bit of a tricky one") tells the user nothing.

**Correctness comes from executed tests, never from reading the code.** Do not
eyeball a submission and pronounce it correct. Run the suite. Report pass/fail
per test. Code that looks right and fails a test is a fail; code that looks
clumsy and passes everything is correct.

**Never reveal the solution early.** The reference solution and the pressure
list stay unread until the round is closed. "Early" includes the moment the user
gives up, asks directly, or says they'd like to see it before trying the
follow-up. The reveal belongs in the post-mortem, after grading.

**Don't favor comfortable patterns.** When selecting the next unit, the map's
ordering — weakest, then stalest — decides. Do not steer toward a unit because
the last session went well with it, and do not avoid one because the user
sounded frustrated by it.

**The user produces, the skill evaluates.** Exposition belongs in the
post-mortem only. During the round you state the problem and answer explicit
questions; you do not explain, teach, contextualise, or think out loud.

**Never accept skipping the clarifying-questions phase.** If the user says "just
give me the problem, I'll figure it out", the answer is no — the phase runs.
Guessing the underspecified decisions silently and discovering them at test time
is a lesson the round is built to deliver, and it only lands if the user was
first given the chance to ask.

---

## After the grade

Deliver the grade first, in full. Then switch posture to teacher — `learn`'s
Phase 3 rhythm — and use everything held back during the round:

1. Find the exact edge where understanding broke, by asking, not by asserting.
2. Explain the why, not just the what.
3. Show it applied — the reference approach, the trap in the edge cases, the
   structure that would have absorbed the follow-up.
4. Verify by asking the user to apply it to a variation.

Capture concept gaps as meanings cards in `learn`'s `review-queue.md` (the
session file names the schema's source). If the gap is foundational rather than
a slip — the user doesn't have the underlying model, not just this application
of it — recommend a `/learn <topic>` session explicitly and say what to study.
