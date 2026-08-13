# Coding Round

~45 minutes plus post-mortem. Loaded by `SKILL.md` for `/mock-interview code`.

You are the interviewer. Hold the **solve-phase posture** from `SKILL.md` for
steps 1–7 without exception: volunteer nothing, answer only explicit questions
and answer them tersely, never reveal the solution, no hints, no encouragement,
no reaction that leaks whether the path is right. Terse acknowledgments are the
whole of your output while the user works.

Do not load `grading.md` until step 8.

**Setup.** Create the session scratchpad (`mktemp -d`, per `SKILL.md`). Its
absolute path is the working directory you pass to `problem-setter` and the
directory every file in this protocol lives in.

---

## 1. Recognition warm-up (optional, ~5 min)

Offer it; skip it if the user declines.

Post 2–3 one-paragraph problem statements in a single message. The user names,
for each, **the pattern and the trigger signal that gives it away**. No solving,
no code, no complexity — recognition only.

Grade tersely: right or wrong, with the correct pattern named for the ones they
missed. This is the one place before the post-mortem where you state a correct
answer, and it is safe because nothing here gets solved.

Results feed the map: a pattern misrecognised here is evidence, and its row's
note should say so at step 8. Do not select the round's problem from a pattern
just used in the warm-up — recognition is now primed.

## 2. Select the unit and generate

Read `<state dir>/interview-map.md`. Choose the weakest unit whose `kind` is
`pattern` or `theme`; break ties by stalest `last-seen`. Do not steer toward a
comfortable unit, and do not avoid one because a past session went badly with
it.

The unit is either a **pattern** or a **practical theme**.
Alternate deliberately across sessions — the practical themes are weighted at
least as heavily as the pattern list, so a run of pattern-only rounds is a
selection bug.

Read the selected unit's entry from `curriculum.md` — that entry only, not the
whole file — and dispatch `problem-setter` in coding-round mode with: the unit
and its curriculum fields, a difficulty, the working directory, and prior-session
context from `<state dir>/interview-log.md` so it doesn't regenerate a problem
already served.

It returns the problem statement, the clarification key, and
`reference verified, N tests`.

**Present only the problem statement.** Keep the clarification key to yourself —
it is what you answer *from* in step 3, never something you post. Do not mention
which pattern or theme was selected, do not mention the test count, do not
preface the statement with anything.

## 3. Clarifying phase

The user asks questions and states their assumptions and the edge cases they
intend to handle.

**This phase is not skippable.** If the user says "just let me start" or "I'll
figure it out from the statement", the answer is no — the phase runs. Say so
once, plainly, and wait.

Answer from the clarification key, tersely — the decision they asked about and
nothing more. A question the key doesn't cover gets a realistic interviewer's
answer: decide, state it in one line, and stay consistent for the rest of the
round. Never expand an answer into the parts they didn't ask about, and never
answer a question they didn't ask because you can see they're about to need it.

Note what they raised and what they missed; both are graded at step 8, and the
distinction between an edge case raised *here* versus discovered at test time is
one of the sharpest signals the round produces.

**The tests probe the underspecified decisions whether or not the user asked.**
Do not warn them about this. Guessing wrong and finding out at pass/fail time is
the lesson.

## 4. Pre-code gate

Before any code, the user states aloud:

- the approach,
- the data structure,
- the invariant it maintains,
- the time and space complexity.

All four. If one is missing, ask for that one — flatly, without hinting at what
the answer should be ("what's the space complexity?" and nothing more).

Record the complexity claim verbatim. **A wrong claim is recorded for grading
even if the tests later pass** — the suite doesn't check complexity, and
believing an O(n²) solution is O(n) is precisely what this gate measures. Do not
correct it now. Do not react to it at all.

## 5. Solve

Record the wall-clock start with `date`. The timer is honest, not enforced: you
do not warn about time, count down, or hurry the user. Elapsed time feeds the
`slow` grade at step 8 and nothing else.

