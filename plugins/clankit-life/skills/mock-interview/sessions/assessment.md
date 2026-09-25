# Assessment

One short sitting — three or four questions, ~15–20 minutes. Loaded by
`SKILL.md` when no `interview-map.md` exists, when the user picks "continue the
assessment" from the opening flow, or on `/mock-interview assess`. Each sitting
maps a handful of units; the map fills in across sittings.

**Short by design.** A 38-unit questionnaire in one go is a session nobody
finishes. A sitting should end with the user feeling the map moved, not with
them out of energy halfway through a batch.

**No coding.** No submissions, no test runs, no `problem-setter`, no scratchpad.
Reasoning out loud only.

**No teaching.** This session measures; it does not close gaps. When an answer
is wrong, note it and move on. `grading.md` is not loaded: this session assigns
confidence levels, not outcome grades.

This is the only session file that reads `curriculum.md` in full.

---

## Unassessed units

A unit is **unassessed** when its map row is `unknown` with `last-seen` `—`.
Sittings only ever ask about unassessed units; a unit with a real confidence is
left alone.

## Re-assessing from scratch

Only when the user explicitly asks to start the map over. **Say clearly that
this overwrites the current map** — every confidence level and note earned
across previous sessions is replaced — and get confirmation. Then reset every
row to unassessed and run a normal sitting. `interview-log.md` is untouched; it
is append-only history.

## 1. First sitting only: create the map

If no map exists, write `<state dir>/interview-map.md` with **every unit in
`curriculum.md`** as a row — all patterns, themes, architecture domains, Q&A
areas, each with the `kind` its section names — at `unknown`, `—`, note "Not
assessed". A missing row silently removes that unit from every future session.

Then seed from `learn`: read its hub MOC, category MOCs, and `progress.md` via
the learn-integration locations in `SKILL.md`'s Defaults & Overrides. Anything
`learn` grades `advanced` — or `⏭️ skipped`, its way of recording demonstrated
mastery — is set to `solid` with a note crediting the source ("credited from
`learn` — advanced, reviewed 2026-05-02"). Say which units you credited, so the
user can object. `intermediate` in `learn` is not evidence about interview
conditions; those stay unassessed.

Open with one line: what this is, that nothing gets coded, and that it's a few
questions now with more next time.

## 2. Pick the sitting's units

Choose three or four unassessed units from **one** area — a sitting that stays
in one area feels like finishing something. Work through the areas in this
order, since it matches the curriculum's weighting: architecture domains, Q&A
areas, practical themes, Tier 1 patterns, Tier 2 patterns. Within an area, take
units in curriculum order.

## 3. Ask

Post the sitting's questions one or two per message, numbered, and let the user
answer them together.

**Every question is self-contained.** State the problem the way an interviewer
would say it out loud: the input, what to return, a tiny concrete example. Then
one clear ask — "how would you approach it, and why does that work?" Never
refer to a problem by its name alone ("longest substring without repeating
characters — what makes you shrink?"); the user should not need to know the
problem to understand the question.

**The curriculum's fields are the answer key, not the question.** Trigger
signal, invariant, and mechanism are what you grade the answer against. Do not
ask for them by name ("what's the invariant?", "what does the stack hold?") —
pose the problem and let them surface. If the answer lands on the right approach
but skips why it's correct, one follow-up asking why is allowed.

- *Patterns* — a small problem in plain words. "You get a list of daily
  temperatures, like `[73, 74, 75, 71, 69, 72, 76]`. For each day, return how
  many days you'd wait for a warmer one — 0 if never. A double loop is too slow
  for a million days. How would you do it in one pass, and why is it linear?"
- *Practical themes* — a concrete input and a concrete way it breaks. "You're
  writing a function that fills `%key%` placeholders in a template from a
  dictionary: `"Hi %name%"` with `{name: "Ola"}` gives `"Hi Ola"`. How would you
  structure it, and what happens if a value itself contains `%something%`?"
- *Architecture domains* — one of the domain's recurring hard questions, set in
  a one-sentence scenario. "You receive payment webhooks from Stripe; Stripe
  retries any delivery it isn't sure you got, so you sometimes receive the same
  event twice. How do you make sure a customer isn't credited twice?" A design
  round is 60 minutes; this is one answer.
- *Q&A areas* — one mechanism question each, drawn from `curriculum.md`'s stems.

Between messages, a terse "got it" and the next question is enough. If the user
wants to stop early, stop — whatever was answered still gets written.

## 4. Update the map

For each unit asked about, update its row in place:

- `confidence` — `weak` · `shaky` · `solid`. A question the user declined
  leaves its row untouched, so the unit stays unassessed.
  `solid` needs the trigger signal *and* the invariant (or, for a Q&A area or an
  architecture domain, the mechanism and not just the name). Recognising the
  name alone is `weak`. Grade strictly: an inflated map stops serving the unit,
  and the gap survives.
- `last-seen` — today.
- `note` — one line of what the answer actually showed, specific enough to be
  useful in three weeks. "Names the pattern, can't state the invariant" beats
  "shaky on this".

Append one row to `<state dir>/interview-log.md`: round `assess`, the area and
units covered in `problem`, the shape of the result in `what went wrong`. `unit`
and `outcome` are both `—`, per the assessment carve-out in `SKILL.md`'s log
schema.

## 5. Close

Keep it short:

- **Progress** — "14 of 38 units mapped", and which area is now complete, if
  one is.
- **Today's units** — one line each: the confidence and what was missing.
- **What's next** — the next unassessed area, and one real round worth doing on
  a weak unit found today. Both are options for the next `/mock-interview`, not
  a schedule.
