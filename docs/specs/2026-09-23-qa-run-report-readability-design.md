# qa-run report readability — Design

> **To act on this design:** pick a mode — *vibe* (inline, no machinery),
> *review each task* (per-task diffs), *review at the end* (one subagent
> builds, one review at the end), or *plan first* (`writing-plans`, then how it gets built).
> Ask the user which; don't pick for them.

## Goal

A `qa-run` report a mixed team — PO, QA, developer — can read top to bottom:
issues first, each one a bounded card with a plain explanation and
step-by-step screenshots, and prose written for the reader rather than the
tester.

## Why

The first large run (custom surveys, 2026-09-22) produced a report its own
requester couldn't follow:

- One defect was spread over five scenario rows in two sections; no single
  place told its story.
- Screenshots sat in galleries under each section, away from the issue or row
  they proved, with no boundary between one issue's evidence and the next.
- *Observed* cells read like debugging notes — `aria-checked=false`,
  `DB 225|1|2`, bare survey numbers, nine facts chained with semicolons.
- Two scenarios that showed the bug were marked *pass*, because their
  expectation had been rewritten to match the broken state.
- The contract read as a cage ("Fix the JSON; don't work around it"), so
  content bent to fit the format instead of the other way round.

## Page layout

Order, top to bottom:

1. **Masthead** — title, a short plain-language verdict paragraph, computed
   tallies (scenarios, pass/partial/fail/blocked, issues).
2. **Issues at a glance** — table: id, severity, area, one plain sentence,
   link to the card. Defects first; setup problems and known gaps grouped
   below.
3. **Issue cards** — one bordered card per issue, with a "back to issues"
   link:
   - title and severity chip; *not reproduced* chip when the repro pass
     failed to reproduce it
   - *What's wrong* (`summary`), *Why it matters* (`impact`)
   - numbered steps, each followed by its screenshot and marks; the step
     flagged `wrong` is visibly marked as where it goes wrong
   - expected / actual
   - *Seen in* — scenario links, computed (see Format)
   - collapsed *Technical detail*
4. **What was tested** — one block per area (today's `sections`): plain
   intro, then scenario rows. A partial or failed row links to its issue.
   Each row's screenshots and technical detail fold inside the row.
5. **Not covered**.
6. **Appendix** — under test (repos, branches, shas), environment, ground
   truth.

There is no separate screenshot gallery. A screen referenced by nothing
still lands in a *Further evidence* block at the end, as today.

The contents rail, the mark/callout overlay and hover linking, and the
theming stay as they are.

## Writing rules

Go into `contract.md`; the orchestrator checks them in a self-review before
building.

1. **Reader, not tester.** Say what a person does and sees ("the box is
   unticked"), not how it was measured. The measurement goes in `technical`.
2. **Names, not numbers.** "The builder test survey", not "survey 95". Ids
   appear only in `technical`.
3. **One fact per sentence.** A cell that needs four sentences is a step list
   or an issue.
4. **Verdict first.** The first sentence says what happened; detail follows.
5. **Every issue says why it matters** — what the user can't do, not which
   code is wrong.
6. **Results never contradict the text.** A scenario that shows a bug is
   *partial* or *fail* and links it, even when the bug is known. `expected`
   is never moved to match what was observed; a wrong expectation keeps its
   original value with a correction note.
7. **No internal vocabulary in the main text.** PR numbers, file paths,
   error codes and DB values belong in `technical`.

Worked example, to include in the contract:

> **Before:** Checkbox aria-checked=false BEFORE any reorder, while "At least
> 1 / At most 2" and the preview "Make between 1 and 2 choices" reflect the
> stored values; still false after the reorder; Save closed first time; DB
> 225|1|2 kept.
>
> **After:** The box was unticked as soon as the question opened, even though
> the "at least 1" limit showed correctly — so the box isn't linked to the
> saved limit, and reordering isn't the cause. → F2
> *Technical:* `aria-checked=false` on open and after reorder;
> `survey_questions` 225 min 1 / max 2 unchanged by the save.

## Repro pass

A new SKILL.md step between spot-check and report.

- One tester dispatch per `defect`, in parallel, on a cheaper model, briefed
  with the issue's draft steps.
- The tester makes a fresh fixture named after the issue ("QA repro F2"),
  walks the steps, and captures one viewport screenshot for each step that
  changes the screen, as `<issue-id>-<n>-<slug>.png`.
- It reports whether the defect reproduced and the exact strings it saw.
- Not reproduced → the issue stays in the report with `reproduced: false`;
  it is never dropped silently.
- Setup problems and known gaps skip the pass.

The tester brief gains a short repro-mode section rather than a second brief.

## Format changes (`findings.json`)

No backward compatibility: old reports are already-built HTML.

| Where | Change |
|---|---|
| `run.verdict` | short HTML paragraph (not escaped) |
| `findings[]` | add `summary`, `impact`, `area`, `reproduced` (bool), `technical` (HTML) |
| `findings[]` | `steps: [{ text, screen?, marks?, html?, wrong? }]` replaces `repro` and `evidence` |
| `findings[]` | `scenarios` removed — *Seen in* is computed from scenarios whose `finding` points here |
| `scenarios[]` | add `finding` (issue id), `technical` (HTML), `html` |
| issue, step, scenario, section | optional `html` — free-form block rendered after the structured fields |
| `screens[]` | unchanged; marks may now also sit on a step (`steps[].marks` override the screen's own) |

Free-form `html` is the normal escape hatch for anything the fields can't
express — a table, a before/after pair, a diagram. It is not escaped.

## Build checks

Existing integrity checks stay. New ones, each exiting non-zero with the id:

- a `partial` or `fail` scenario with no `finding`, or one naming an unknown
  issue;
- a `defect` with no step carrying a `screen`;
- a `steps[].screen` naming an unknown screen.

Integrity is strict; shape is not. The contract drops "don't work around it"
in favour of: fields are the default path, `html` blocks cover the rest.

## Hand edits and the generator

- Hand-editing `report.html` is allowed only after the final build, as a last
  resort; the closing summary lists what was edited, because a rebuild erases
  it.
- The generator is not forked or edited during a run. Something that recurs
  across runs becomes a generator change in a dedicated session.

## Applying it to the 2026-09-22 run

1. Rewrite `projects/surveys/testing/custom-2026-09-22/findings.json` in the
   new format, following the writing rules.
2. Run the repro pass for F1–F6 — first confirm the `surveys-latest` servers
   (grow-api :14001, Grow FE :14000) are up and on the recorded shas.
3. Rebuild; then triage the issues.

## Testing

Prose and a generator script; no unit tests. Verification is a named run:

- build the rewritten 2026-09-22 report; every new check fires on a
  deliberately broken copy of `findings.json` (partial with no finding,
  defect with no screenshot, unknown step screen);
- open the built page at desktop and phone width, light and dark: issue
  links jump to their cards, "back to issues" returns, folded rows open,
  marks still highlight from callouts.

## Not in scope

- Tracker integration — the report stays the deliverable.
- A second tester brief or a separate repro skill.
- Reworking theming or the overlay mechanics.
