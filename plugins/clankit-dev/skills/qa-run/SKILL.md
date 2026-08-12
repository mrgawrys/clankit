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
2 Stand it up          branch, servers, safe-env, login, reachability — never the tester's job
3 Ground truth         resolve the ACTUAL values, against the system now running
4 -- GATE --           show numbered scenarios + expected values; user approves or cuts
5 Dispatch             one tester by default; chained by phase when the plan is large
6 Spot-check           open 2-3 screenshots from the riskiest scenarios FIRST
7 Report               findings.json -> generator -> report.html; summarize and stop
```

Resolve the environment card (below) first — step 2 is nothing but acting on it.

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

### 2 · Stand it up

**The tester never sets up the environment.** Bringing an app up is the most
failure-prone part of a run and the part that most needs judgment — half the
traps below are environment traps. Handing it to the cheapest agent in the chain
is exactly backwards. The tester's job starts at a working app.

Do it yourself, or hand it to **one capable subagent** when it's likely to be
long and noisy — a fresh worktree, installs, migrations, a build. That work burns
context on logs and produces three lines of output, which is precisely what a
subagent is for. Ask it back for: the URLs, each repo's sha, server start times,
and any environment-card line that turned out wrong.

Nothing gets dispatched until all of these hold:

- **The branch is checked out where you think it is**, in every repo under test,
  and you have each sha.
- **The servers are serving *this* checkout.** Compare each server's start time
  against the checkout — a backend may hot-reload where a bundler won't. A dev
  server older than the checkout is running the old code, and every scenario
  after that is fiction.
- **The safe environment is confirmed**, before anything writes.
- **Login is done and the browser profile is released.** A persistent profile
  takes one process: log in, let the helper exit, then dispatch. Never hold the
  profile while a tester tries to launch.
- **The feature is reachable.** Walk to the entry screen once yourself and
  confirm the first scenario's starting state exists. This is also the cheapest
  moment to discover a flag is off.
- **The run directory exists**, with an empty `screens/`.

If any of it can't be made true, stop and say so. A QA run against an app that
isn't running produces a report full of confident nonsense.

### 3 · Ground truth

With the system now up, resolve what is **actually true in it**: are the
feature's flags on, do the rows the feature needs exist, which defaults or
fallbacks will fire, which account and tenant the run will use. Cheap queries and
direct API calls, done by you — not by the tester.

Resolving this against a system you watched come up is the point. Ground truth
read off an assumed environment is just a second set of assumptions.

Two distinct failures make this a step rather than a habit:

- An expectation written as *"a plausible score appears"* cannot fail, so a
  scenario asserting it is theatre. Pinning the value first is what gives the
  tester something to be wrong about.
- **A tester that computes its own expectation and then checks it has tested
  nothing.** The expectation has to be fixed before the run, by someone who is
  not also the one looking at the screen.

Record each fact with where it came from. A fact with no source is a guess, and
it goes in the report as `groundTruth[].source` for exactly that reason.

### 4 · The gate

Show the numbered scenarios with their expected values and **wait**. Ask with
`AskUserQuestion` — approve as planned, or cut scope — rather than announcing a
plan with a window to object.

One decision point, placed where changing your mind is cheapest: a misread claim
otherwise costs a full tester run to discover.

### 5 · Dispatch

**One tester by default**, prompted from [tester-brief.md](tester-brief.md) —
fill in every `<…>`; the subagent can't see this conversation. You do not drive
the app yourself.

The reason is context, not throughput: a full run burns most of a context window,
which is the entire justification for the subagent existing. Spend yours on
planning and judgment.

**A mid-tier model is the right default — because step 2 already happened.**
Every judgment is front-loaded: the app is up and reachable, the scenarios are
numbered, the expected values are pinned, the out-of-scope list is spelled out.
What's left is navigate, capture, report exact strings, and a cheaper tester does
that at a fraction of the cost. Dispatching one into an environment nobody stood
up first is where this default stops being safe. Escalate to the most capable
model when:

- the app is unfamiliar or the run is exploratory, so navigation has to be
  improvised rather than followed;
- scenarios turn on telling a **setup problem** from a **defect** — that call is
  made live, against what's on screen, and can't be pinned in advance;
- a cheaper tester already came back once with prose, vague observations, or
  screenshots that didn't match its claims.

The last one is the honest failure mode of a cheap tester: not a wrong verdict,
a *confident* one nobody sampled. The brief's discard condition — an `observed`
that quotes nothing counts as unrun — is what makes it fail loudly instead.

**Chain testers sequentially** when the plan exceeds roughly fifteen scenarios,
or when it spans distinct phases that hand off through application state —
author something, then respond to it, then read the results. Each tester in the
chain gets a small brief and a full context, and inherits the previous phase's
work from the application's own state plus a short written handoff naming **what
now exists, its identifiers and URLs, and what remains**.

**When a tester bounces, fix and send it back.** The brief tells it to stop on a
broken environment rather than fix or grind — a blank page, a 500, a missing
feature, a server that stopped listening. That report is a normal outcome, not a
failed run. Repair the environment yourself, then re-dispatch with:

- **only the scenarios that remain** — never re-run one that already came back
  with evidence;
- **what now exists**, with identifiers and URLs, exactly like a chained phase
  handoff;
- **what was actually wrong**, so the tester doesn't re-report it as a defect.

Then correct the environment card. A bounce is the card telling you it's out of
date, which is the whole reason the card records where each line came from.

**Parallel browser testers are not an option.** A persistent browser profile is
held by one process at a time, so two concurrent drivers means one fails to
launch. Non-browser evidence — direct API probes, data-store invariants, test
suites — can run alongside a browser tester without collision.

### 6 · Spot-check

Open **two or three of the returned screenshots** — riskiest scenarios first —
and confirm they show what the findings claim, before writing anything.

A structured findings list is an index, not evidence. The one time it's wrong is
the time it reads most confidently.

### 7 · Report

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
| Testing a branch that isn't checked out | Step 2, before dispatch: verify where it lives; record every repo's sha in the report |
| The tester tries to repair the environment | It stops and bounces instead; you fix and re-dispatch. A scenario that passed after the tester repaired something tested the repair |
| Browser tooling drops images in the repo root | The tester collects them into the run's `screens/` as `<id>-<slug>.png` and deletes the litter |
| Retina or full-page captures | Viewport-sized only — reports get committed; keep the run small |
| Desktop-only evidence | Public and brand-new screens also at a phone width |
| The tester returns a story | The brief's return format is structured per-scenario data; send it back if prose arrives |
| Headless browsers have no share sheet and may refuse clipboard writes | The deepest fallback firing is designed behaviour, not a defect — list unreachable tiers under not-covered |
| Creating a test account | Never. Use the seeded ones |
| Touching a shared environment | Step 2 confirms the safe environment before anything writes; the tester re-checks the marker and bounces if it's absent |
| A setup problem reads exactly like a bug | A missing affordance can be a missing flag or an unseeded row — check the ground truth before recording a defect |
| A dev server started before the checkout runs the old code | Step 2: compare each server's start time against the checkout; a backend may hot-reload where a bundler won't |
| The login helper and the driving browser both want the profile | A persistent profile takes one process. Step 2 logs in and lets the helper exit; only then dispatch |
| The spec's out-of-scope list | Feed deliberate non-features into the brief explicitly, or they come back as defects |

## Out of scope

- **Writing to a tracker.** The report is the deliverable.
- **Automated test suites.** The repo's existing test floor runs as evidence;
  this skill doesn't write tests.
- **CI or headless-cron operation.** The gate means a person is present.