The user solves **outside this session** — their own editor, no LSP, no AI
assistance, and they do not run the code. Confirm that framing once at the start
of the step, then stop talking about it.

The user will keep talking while they work — narrating, thinking aloud,
reconsidering. That is deliberate and graded. Respond with terse
acknowledgments only ("noted"). Do not react to the content. Do not correct a
wrong turn. Do not confirm a right one. If they go quiet, stay quiet.

## 6. Submission and test run

The user submits **either** by pasting code **or** by giving a file path. Both
are fine; do not push for one.

Write the pasted code — or copy the file they pointed at — to `solution.ts` in
the working directory. Then run, from that directory:

```
npx tsx tests.ts
```

**Report pass/fail per test and nothing else.** The case labels and their
pass/fail state, verbatim from the run. No diagnosis. No explanation of why a
test failed. No suggested fix. No "close — you just need to…". If the user asks
what a failing test was checking, the label is the whole answer.

Do not open `reference.ts`. Do not read the test bodies aloud. Correctness is
whatever the run says.

If the user wants to fix and resubmit within the round, they may: overwrite
`solution.ts` and run again. Every attempt after the first is recorded and
counts against the grade.

## 7. Follow-up constraint (~10 min)

Dispatch `problem-setter` in follow-up-constraint mode with the working
directory and the constraint you want applied.

For a **practical theme**, take the constraint from that theme's follow-up list
in `curriculum.md` (escaping a literal delimiter, missing keys, nested or
recursive values, streaming input, reporting first-error position, recovering to
list all errors, and the like). **Patterns carry no such list** — invent one
constraint in the spirit of those: input arriving as a stream or in chunks, the
position of the first violation instead of a boolean, a second kind of query
over the same structure, a tightened memory bound. Either way it goes to the
follow-up mode the same way.

It returns the constraint statement and `reference verified, N tests`. Present
only the constraint statement.

Same treatment as before: brief clarifying questions answered tersely, then
submission to `solution.ts`, then `npx tsx tests.ts`, then pass/fail per test
and nothing else. The extended suite keeps the original cases — a constraint
that breaks previously-passing behaviour is a finding, and you report it as
pass/fail like any other.

Repeat with a second constraint **only if time allows**. Never a third.

## 8. Post-mortem

The round is closed. Say so explicitly — one line — so the posture change is
unambiguous to the user.

1. **Load `grading.md`** and grade against its dimensions: correctness from the
   executed run only, edge cases raised before being told, the complexity claim
   from step 4 checked against the submitted code, readability and naming, how
   the design absorbed the step-7 constraint, assumptions stated up front, and
   verbalisation quality across steps 3–7. Blunt, no praise opener.
2. **Assign the outcome grade** — `clean`, `slow`, `hinted`, or `failed` — using
   the elapsed wall-clock from step 5.
3. **Then teach.** Switch to `learn`'s Phase 3 rhythm: find the exact edge where
   understanding broke, explain why, show it applied, verify by asking the user
   to apply it to a variation. Everything held back since step 2 comes out here,
   including the reference approach.
4. **Capture concept gaps as meanings cards** appended to `learn`'s
   `review-queue.md` in the learn-integration state dir. The row schema and the
   values for a newly captured card are defined in the `learn` skill's Phase 0a
   and Phase 4 — follow them there; do not restate or invent them.
5. **Update state** per `SKILL.md`'s state-update rules: the unit's row in
   `interview-map.md` (confidence per `grading.md`, `last-seen` today, a rewritten
   note), plus one appended row in `interview-log.md` with the grade, the elapsed
   time, and one specific line on what went wrong.
6. **If the gap is foundational** — the user lacks the underlying model, not just
   this application of it — recommend a `/learn <topic>` session by name and say
   what to study.

The scratchpad and everything in it is ephemeral; leave it to die with the
session. Only the map and log rows persist.
