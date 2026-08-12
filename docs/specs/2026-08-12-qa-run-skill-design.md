# qa-run — Design

> **To act on this design:** pick a mode — *vibe* (inline, no machinery),
> *review each task* (per-task diffs), *review at the end* (delegated, reviewed
> per task), or *plan first* (`writing-plans`, then how it gets built).
> Unattended end-to-end is `/autopilot`. Ask the user which; don't pick for
> them.

## Goal

A skill that runs a full hands-on QA pass on a branch: it plans the scenarios,
hands execution to a subagent driving the real app, spot-checks the evidence,
and produces a self-contained illustrated HTML report someone else can read.

The report is the deliverable. The skill's closing message summarizes what was
found and stops there.

## Why it needs to exist

Two things already in `clankit-dev` sit next to this and neither covers it.
`verification-before-completion` answers *did my change work* — a check the
author runs on their own work before claiming it. `screenshot` answers *show me
this page*. Neither produces evidence a third party can review, and neither
plans coverage.

The pattern being generalized here has already survived real runs as a
repo-specific skill: plan the scenarios, dispatch one capable tester, spot-check
what it returns, write the illustrated report. Roughly three quarters of that
skill was portable judgment; the rest was a closed list of environment facts —
how to start the app, how to reach a clean state, which accounts exist, where
the branch lives, what the test floor is, how to query ground truth, where
reports go. Those become slots, resolved per repo rather than hardcoded.

## What ships

```
skills/qa-run/
  SKILL.md              the orchestrator: six steps, the gate, the failure memory
  tester-brief.md       fill-in-the-blanks subagent prompt
  report/
    build-report.mjs    findings.json + screens/ -> one self-contained report.html
    contract.md         the findings.json contract, for the orchestrator that fills it
```

Written per repo on first run, not shipped: `docs/qa/environment.md`.

## The run

```
1 Read the claims      PR description(s) -> plan/spec doc -> the diff (last resort)
                       every claim becomes a numbered scenario with an expected outcome
2 Ground truth         resolve the ACTUAL values the scenarios will assert
3 -- GATE --           show numbered scenarios + expected values; user approves or cuts
4 Dispatch             one tester by default; chained by phase when the plan is large
5 Spot-check           open 2-3 screenshots from the riskiest scenarios FIRST
6 Report               findings.json -> generator -> report.html; summarize and stop
```

### 1 · Read the claims

Claims come from the PR description first, then a plan or spec document, and
only then the diff — a diff says what changed, not what was promised. **Every
claim becomes a numbered scenario with an expected outcome.** If the description
says a token burns on use, one scenario checks that it burns and a second checks
what a burned token shows.

A mandatory floor on top of the claims:

- the happy path end to end, through the UI, as the accounts a real user would be;
- every lifecycle verb the feature has — re-submit, cancel, delete, re-create;
- guards as a table of exact expected status codes, hit directly rather than
  through the UI;
- at least one invariant asserted against the data store rather than read off a
  screen;
- the repo's own test floor for the touched area;
- **shared code the diff touched, exercised through its other consumers.** A
  change to a shared adapter is a change to every surface that adapts through
  it, and those surfaces are where a regression is expensive.

### 2 · Ground truth

Before writing a single expected value, resolve what is actually true in the
environment: are the feature's flags on, do the rows the feature needs exist,
which defaults or fallbacks will fire, which account and tenant the run will
use. Cheap queries and direct API calls, done by the orchestrator.

This step exists because of two distinct failures. An expectation written as "a
plausible score appears" cannot fail, so a scenario that asserts it is theatre;
pinning the value first is what gives the tester something to be wrong about.
And a tester that computes its own expectation and then checks it has tested
nothing — the expectation has to be fixed before the run, by someone who is not
also the one looking at the screen.

### 3 · The gate

The orchestrator shows the numbered scenarios with their expected values and
waits. The user approves or cuts scope. One decision point, placed where
changing your mind is cheapest: a misread claim otherwise costs a full tester
run to discover.

### 4 · Dispatch

One tester by default, prompted from `tester-brief.md`. The reason is context,
not throughput: a full run burns most of a context window, which is the entire
justification for the subagent existing. The orchestrator does not drive the app
itself.

**A mid-tier model is the default tier.** The same argument that justifies the
subagent decides its size: the cost is context, not capability. Every judgment is
front-loaded into the brief — numbered scenarios, pinned expected values, the
out-of-scope list — so execution is navigate, capture, quote. The top tier is an
escalation, for an unfamiliar app where navigation has to be improvised, for
scenarios turning on setup-versus-defect (the one call that cannot be pinned in
advance), or after a cheap tester returns prose. Its failure mode is not a wrong
verdict but a confident one on a scenario nobody sampled, which is why the brief
makes an unquoted `observed` a discard condition rather than a style note.

The run splits into a **sequential chain** of testers when the plan exceeds
roughly fifteen scenarios, or when it spans distinct phases that hand off
through application state — author something, then respond to it, then read the
results. Each tester in the chain gets a small brief and a full context, and
inherits the previous phase's work from the application's own state plus a short
written handoff naming what now exists, its identifiers and URLs, and what
remains.

Parallel browser testers are not an option. A persistent browser profile is held
by one process at a time, so two concurrent drivers means one fails to launch.
Non-browser evidence — direct API probes, data-store invariants, test suites —
can run alongside a browser tester without collision.

