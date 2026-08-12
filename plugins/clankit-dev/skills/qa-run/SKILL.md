---
name: qa-run
description: Use when somebody wants a branch tested hands-on with evidence, or a QA report a third party will read — a bug bash, a pre-release pass, "test this properly and show me". Plans the scenarios, dispatches a tester that drives the real app, and costs a full run, so don't fire it for a routine check.
user_invocable: true
---

# QA run

A hands-on QA pass on a branch: plan the scenarios, hand execution to a subagent
driving the real app, spot-check what comes back, publish an illustrated report.

**The report is the deliverable.** It's a self-contained HTML file someone who
didn't run the tests can read and act on. Your closing message summarizes what
was found and stops there — no tracker writes, no fix commits.

**Not this skill.** *Did my own change work* is `verification-before-completion`.
*Show me this page* is `screenshot`. Both are cheap; this is not. If nobody
outside the session will read the result, you want one of those.

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

Resolve the environment card (below) before step 2 — steps 2 and 4 both need it.

### 1 · Read the claims

Claims come from the **PR description** first, then a **plan or spec document**,
and only then **the diff**. A diff says what changed, not what was promised, and
what was promised is what you're testing.

**Every claim becomes a numbered scenario with an expected outcome.** If the
description says a token burns on use, one scenario checks that it burns and a
second checks what a burned token shows.

On top of the claims, a floor that is not optional:

- **the happy path end to end**, through the UI, as the accounts a real user
  would be;
- **every lifecycle verb the feature has** — re-submit, cancel, delete,
  re-create;
- **guards as a table of exact expected status codes**, hit directly rather than
  through the UI;
- **at least one invariant asserted against the data store**, not read off a
  screen;
- **the repo's own test floor** for the touched area;
- **shared code the diff touched, exercised through its other consumers.** A
  change to a shared adapter is a change to every surface that adapts through it,
  and those surfaces are where a regression is expensive.

Give scenarios ids that group by phase — `A1…A6` issuing, `B1…B4` redeeming. The
letter survives into a chained run's handoff.

### 2 · Ground truth

Before writing a single expected value, resolve what is **actually true in the
environment**: are the feature's flags on, do the rows the feature needs exist,
which defaults or fallbacks will fire, which account and tenant the run will use.
Cheap queries and direct API calls, done by you — not by the tester.

Two distinct failures make this a step rather than a habit:

- An expectation written as *"a plausible score appears"* cannot fail, so a
  scenario asserting it is theatre. Pinning the value first is what gives the
  tester something to be wrong about.
- **A tester that computes its own expectation and then checks it has tested
  nothing.** The expectation has to be fixed before the run, by someone who is
  not also the one looking at the screen.

Record each fact with where it came from. A fact with no source is a guess, and
it goes in the report as `groundTruth[].source` for exactly that reason.

### 3 · The gate

Show the numbered scenarios with their expected values and **wait**. Ask with
`AskUserQuestion` — approve as planned, or cut scope — rather than announcing a
plan with a window to object.

One decision point, placed where changing your mind is cheapest: a misread claim
otherwise costs a full tester run to discover.

### 4 · Dispatch

**One tester by default**, on the most capable model available, prompted from
[tester-brief.md](tester-brief.md) — fill in every `<…>`; the subagent can't see
this conversation. You do not drive the app yourself.

The reason is context, not throughput: a full run burns most of a context window,
which is the entire justification for the subagent existing. Spend yours on
planning and judgment.

**Chain testers sequentially** when the plan exceeds roughly fifteen scenarios,
or when it spans distinct phases that hand off through application state —
author something, then respond to it, then read the results. Each tester in the
chain gets a small brief and a full context, and inherits the previous phase's
work from the application's own state plus a short written handoff naming **what
now exists, its identifiers and URLs, and what remains**.

**Parallel browser testers are not an option.** A persistent browser profile is
held by one process at a time, so two concurrent drivers means one fails to
launch. Non-browser evidence — direct API probes, data-store invariants, test
suites — can run alongside a browser tester without collision.

### 5 · Spot-check

Open **two or three of the returned screenshots** — riskiest scenarios first —
and confirm they show what the findings claim, before writing anything.

A structured findings list is an index, not evidence. The one time it's wrong is
the time it reads most confidently.

### 6 · Report

Classify every finding three ways. They read identically in a screenshot and
completely differently to whoever acts on the report:

- **defect** — the code is wrong;
- **known gap** — deliberately not built, and named as such in the spec;
- **setup problem** — the environment lacked something the feature needs.

Then write `findings.json` and build the page:

```bash
node <this skill's dir>/report/build-report.mjs <run-dir>   # -> <run-dir>/report.html
```

[report/contract.md](report/contract.md) is the field-by-field contract — read it
before filling the JSON. Node only, no install step. The script refuses to build
on a missing image or a dangling id; fix the JSON rather than working around it.

Close with what was found. The report carries the detail.

## The environment card

Seven facts the run needs and no skill can ship. Resolve them **cheapest first**:
the repo's own agent instructions → any app-launching skill available in the
session (a generic one, or a project-local one) → ask the user.

Write what you resolved to `docs/qa/environment.md`, **with where each line came
from**, so the second run is free and a stale fact is traceable rather than
mysterious.

```markdown
# QA environment — <app>
Start          `<command>` (:<port>) · `<command>` (:<port>)        <- asked
Safe-env check <how to confirm this is the local/disposable env>    <- resolved
Clean state    <procedure, or "none — data is additive">            <- asked
Accounts       <seeded credentials>. Never create accounts.         <- project skill
Branch         <where the branch under test is checked out>         <- repo instructions
Test floor     `<test command(s)>`                                  <- repo instructions
Evidence       `<how to query the data store directly>`             <- resolved
Report home    `<where dated report directories go>`                <- repo instructions
```

**A fact that turns out wrong mid-run gets corrected in the card before the run
ends** — the tester brief asks for those corrections explicitly. The card is
failure memory, not only a cache.

## The traps

Each of these cost a real run once. They're about agents and tooling, not about
any one repo, so they travel with the skill.

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

## Out of scope

- **Writing to a tracker.** The report is the deliverable.
- **Automated test suites.** The repo's existing test floor runs as evidence;
  this skill doesn't write tests.
- **CI or headless-cron operation.** The gate means a person is present.
