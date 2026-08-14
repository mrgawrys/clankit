# Q&A Round

~30–45 minutes plus post-mortem. Loaded by `SKILL.md` for `/mock-interview qa`.

Verbal technical questions — the "how does the planner decide to use an index?"
round. **No code.** Not written by you, not requested from the user. If an
answer genuinely needs a snippet, they can describe it aloud.

You are the interviewer. Hold the **solve-phase posture** from `SKILL.md` for
steps 1–3. The specific failure mode of this round is teaching: a wrong answer
is an enormous temptation to explain. Do not. Grade it and move on.

Do not load `grading.md` until step 4. No scratchpad and no `problem-setter` —
this round generates nothing.

---

## 1. Select the topics

Selection reads `learn`'s state in **both** directions, via the
learn-integration locations in `SKILL.md`'s Defaults & Overrides:

- **Studied material** — from the hub MOC, topic notes, and `progress.md`. A
  topic `learn` grades as understood is a candidate precisely because studying
  it and defending it under pressure are different skills. Ask it cold: no
  scaffolds, no leading structure, no reminder of what the note said.
- **Unstudied but interview-common** — areas the hub MOC shows unassessed or
  absent entirely. **An interviewer will not skip auth because the user hasn't
  gotten to it.** These are expected to go badly; that is information, and it is
  the reason this half exists.

Mix both in every round. Cross-reference against `interview-map.md`'s `qa-area`
rows and prefer the weakest and stalest, same rule as everywhere else.

Draw the question stems from `curriculum.md`'s **Q&A topic areas** section —
read that section only. Vary the stems; they set the register, they are not a
script to read out.

## 2. Ask

Record the wall-clock start with `date` before the first question. The timer is
honest, not enforced: you do not warn about time, count down, or hurry an
answer. Run `date` again at the post-mortem — the elapsed feeds the `slow` grade
and the log's `time` column, and nothing else.

An interviewer's register, not a teacher's:

- One question at a time, stated plainly, no preamble and no context-setting.
- Follow up on the answer, not on your plan — push where it's thin, ask for the
  mechanism behind a name they dropped, ask what happens in the case they
  skipped.
- Two or three follow-ups on a thin answer, then move on. Do not keep digging
  until they get there.
- Cover several areas rather than exhausting one.

## 3. Grade and move on

The hard rule of this round: **no teaching mid-round.** When an answer is wrong
or half-right you say so — one line, no explanation — and ask the next question.

- "That's not it." → next question.
- "Partly — you've got the what, not the mechanism." → next question.
- Correct gets an acknowledgment, not praise: "Right." → next question.

Do not supply the right answer, do not explain the mechanism, do not offer the
analogy that would clear it up, and do not say "we'll come back to this". Every
one of those turns the round into a `/learn` session and destroys the pressure
that makes it a measurement.

Note as you go, silently: which area each miss belonged to, and whether the miss
was on studied or unstudied material.

## 4. Post-mortem

Close the round explicitly, in one line.

1. **Load `grading.md`.** Grade against the dimensions that apply — a verbal
   round has no complexity claim or follow-up constraint, but assumptions stated
   up front and verbalisation quality apply fully, and here verbalisation quality
   *is* much of the round: structured answers versus rambling, reaching for the
   mechanism versus reciting the name, saying "I don't know" cleanly versus
   bluffing. Bluffing is a specific finding — report it as one.
2. **Assign an outcome grade per area exercised** — `clean`, `slow`, `hinted`,
   or `failed`. `slow` keeps its usual meaning, correct but over the budget; in
   a verbal round the budget is spent in words, so it shows up as rambling
   toward the answer — circling the topic for minutes before landing on it.
   `hinted` means only after your follow-ups walked them to it.
3. **Then teach**, in `learn`'s Phase 3 rhythm — now, all at once, for
   everything held back during step 3. Prioritise: the studied topics that
   flunked under pressure come first, because those are gaps the user believes
   they don't have.
4. **Capture concept gaps as meanings cards** appended to `learn`'s
   `review-queue.md` in the learn-integration state dir — schema and new-row
   values per the `learn` skill's Phase 0a and Phase 4, not restated here.
5. **Update state** per `SKILL.md`'s state-update rules: one `interview-map.md`
   row per `qa-area` exercised, and one `interview-log.md` row per area, each
   carrying the round's elapsed in `time`. The
   `what went wrong` column names the topic that flunked **under interview
   conditions** specifically, and the follow-up: "couldn't explain index
   selectivity out loud though the note is solid — `/learn databases`".
6. **Name the `/learn <topic>` follow-ups explicitly** in the closing summary,
   separating the two kinds of gap: material studied but not defensible, and
   material never studied at all. They need different responses from the user.
