# findings.json — the contract

`findings.json` holds every judgment. `build-report.mjs` holds only arithmetic:
pixel→percent conversion, base64 inlining, counts, and referential integrity.
Anything that required a decision belongs here, written by you.

Run it as:

```bash
node <skill-dir>/report/build-report.mjs <run-dir>          # writes <run-dir>/report.html
```

`<run-dir>` holds `findings.json` and `screens/`. Every `file` path is resolved
relative to it.

## What the page looks like

The report is read by a mixed team — PO, QA, developer — top to bottom, issues
first:

1. **Masthead** — title, your verdict paragraph, tallies the script counts.
2. **Issues at a glance** — id, severity, area, one sentence, link. Defects
   first; setup problems and known gaps below.
3. **Issue cards** — one bordered card per issue: *What's wrong*, *Why it
   matters*, numbered steps each followed by its screenshot, expected / actual,
   *Seen in* (the scenarios whose `finding` points here), a folded *Technical
   detail*, and a link back to the table.
4. **What was tested** — one block per `sections[]` entry: your intro, then
   the scenario rows. A partial or failed row links to its issue; each row's
   screenshots and technical detail fold inside it.
5. **Not covered**, then an **Appendix** — under test, environment, ground
   truth.

A screen nothing references still lands in *Further evidence* at the end, and a
scenario no section claims lands in *Other scenarios*. Those are safety nets,
not a filing system.

## Shape

```json
{
  "run": {
    "title": "Coupons — issue, redeem, expire",
    "verdict": "<p><strong>Not ready.</strong> A customer can redeem one coupon twice.</p>",
    "verdictTone": "fail",
    "underTest": [{ "repo": "…", "branch": "…", "sha": "…" }],
    "environment": ["…"],
    "groundTruth": [{ "fact": "…", "source": "…" }]
  },
  "sections": [
    {
      "title": "Redeeming a coupon",
      "intro": "<p class=\"lede\">Free-form HTML, your own words.</p>",
      "scenarios": ["A1", "A2"],
      "html": "<p>Optional block after the rows.</p>"
    }
  ],
  "scenarios": [
    {
      "id": "A2",
      "did": "Redeemed the spring coupon twice at checkout",
      "expected": "The second attempt is refused",
      "result": "fail",
      "observed": "Both attempts went through.",
      "finding": "F1",
      "evidence": ["A2-redeem"],
      "technical": "<p><code>POST /redeem</code> returned 200 twice.</p>"
    }
  ],
  "findings": [
    {
      "id": "F1",
      "kind": "defect",
      "severity": "major",
      "area": "Checkout",
      "title": "A coupon can be redeemed twice",
      "summary": "Checkout accepts a coupon that was already used.",
      "impact": "A customer gets the discount on every order, not once.",
      "reproduced": true,
      "steps": [
        { "text": "Redeem the spring coupon at checkout.", "screen": "F1-1-first-redeem" },
        {
          "text": "Redeem the same coupon on a second order.",
          "screen": "F1-2-second-redeem",
          "wrong": true,
          "marks": [{ "n": 1, "box": [1153, 73, 267, 36], "kind": "bug", "label": "Discount applied again" }]
        }
      ],
      "expected": "The second order is refused the discount.",
      "actual": "Both orders get the discount.",
      "technical": "<p><code>coupons.redeemed_at</code> is set but never checked.</p>"
    }
  ],
  "screens": [
    {
      "id": "A2-redeem",
      "file": "screens/A2-redeem-dialog.png",
      "caption": "…",
      "marks": [
        { "n": 1, "box": [1153, 73, 267, 36], "kind": "bug", "label": "…", "text": "…" }
      ]
    }
  ],
  "notCovered": [{ "what": "…", "why": "…" }]
}
```

## Field by field

