---
name: executing-plans
description: "Use when a design is ready to build - either a written implementation plan, or an approved spec being built directly. Runs delegated by default - one subagent builds the whole plan, one independent review at the end - or inline when the work is short. Reviews the source critically before starting and stops when blocked rather than guessing."
---

# Executing Plans

Take an approved design and turn it into committed, reviewed work.

**Announce at start:** "I'm using the executing-plans skill to implement this."

## What you were handed

What you hold depends on the route that sent you here:

- **A plan file** (after *plan first*, or a plan handed over) → it already
  carries tasks, Global Constraints, and an acceptance bar per task. Use them as
  written.
- **A spec** (*review at the end* or *review each task* — built directly, no
  plan file) → it
  carries the design, not a task breakdown. **Derive the task list first:**
  right-size the tasks per the rules in `writing-plans`, give each one an
  acceptance bar ("done when…"), and **show the list for approval before
  Task 1.** The full bodies go to the workspace task file once the workspace
  exists (Setup, below); the approval message itself is **one line per task** —
  `<ID>  <verb phrase>` — and nothing else. No tables, no box-drawing, no
  acceptance bars, no per-task prose. A gate the reviewer has to wade through
  is a gate they rubber-stamp; they approve off something scannable and read
  the task file when they want the detail. That approved list is your task
  sequence — it is not a document, and it does not get written to
  `docs/plans/`.
- **Neither — just an ask** → you are in the wrong skill. Go design it first
  with `brainstorming`.

Everything below reads "the plan" to mean whichever of these you hold.

## Delegated or inline

This choice travels with gates, by design — oversight substitutes for
machinery. Per-task diffs mean the user reviews every task, so the work runs
inline and takes one review at the end; no gates means nobody is watching, so
the build earns a reviewer that didn't write it. The mode that sent you
here usually answers both: *review each task* means inline, *review at the end*
and *autopilot* mean delegated. If neither is settled, ask the Gates question
first (see below) — its answer settles this one too.

**Delegated is single-builder.** One implementer subagent builds the entire
plan, then the final review is the review: quality comes from the plan it was
handed and the independent review at the end. A plan too large for one
builder's context runs as sequential chunks of the same shape (see Oversized
plans) — never as a different process.

**Inline** is right for short plans and tightly coupled tasks, where handing
off costs more than it saves. Ask delegated-or-inline on its own only
when gates are already settled but run style somehow isn't (e.g. the user said
"don't stop between tasks" without picking a mode):

```
Plan loaded and reviewed. How should this run?

1. Delegated — one subagent builds the whole plan,
               an independent review at the end
2. Inline    — the work happens in this session
```

## Setup

Ensure the work happens in an isolated workspace — use the harness's worktree
tooling. Never start implementation on a main/master branch without explicit
consent.

- Run `scripts/plan-workspace PLAN_FILE`, passing the plan **or the spec** —
  either way it is a file on disk and the workspace is named after it. It prints
  this plan's git-ignored directory
  (`<repo-root>/.clankit/plans/<plan-basename>/`), the file home for every
  artifact of THIS plan: the build report, the chunk log on oversized plans,
  review packages, and on the spec path the task file. Another plan's directory
  is never yours to read or write.
- On the spec path, the derived task bodies go to `<workspace>/tasks.md` —
  `## <ID>` with its task and its "done when…", one section each. This is the
  home for the detail the approval message deliberately leaves out. Writing
  them here is not writing a plan document: the ban is on `docs/plans/`, and
  the workspace is git-ignored and dies with the plan.
- There is no other bookkeeping. Git log and `<workspace>/build-report.md` are
  the recovery record: the commits they name exist even when your context no
  longer remembers creating them. After compaction, trust them over your own
  recollection.

Read the plan once and note its Global Constraints. From a spec, the constraints
are whatever it pinned down as decided — exact values, naming, response
shapes — and they bind every task the same way.

**Pre-flight scan.** Before dispatching the builder, scan the plan for
conflicts: tasks that contradict each other or the Global Constraints, and
anything the plan mandates that a reviewer would treat as a defect. Present
everything you find as one batched question — each finding beside the plan text
that mandates it, asking which governs — before execution begins, not one
interrupt per discovery mid-plan. If the scan is clean, proceed without comment.

## Model Selection