The brief keeps four sections, each covering one way a delegated run fails:
**Context** (the tester tests the wrong thing), **Hard rules** (the tester
breaks the environment), **Scenarios** (the tester improvises coverage), **What
to return** (the tester's output is unusable).

### 5 · Spot-check

Open two or three of the returned screenshots — riskiest scenarios first — and
confirm they show what the findings claim, before writing anything. A structured
findings list is an index, not evidence.

### 6 · Report

Every finding is classified three ways, because they read identically in a
screenshot and completely differently to whoever acts on the report:

- **defect** — the code is wrong;
- **known gap** — deliberately not built, and named as such in the spec;
- **setup problem** — the environment lacked something the feature needs.

## The environment card

Resolution order, cheapest first: the repo's own agent instructions, then any
app-launching skill available in the session (a generic one, or a project-local
one), then ask the user. What gets resolved is written to `docs/qa/environment.md`
so the second run is free, and every line records where it came from, so a stale
fact is traceable rather than mysterious.

```markdown
# QA environment — <app>
Start          `<command>` (:<port>) · `<command>` (:<port>)        <- asked
Safe-env check <how to confirm this is the local/disposable env>    <- resolved
Clean state    <procedure, or "none — data is additive">           <- asked
Accounts       <seeded credentials>. Never create accounts.         <- project skill
Branch         <where the branch under test is checked out>         <- repo instructions
Test floor     `<test command(s)>`                                  <- repo instructions
Evidence       `<how to query the data store directly>`             <- resolved
Report home    `<where dated report directories go>`                <- repo instructions
```

A fact that turns out wrong mid-run is corrected in the card before the run
ends. The card is failure memory, not only a cache.

## The generator contract

`findings.json` holds every judgment; `build-report.mjs` holds only arithmetic.

```json
{
  "run": {
    "title": "…",
    "verdict": "3 defects · 24 of 28 pass",
    "verdictTone": "ok | warn | fail",
    "underTest": [{ "repo": "…", "branch": "…", "sha": "…" }],
    "environment": ["…"],
    "groundTruth": [{ "fact": "…", "source": "…" }]
  },
  "sections": [
    { "title": "…", "intro": "<p>free-form, the orchestrator's own words</p>",
      "scenarios": ["A1", "A2"], "screens": ["A2-card"] }
  ],
  "scenarios": [
    { "id": "A1", "did": "…", "expected": "…",
      "result": "pass | fail | partial | blocked",
      "observed": "…", "evidence": ["A1-popover"] }
  ],
  "findings": [
    { "id": "F1", "kind": "defect | gap | setup",
      "severity": "blocker | major | minor | cosmetic",
      "title": "…", "repro": ["…"], "expected": "…", "actual": "…",
      "scenarios": ["A2"], "evidence": ["A2-card"] }
  ],
  "screens": [
    { "id": "A2-card", "file": "screens/A2.png", "caption": "…",
      "marks": [{ "n": 1, "box": [1153, 73, 267, 36], "kind": "bug",
                  "label": "…", "text": "…" }] }
  ],
  "notCovered": [{ "what": "…", "why": "…" }]
}
```

The script does five things and nothing else:

1. parse each PNG's IHDR chunk for real dimensions and convert every `box` from
   source pixels to percentages, so overlays scale with the image;
2. inline every image as a `data:` URI, so the page is one shareable file;
3. render the verdict box, the scenario table, sections with captioned figures
   and numbered legends, findings grouped by kind, and the not-covered list;
4. compute the counts;
5. **fail loudly** on a missing image file or an `evidence` id matching no
   screen — referential integrity is arithmetic, so it belongs in code.

Section order is array order, and every section takes a free-form `intro`. This
is deliberate: the precursor script hardcoded section placement in a constant,
which is judgment frozen into code and the reason it only ever fitted one
document. `marks` is optional per screen — annotation is available when a
screenshot needs pointing at, and costs nothing when a plain captioned figure
will do.

## The failure memory

Carried as rules, because each one is about agents and tooling rather than any
one repo:

| Trap | The rule |
|---|---|
| Testing a branch that isn't checked out | Verify where it lives before dispatch; record every repo's sha in the report |
| Browser tooling drops images in the repo root | The tester collects them into the run's `screens/` as `<id>-<slug>.png` and deletes the litter |
| Retina or full-page captures | Viewport-sized only — reports get committed; keep the run small |
| Desktop-only evidence | Public and brand-new screens also at a phone width |
| The tester returns a story | The brief's return format is structured per-scenario data; send it back if prose arrives |
| Headless browsers have no share sheet and may refuse clipboard writes | The deepest fallback firing is designed behaviour, not a defect — list unreachable tiers under not-covered |
| Creating a test account | Never. Use the seeded ones |
| Touching a shared environment | Confirm the safe environment before the first write |
| A setup problem reads exactly like a bug | A missing affordance can be a missing flag or an unseeded row — check the ground truth before recording a defect |
| A dev server started before the checkout runs the old code | Compare the server's start time against the checkout; a backend may hot-reload where a bundler won't |
| The login helper and the driving browser both want the profile | A persistent profile takes one process. Log in first, then drive |
| The spec's out-of-scope list | Feed deliberate non-features into the brief explicitly, or they come back as defects |

## Routing

`qa-run` fires when somebody asks for a hands-on test of a branch with evidence,
or a report someone else will read. The description says plainly that it plans,
dispatches a tester and costs a real run, so it never fires for a routine check
— that is `verification-before-completion`, and looking at one page is
`screenshot`.

## Out of scope

- **Writing to a tracker.** The report is the deliverable; the skill has no
  tracker integration and names none.
- **Automated test suites.** It runs the repo's existing test floor as evidence;
  it does not write tests.
- **CI or headless-cron operation.** The gate means a person is present.

## Open items

- The chain threshold ("roughly fifteen scenarios") is a guess until a few real
  runs land. Whether phase boundaries can be derived from the plan rather than
  named by the orchestrator is worth revisiting then.
- `build-report.mjs` needs a dependency-free way to be run from a skill
  directory; assume Node available and no install step.