| Field | Values | Notes |
|---|---|---|
| `run.verdict` | raw HTML | **Not escaped.** A short paragraph somebody reads and stops: what happened, then the one or two things that matter. The tallies sit under it, so it needn't repeat counts. |
| `run.verdictTone` | `ok` `warn` `fail` | Colours the verdict box. |
| `run.groundTruth` | fact + source | What was resolved in step 2, and where each fact came from. A fact with no source is a guess. |
| `sections[].intro` | raw HTML | **Not escaped** — your prose, with markup. `<p class="lede">` styles the standfirst. |
| `sections[].scenarios` | scenario ids | The rows under that section, in that order. |
| `sections[].group` | free text | Optional. Consecutive sections with the same group share one heading in the page and in the contents rail. Default *What was tested*; use another name for sections that aren't test coverage, e.g. *After the run* for a cleanup section. |
| `scenarios[].result` | `pass` `fail` `partial` `blocked` | `blocked` means the scenario never ran. Don't call that a pass. |
| `scenarios[].expected` | free text | The value fixed **before** the run. If it reads like it could not fail ("a plausible score appears"), the scenario is theatre. |
| `scenarios[].finding` | issue id | Required on `partial` and `fail`; allowed on any row. Drives the row's link and the issue's *Seen in*. |
| `scenarios[].evidence` | screen ids | Folded inside the row. |
| `scenarios[].technical` | raw HTML | Folded inside the row. Measurements, ids, DB values. |
| `findings[].kind` | `defect` `gap` `setup` | Wrong code / deliberately not built / the environment lacked something. |
| `findings[].severity` | `blocker` `major` `minor` `cosmetic` | `blocker` and `major` render in the critical colour. |
| `findings[].summary` | free text | *What's wrong*, one plain sentence. Also the line in the glance table. |
| `findings[].impact` | free text | *Why it matters* — what the user can't do. |
| `findings[].area` | free text | The product area, in the reader's words ("Survey builder"). |
| `findings[].reproduced` | `true` `false` | `false` shows a *not reproduced* chip. Never drop an issue that didn't reproduce. |
| `findings[].steps[]` | `{ text, screen?, marks?, html?, wrong? }` | Numbered; each step's screenshot renders right under it. `wrong: true` flags the step where it goes wrong. `marks` replace the screen's own marks for that rendering only. |
| `findings[].technical` | raw HTML | The folded *Technical detail* — PR numbers, paths, payloads, DB rows. |
| `screens[].marks[].box` | `[x, y, w, h]` | **Source pixels** of the PNG, top-left origin. The script converts to percentages so the overlay scales. |
| `screens[].marks[].pin` | `[x, y]` | Use instead of `box` for a point with no sensible frame. |
| `screens[].marks[].kind` | `bug` = critical colour; anything else (`note`, `gap`, …) = accent | Optional; also renders as a chip on the legend line. |
| `screens[].marks[].badge` | `tl` `tr` `bl` `br` | Which corner the number sits on. Default `tl`. Move it when the number covers something. |
| `notCovered` | what + why | Everything the run did not reach, including tiers a headless browser cannot exercise. |

**`html`** — optional on an issue, a step, a scenario and a section. A free-form
block, **not escaped**, rendered after the structured fields. It is the normal
way to say what the fields can't: a table, a before/after pair, a diagram.

A screen may render more than once — in a step and in a row. Its first
rendering owns the `#screen-<id>` anchor, so a link to `#screen-<id>` works
from any `html` block.

## Writing rules

Check every field against these before building.

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

Worked example — one `observed` cell:

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

## What the script refuses

It exits non-zero, with the id, on:

- a `screens[].file` that doesn't exist;
- an `evidence` or `steps[].screen` id matching no screen;
- a `sections[].scenarios` id matching no scenario;
- a `partial` or `fail` scenario with no `finding`, or any `finding` naming an
  unknown issue;
- a `defect` with no step carrying a `screen`;
- duplicate screen, scenario or finding ids;
- marks (on a screen or a step) on a non-PNG image — it can't read the
  dimensions to convert boxes.

**Integrity is strict; shape is not.** These are exactly the errors that
produce a report which *looks* right and cites evidence nobody can open — fix
the JSON until they pass. Shape is yours: the fields are the default path, and
when content doesn't fit them, an `html` block carries it. Bend the format to
the content, never the content to the format.

## Hand edits and the generator

- Hand-edit `report.html` only after the final build, as a last resort. List
  every hand edit in the closing summary — a rebuild erases them.
- Don't fork or edit the generator during a run. Something that recurs across
  runs becomes a generator change in a dedicated session.

## Conventions worth keeping

- **Scenario ids group by phase** — `A1…A6` issuing, `B1…B4` redeeming. The
  letter is the phase and it survives into a chained run's handoff.
- **Screen ids name what produced them** — `A2-redeem` for a scenario,
  `F2-3-reorder` for step 3 of issue F2's repro. An id that says where it came
  from stays reviewable when the captions get edited.
- **Section order is array order.** Nothing about placement lives in the script;
  reorder the array to reorder the document.