Use the least powerful model that can do the job — but read the next paragraph
before assuming that means cheap.

**These plans do not contain the implementation.** A task carries units,
interactions, signatures, constraints and an acceptance bar; the implementer
writes the code and designs the tests. That is creative work, not transcription.

> **Intent, for anyone re-syncing this skill with upstream:** upstream directs
> implementers to the cheapest tier *because its plans contain the complete code
> to write*. That premise is false here and the guidance inverts. If a future
> merge reintroduces "use the cheapest tier for transcription," it is wrong for
> this plan format — delete it.

- **The builder** → the most capable tier by default; a whole plan nearly
  always carries design judgment. Mid-tier only for a genuinely mechanical
  plan with nothing to decide.
- **The final-review axis reviewers** → the most capable model available.
- **The fix subagent** → scale to the findings: mechanical fixes take
  mid-tier, anything with design judgment takes standard or above.
- **The scoped re-review** → a lower tier for small fix diffs.

**Always specify the model explicitly when dispatching.** An omitted model
inherits your session's, which silently defeats this section.

Turn count beats token price: the cheapest models routinely take 2–3× the turns
on multi-step work, costing more overall.

## Gates

The mode that sent you here usually settled it: *review at the end* and
*autopilot* mean none, *review each task* means a diff per task. The answer
settles delegated or
inline too (see above) — the two are welded, not independent.

**If nothing settled it, ask before Task 1** — one `AskUserQuestion` call, not a
sentence with an objection window. A plan handed over, a spec opened cold, or an
`/executing-plans` typed straight at the work all arrive with the gates open,
and this is where they get answered:

| Answer | What it means |
|---|---|
| **Review at the end** | delegated: one subagent builds the whole plan, an independent review at the end — report when done |
| **Review each task** | inline: present each task's diff and wait for approval before moving on — the user is the reviewer. Use a diff-review tool if one is available rather than pasting the diff |

There is no hand-off answer here. Reaching this skill means the work gets built;
handing it over is a choice made before arriving, in `writing-plans`.

With gates set to none, do not pause to check in mid-run. "Should I
continue?" prompts waste the user's time — they asked for the plan to run, so
run it. The only reasons to stop are BLOCKED you cannot resolve, ambiguity that
genuinely prevents progress, or the work complete.

## The build

Same setup and pre-flight scan. Then one dispatch:

- Record BASE (`git rev-parse HEAD`) — the final review's package needs it.
- Dispatch ONE implementer. Its brief is the plan or spec itself — pass the
  path, introduced as "read this first — it is your requirements, with the
  exact values to use verbatim" — plus the Global Constraints copied verbatim,
  your resolution of anything the pre-flight scan surfaced, and on the spec
  path the task file.
- Standing orders in the dispatch: work the tasks in plan order; test at the
  seams the plan or spec names as you go and run the full suite at the end;
  commit at each working step; write the full report to
  `<workspace>/build-report.md`;
  return only status, commits, a one-line test summary, and concerns.
- Model per Model Selection — a whole plan nearly always carries design
  judgment, so the capable tier is the default, not the exception.

Template: [implementer-prompt.md](implementer-prompt.md)

**Handle the return:**

- **DONE** → go straight to Final review. It is the review.
- **DONE_WITH_CONCERNS** → read the concerns first. If they are about
  correctness or scope, address them before review. If they are observations,
  note them and carry them into the final review.
- **NEEDS_CONTEXT** → provide what was missing and re-dispatch.
- **BLOCKED** → assess. A context problem gets more context and the same
  model. A reasoning problem gets a more capable model. A plan too large for
  one context gets the chunking below. A wrong plan gets escalated to your
  human partner. Never ignore an escalation or force the same model to retry
  without changes, and never let an implementer guess through a plan defect.

### Oversized plans

A plan that won't fit one builder's context runs as sequential chunk
dispatches, split at task boundaries. Each brief carries the plan path, its
chunk's tasks, and the prior chunks' reports (each chunk appends to the same
`build-report.md`); after each dispatch, append one `chunk N done` line to
`<workspace>/chunk-log.md` — the only bookkeeping. Read that log before every
dispatch and resume at the first chunk without a line: your context can compact
between chunks, and re-dispatching finished work is the most expensive mistake
this skill has made. Zero interim reviews at any scale: the final review still
reviews the whole branch once.

