# Tester brief — fill in the blanks

Copy this, replace every `<…>`, send it as the subagent's whole prompt. The
subagent cannot see your conversation, so anything you leave out is gone.

The four sections each cover one way a delegated run fails: **Context** (it tests
the wrong thing), **Hard rules** (it breaks the environment), **Scenarios** (it
improvises coverage), **What to return** (its output is unusable). Don't drop
one to save room.

---

## Context

You are testing `<feature>` on branch `<branch>`, checked out at `<path>`.
`<repo>` is at commit `<sha>`; `<other repo>` at `<sha>`.

What it is meant to do: `<two or three sentences — the promise, not the diff>`

**Deliberately not built** (do not report these as defects):
`<the spec's out-of-scope list, spelled out>`

**Ground truth, already resolved — do not re-derive any of it:**
`<fact — e.g. the account holds 7 active coupons before the run>`
`<fact — e.g. flag X is ON, so the new picker is the one you'll see>`
`<fact — e.g. the expected score is 3.4, computed from the seeded responses>`

If something you see contradicts a fact above, that is a finding. Report it;
don't adjust the expectation to match the screen.

## Setup

Start: `<commands and ports>`
Log in: `<how, and as whom>` — `<credentials>`
App entry: `<URL, including any required query params>`
Clean state: `<procedure, or "none — data is additive; work with what's there">`
Data store: `<how to query it directly>`
Tests: `<command(s)>`

## Hard rules

1. **This is `<the local/disposable environment>`. Confirm that before the first
   write** — `<how to confirm>`. If it doesn't check out, stop and say so.
2. **Never create an account.** Use the seeded ones above. If a scenario seems to
   need a new one, mark it blocked and move on.
3. **Viewport screenshots only** — `<width>×<height>`, no full-page, no retina.
   The report gets committed; keep the run small.
4. **Collect screenshots into `<run-dir>/screens/` as `<scenario-id>-<slug>.png`**
   as you take them, and delete anything the browser tooling dropped elsewhere
   (repo root included). A capture nobody can find is not evidence.
5. **Public and brand-new screens also at a phone width** (`<width>`).
6. **Don't fix anything.** No code edits, no config changes, no data repair to
   make a scenario pass. You observe; someone else fixes.
7. **A missing affordance is not automatically a bug.** Check the ground truth
   above first — a flag off or an unseeded row looks identical on screen. If you
   can't tell, record it as `setup` and say what you'd need to distinguish it.
8. **A fallback firing is designed behaviour.** `<e.g. a headless browser has no
   share sheet and may refuse clipboard writes>` — record the tier you couldn't
   reach under "not covered", not as a defect.

## Scenarios

Run these, in this order. Don't add scenarios; if you spot something worth
testing that isn't listed, note it at the end under *worth testing next* and
carry on.

`<numbered scenarios, each with: id · what to do · the exact expected outcome ·
what evidence to capture>`

Example of the shape expected:

> **A2** · Redeem coupon `SPRING24` at checkout and read the confirmation body.
> **Expected:** the total drops from 40.00 to 32.00 and the coupon's state moves
> to `redeemed`. **Capture:** the confirmation, viewport width.

Guards, as a table — hit these directly, not through the UI:

`<request · expected status · expected body/error code>`

Invariants — assert against the data store, not the screen:

`<query · expected result>`

## What to return

Structured data, per scenario. **Not a narrative.** For every scenario:

```
<id> | <pass|fail|partial|blocked>
did:       <what you actually did>
expected:  <the expectation you were given, verbatim>
observed:  <what actually happened — exact copy, exact numbers, exact statuses>
evidence:  <screens/… paths, or "none">
```

Then, once:

- **Findings** — anything wrong. For each: a one-line title, numbered repro
  steps, expected, actual, which scenarios it came from, which screenshots show
  it, and whether you think it is a **defect** (the code is wrong), a **known
  gap** (in the not-built list above), or a **setup problem** (the environment
  lacked something).
- **Not covered** — every scenario you couldn't run and why, plus any tier of a
  fallback chain a headless browser can't reach.
- **Environment corrections** — anything in Setup above that turned out wrong.
  This is how the next run gets cheaper; don't skip it because you worked around
  it.
- **Worth testing next** — things you noticed but weren't asked to test.

**Quote exact on-screen copy and exact numbers.** "Looks correct" is not an
observation; `3.4, matching the expected 3.4` is.

This is a discard condition, not a style note: **an `observed` that quotes
nothing counts as unrun**, and the scenario will be sent back. If you couldn't
read the value — the panel never painted, the page errored, the element was
off-screen — say that and mark the scenario `blocked`. A blocked scenario is
useful. A confident sentence about a screen you didn't really read is worse than
no scenario at all, because nobody downstream can tell the difference.
