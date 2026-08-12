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

## Shape

```json
{
  "run": {
    "title": "Coupons — issue, redeem, expire",
    "verdict": "3 defects · 24 of 28 pass",
    "verdictTone": "warn",
    "underTest": [{ "repo": "…", "branch": "…", "sha": "…" }],
    "environment": ["…"],
    "groundTruth": [{ "fact": "…", "source": "…" }]
  },
  "sections": [
    {
      "title": "Redeeming a coupon",
      "intro": "<p class=\"lede\">Free-form HTML, your own words.</p>",
      "scenarios": ["A1", "A2"],
      "screens": ["A2-redeem"]
    }
  ],
  "scenarios": [
    {
      "id": "A1",
      "did": "What was actually done",
      "expected": "The value fixed before the run",
      "result": "pass",
      "observed": "What the screen or the API actually showed",
      "evidence": ["A1-list"]
    }
  ],
  "findings": [
    {
      "id": "F1",
      "kind": "defect",
      "severity": "major",
      "title": "…",
      "repro": ["step", "step"],
      "expected": "…",
      "actual": "…",
      "scenarios": ["A2"],
      "evidence": ["A2-redeem"]
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
| `run.verdict` | free text | The one line somebody reads and stops. Counts, not adjectives. |
| `run.verdictTone` | `ok` `warn` `fail` | Colours the verdict box. |
| `run.groundTruth` | fact + source | What was resolved in step 2, and where each fact came from. A fact with no source is a guess. |
| `sections[].intro` | raw HTML | **Not escaped** — your prose, with markup. `<p class="lede">` styles the standfirst. |
| `sections[].scenarios` | scenario ids | Renders that subset as a table under the section. Every scenario also appears in the full table up top. |
| `scenarios[].result` | `pass` `fail` `partial` `blocked` | `blocked` means the scenario never ran. Don't call that a pass. |
| `scenarios[].expected` | free text | The value fixed **before** the run. If it reads like it could not fail ("a plausible score appears"), the scenario is theatre. |
| `findings[].kind` | `defect` `gap` `setup` | Wrong code / deliberately not built / the environment lacked something. Groups the findings section. |
| `findings[].severity` | `blocker` `major` `minor` `cosmetic` | `blocker` and `major` render in the critical colour. |
| `screens[].marks[].box` | `[x, y, w, h]` | **Source pixels** of the PNG, top-left origin. The script converts to percentages so the overlay scales. |
| `screens[].marks[].pin` | `[x, y]` | Use instead of `box` for a point with no sensible frame. |
| `screens[].marks[].kind` | `bug` = critical colour; anything else (`note`, `gap`, …) = accent | Optional; also renders as a chip on the legend line. |
| `screens[].marks[].badge` | `tl` `tr` `bl` `br` | Which corner the number sits on. Default `tl`. Move it when the number covers something. |
| `notCovered` | what + why | Everything the run did not reach, including tiers a headless browser cannot exercise. |

## What the script refuses

It exits non-zero, with the id, on:

- a `screens[].file` that doesn't exist;
- an `evidence` or `sections[].screens` id matching no screen;
- a `scenarios` id (in a section or a finding) matching no scenario;
- duplicate screen or scenario ids;
- marks on a non-PNG image — it can't read the dimensions to convert boxes.

Fix the JSON; don't work around it. These are exactly the errors that produce a
report which *looks* right and cites evidence nobody can open.

## Conventions worth keeping

- **Scenario ids group by phase** — `A1…A6` issuing, `B1…B4` redeeming. The
  letter is the phase and it survives into a chained run's handoff.
- **Screen ids name the scenario that produced them** — `A2-redeem`, not
  `screenshot-4`. An id that says where it came from stays reviewable when the
  captions get edited.
- **Section order is array order.** Nothing about placement lives in the script;
  reorder the array to reorder the document.
- A screen no section claims is not dropped — it lands in *Further evidence* at
  the end. That's a safety net, not a filing system.