## Running inline

Same setup and pre-flight scan. Then, per task: implement it, meet the
acceptance bar in the task's "Done when", and commit.
Review with the `code-review` skill at the end of the plan rather than per task —
inline work has no context isolation to protect, and a reviewer that watched you
write the code is not an independent gate.

Stop and ask when you hit a blocker, a critical gap in the plan, an instruction
you don't understand, or a verification that fails repeatedly. Don't force
through blockers.

## Final review

Run `scripts/review-package PLAN_FILE BASE HEAD` (BASE = the commit the branch
started from) and dispatch **two reviewers in parallel** over the same package,
on the most capable model available:

- **The spec axis** — did the branch build what the plan or spec asked:
  nothing missing, nothing extra, nothing implemented wrong.
  Template: [spec-reviewer-prompt.md](spec-reviewer-prompt.md)
- **The standards axis** — is it well built: code quality, design, tests.
  Template: [standards-reviewer-prompt.md](standards-reviewer-prompt.md)

Hand each reviewer the package as a file — the output never enters your
context. Reviewer inputs: the plan or spec path, the build report, the review
package, and the Global Constraints copied verbatim. Do not add open-ended
directives like "check all uses" without a concrete reason, and **do not
pre-judge findings** — never instruct a reviewer to ignore something. If your
prompt contains "do not flag", "at most Minor", or "the plan chose" — stop:
you are sparing yourself a fix wave.

Report the two axes' findings side by side, never merged or reranked — one
axis must not mask the other.

A reviewer may report "⚠️ Cannot verify from diff" items — requirements living
in unchanged code. Resolve each yourself before the fix wave; you hold context
the reviewer lacks. A confirmed gap joins the findings.

**One fix wave.** If the reviews return findings, dispatch **ONE** fix
subagent with the complete combined list — not one fixer per finding.
Per-finding fixers each rebuild context and re-run suites; a real session's
fix wave cost more than all its build work combined. Two rules before
dispatching:

- **Plan-mandated findings** — anything conflicting with what the plan
  requires — are your human partner's call. Present the finding and the plan
  text, ask which governs. Do not dismiss the finding, and do not dispatch a
  fix that contradicts the plan without asking.
- **Never fix findings yourself.** Controller fixes pollute your context and
  skip review.

Then exactly one scoped re-review of the fix diff: run
`scripts/review-package PLAN_FILE FIX_BASE HEAD` (FIX_BASE = the head the
axis reviewers saw) and dispatch
[re-review-prompt.md](re-review-prompt.md). It verdicts each finding ADDRESSED
or NOT ADDRESSED and flags new breakage in the fix diff only. There is no
second wave: whatever remains open gets adjudicated.

**Adjudication.** Rule on each residual finding yourself, once, and record
every ruling in your final report — silent discards are forbidden:

- **Reviewer wrong, or contestable:** the code stands — record why.
- **Real, but nothing depends on it:** record it as deferred; it appears in
  your report and in the PR description if one is opened.
- **Real and load-bearing** — it undermines what was built or reveals a plan
  defect: STOP. Report with the finding, the plan text it collides with, and
  what the fix wave tried. Shipping past a structural failure defeats the
  review.

Adjudicate only after the re-review. Adjudicating earlier is pre-judging with
a different name.

## Finish

When the final review is clean — or every residual carries a ruling — delete
this plan's workspace (`rm -rf <workspace>`) — git history is the record now.
Sibling directories belong to other plans.

Then report: what was built, the verification status, anything deferred with
its ruling, and the branch. Integration is your human partner's decision —
present the options and wait.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Close enough on spec compliance" | The spec axis found gaps = not done. Fix, or adjudicate after the re-review — on the record. |
| "I'll fix it myself, dispatching is overhead" | Controller fixes pollute your context and skip review. Dispatch the fix subagent. |
| "A second fix wave will converge" | Residuals after the re-review get adjudicated, not re-dispatched — the failure is structural, not effort-shaped. |
| "This finding is obviously wrong, I'll drop it" | You adjudicate only after the re-review, and every ruling is recorded. |
| "The fix was small, skip the re-review" | Unreviewed fixes are how regressions land. |
| "The plan has the code, so a cheap model can do it" | These plans don't have the code. See Model Selection. |
