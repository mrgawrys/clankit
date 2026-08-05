---
name: executing-plans
description: "Use when a design is ready to build - either a written implementation plan, or an approved spec being built directly. Runs delegated by default - a fresh subagent per task with a review and fix loop between tasks - or inline when the work is short. Reviews the source critically before starting and stops when blocked rather than guessing."
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
  Task 1.** The full bodies go in the ledger once the workspace exists (Setup,
  below); the approval message itself is **one line per task** — `<ID>  <verb
  phrase>` — and nothing else. No tables, no box-drawing, no acceptance bars,
  no per-task prose. A gate the reviewer has to wade through is a gate they
  rubber-stamp; they approve off something scannable and read the ledger when
  they want the detail. That approved list is your task sequence and your
  ledger entries — it is not a document, and it does not get written to
  `docs/plans/`.
- **Neither — just an ask** → you are in the wrong skill. Go design it first
  with `brainstorming`.

Everything below reads "the plan" to mean whichever of these you hold.

## Delegated or inline

This choice travels with gates, by design — oversight substitutes for
machinery. Per-task diffs mean the user reviews every task, so the work runs
inline and takes one review at the end; no gates means nobody is watching, so
each task earns a fresh implementer and its own review. The mode that sent you
here usually answers both: *review each task* means inline, *review at the end*
and *autopilot* mean delegated. If neither is settled, ask the Gates question
first (see below) — its answer settles this one too.

**Delegated** is right when the plan has more than a couple of tasks, when
context matters, or when you want each task reviewed by something that didn't
write it. **Inline** is right for short plans and tightly coupled tasks, where
handing off costs more than it saves. Ask delegated-or-inline on its own only
when gates are already settled but run style somehow isn't (e.g. the user said
"don't stop between tasks" without picking a mode):

```
Plan loaded and reviewed. How should this run?

1. Delegated — a fresh subagent per task, isolated context,
               review and fix loop between tasks
2. Inline    — the work happens in this session
```

## Setup

Ensure the work happens in an isolated workspace — use the harness's worktree
tooling. Never start implementation on a main/master branch without explicit
consent.

Conversation memory does not survive compaction. In real sessions, controllers
that lost their place have re-dispatched entire completed task sequences — the
single most expensive failure observed. Track progress in a ledger file on disk.

- Run `scripts/plan-workspace PLAN_FILE`, passing the plan **or the spec** —
  either way it is a file on disk and the workspace is named after it. It prints
  this plan's git-ignored
  directory (`<repo-root>/.clankit/plans/<plan-basename>/`), home to every
  artifact for THIS plan: ledger, briefs, reports, review packages. Another
  plan's directory is never yours to read or write.
- Check for this plan's ledger at `<workspace>/progress.md`. If its first line
  names your plan file, tasks with a `Task <N>: complete` line are DONE — do not
  re-dispatch them; resume at the first task without one. A task whose last line
  is a fix round is mid-loop: resume at the next round. A ledger naming a
  different plan file is another plan's progress — leave it and start your own.
- Create the ledger with its identity on the first line:
  `# Ledger — plan: <plan file path>`.
- On the spec path, the derived task bodies go here, under the identity line —
  `## <ID>` with its task and its "done when…", one section each. This is the
  home for the detail the approval message deliberately leaves out, and it puts
  the acceptance bars somewhere that survives compaction. Writing them here is
  not writing a plan document: the ban is on `docs/plans/`, and the ledger is
  git-ignored workspace that dies with the plan.
- The ledger is your recovery map: the commits it names exist in git even when
  your context no longer remembers creating them. After compaction, trust the
  ledger and `git log` over your own recollection.

Read the plan once and note its Global Constraints. From a spec, the constraints
are whatever it pinned down as decided — exact values, naming, response
shapes — and they bind every task the same way.

**Pre-flight scan.** Before dispatching Task 1, scan the plan for conflicts:
tasks that contradict each other or the Global Constraints, and anything the
plan mandates that a reviewer would treat as a defect. Present everything you
find as one batched question — each finding beside the plan text that mandates
it, asking which governs — before execution begins, not one interrupt per
discovery mid-plan. If the scan is clean, proceed without comment.

## Model Selection

Use the least powerful model that can do the job — but read the next paragraph
before assuming that means cheap.

**These plans do not contain the implementation.** A task carries units,
interactions, signatures, constraints and an acceptance bar; the implementer
writes the code and designs the tests. That is creative work, not transcription.
So implementers need a mid-tier model as the floor, and a capable one whenever
the task involves design judgment.

> **Intent, for anyone re-syncing this skill with upstream:** upstream directs
> implementers to the cheapest tier *because its plans contain the complete code
> to write*. That premise is false here and the guidance inverts. If a future
> merge reintroduces "use the cheapest tier for transcription," it is wrong for
> this plan format — delete it.

- **Mechanical, one or two files, nothing to decide** → mid-tier
- **Multi-file integration, pattern matching, debugging** → standard
- **Design judgment or broad codebase understanding** → most capable
- **Reviewers** → scale to the diff's size, complexity and risk. Scoped
  re-reviews of small fix diffs take a lower tier
- **Fix-loop escalation (rounds 4–5)** → at least one tier above the implementer
  that got stuck
- **The final whole-branch review** → the most capable model available

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
| **Review at the end** | delegated: run to completion — a fresh subagent and a review per task — and report at the end |
| **Review each task** | inline: present each task's diff and wait for approval before moving on — the user is the reviewer. Use a diff-review tool if one is available rather than pasting the diff |

There is no hand-off answer here. Reaching this skill means the work gets built;
handing it over is a choice made before arriving, in `writing-plans`.

With gates set to none, do not pause to check in between tasks. "Should I
continue?" prompts waste the user's time — they asked for the plan to run, so
run it. The only reasons to stop are BLOCKED you cannot resolve, ambiguity that
genuinely prevents progress, or all tasks complete.

## The delegated task loop

Everything you paste into a dispatch prompt — and everything a subagent prints
back — stays resident in your context for the rest of the session and is re-read
on every later turn. Hand artifacts over as files.

### 1. Dispatch the implementer

Record BASE (`git rev-parse HEAD`) before dispatching — the review package and
fix-round diffs need it.

- **Task brief:** write the task's text from the plan to
  `<workspace>/task-N-brief.md` and pass the path. The brief is the single
  source of requirements; exact values appear only there.
- Your dispatch should contain: (1) one line on where this task fits; (2) the
  brief path, introduced as "read this first — it is your requirements, with the
  exact values to use verbatim"; (3) interfaces and decisions from earlier tasks
  the brief cannot know; (4) your resolution of any ambiguity you noticed in the
  brief; (5) the report-file path and report contract.
- **Report file:** name it after the brief (`task-N-report.md`). The implementer
  writes its full report there and returns only status, commits, a one-line test
  summary, and concerns.
- A dispatch describes one task, not the session's history. Do not paste
  accumulated prior-task summaries into later dispatches — a real session's
  dispatch hit 42k characters of which 99% was pasted history.
- If an earlier task parked a finding in the area this task touches, carry a
  pointer to that ledger entry.
- Record the implementer's agent identity — fix rounds 1–3 resume it.
- Never dispatch multiple implementation subagents in parallel.

Template: [implementer-prompt.md](implementer-prompt.md)

### 2. Handle the report

**DONE:** Generate the review package with `scripts/review-package PLAN_FILE BASE
HEAD` — it writes a diff file and prints `wrote <path>: ...`. BASE is the commit
you recorded, never `HEAD~1`, which silently drops all but the last commit of a
multi-commit task. Dispatch the task reviewer with that path.

**DONE_WITH_CONCERNS:** Read the concerns first. If they are about correctness or
scope, address them before review. If they are observations, note them and proceed.

**NEEDS_CONTEXT:** Provide what was missing and re-dispatch.

**BLOCKED:** Assess. A context problem gets more context and the same model. A
reasoning problem gets a more capable model. A too-large task gets split. A wrong
plan gets escalated to your human partner.

Never ignore an escalation or force the same model to retry without changes.

### 3. Review the task

Per-task reviews are task-scoped gates; the broad review happens once, at the
end. Never skip the task review, and never accept a report missing either
verdict — spec compliance AND task quality are both required. Implementer
self-review never replaces it.

- Hand the reviewer its diff as a file, from `scripts/review-package`. The output
  never enters your context, and the reviewer sees commits, stat summary, and
  full diff in one Read.
- **Reviewer inputs:** the brief file, the report file, the review package, and
  the global constraints that bind the task — copied verbatim, exact values and
  formats. The template already carries the process rules.
- Do not add open-ended directives like "check all uses" without a concrete
  reason. Do not ask a reviewer to re-run tests the implementer already ran.
- **Do not pre-judge findings.** Never instruct a reviewer to ignore something.
  If your prompt contains "do not flag", "at most Minor", or "the plan chose" —
  stop: you are sparing yourself a review loop.

A reviewer may report "⚠️ Cannot verify from diff" items — requirements living in
unchanged code or spanning tasks. Resolve each yourself before marking the task
complete; you hold the cross-task context it lacks. A confirmed gap enters the
fix loop.

Template: [task-reviewer-prompt.md](task-reviewer-prompt.md)

### 4. The fix loop

Triggers on spec ❌, any Critical or Important finding, or a ⚠️ item you confirmed.

Two routes leave immediately:

- **Minor findings** go to the ledger (`Task <N>: minor (deferred): <one-liner>`)
  and are pointed at from the final review. They never enter the loop. A roll-up
  nobody reads is a silent discard.
- **Plan-mandated findings** — anything conflicting with what the plan requires —
  are your human partner's call. Present the finding and the plan text, ask which
  governs. Do not dismiss the finding, and do not dispatch a fix that contradicts
  the plan without asking.

Everything else enters the loop. A round is one fix dispatch plus one scoped
re-review. **Five rounds maximum per task.**

**Rounds 1–3 — resume the original implementer.** Send the open findings verbatim.
Its context is intact. If your harness cannot message a live subagent, dispatch a
fresh one with the brief path, report-file path, and findings — the report file is
the persistent memory either way.

**Rounds 4–5 — fresh implementer, more capable model,** with this framing: "A
prior implementer attempted this task N times; you own it now. Read the report
file for what was tried." A loop surviving three resumes usually means the
implementer cannot see its own problem.

**Every round:** the implementer fixes, re-runs the tests covering the amended
code, appends its fix report to the same file, and returns the short contract.
Confirm the fix report contains the covering tests, the command, and the output
before re-dispatching the reviewer.

**The re-review is scoped.** Run `scripts/review-package PLAN_FILE FIX_BASE HEAD`
where FIX_BASE is the head the previous review saw, and dispatch
[re-review-prompt.md](re-review-prompt.md). The re-reviewer verdicts each finding
ADDRESSED or NOT ADDRESSED and flags new breakage in the fix diff only. New
Critical/Important breakage joins the open findings. Out-of-scope observations go
to the ledger as deferred minors — they never extend the loop.

**After each round,** append:
`Task <N>: fix round <R>/5 (<X> addressed, <Y> open — <one-liners>; commits <a7>..<b7>)`

Never fix findings yourself — controller fixes pollute your context and skip review.

**The breaker.** When round 5 still leaves findings open, stop dispatching and
adjudicate each one yourself:

- **Reviewer wrong, or contestable:** park it — `Task <N>: parked — <finding> —
  ruling: <why the code stands>`.
- **Real, nothing downstream builds on it:** park it, ruling says real and deferred.
- **Real and load-bearing** — a later task builds on it, or it reveals a plan
  defect: STOP. Append `Task <N>: BLOCKED — <reason>` and report with the finding,
  the plan text it collides with, and the fix history. Parking a structural failure
  lets every dependent task build on it.

Adjudicate only at the cap. Adjudicating earlier is pre-judging with a different
name. Every adjudication is a ledger entry — silent discards are forbidden.

### 5. Complete the task

- `Task <N>: complete (commits <base7>..<head7>, review clean)`
- `Task <N>: complete (commits <base7>..<head7>, <K> parked)` after a breaker

Append that ledger line and move on. Never move to the next task while the review
has open Critical/Important issues that are neither fixed nor parked with a ruling.

## Running inline

Same setup, ledger, and pre-flight scan. Then, per task: implement it, meet the
acceptance bar in the task's "Done when", commit, and record the completion line.
Review with the `code-review` skill at the end of the plan rather than per task —
inline work has no context isolation to protect, and a reviewer that watched you
write the code is not an independent gate.

Stop and ask when you hit a blocker, a critical gap in the plan, an instruction
you don't understand, or a verification that fails repeatedly. Don't force
through blockers.

## Final review

Run `scripts/review-package PLAN_FILE MERGE_BASE HEAD` (MERGE_BASE = the commit
the branch started from) and dispatch the `code-review` skill on the most capable
model available, pointing it at the ledger's deferred-minor and parked lines so it
can triage what must be fixed before merge.

If it returns findings, dispatch **ONE** fix subagent with the complete list — not
one fixer per finding. Per-finding fixers each rebuild context and re-run suites;
a real session's final-review fix wave cost more than all its tasks combined. Then
run exactly one scoped re-review of the fix wave. Adjudicate residuals as in the
breaker. There is no second fix wave.

## Finish

When the final review is clean, delete this plan's workspace (`rm -rf <workspace>`)
— git history is the record now. Sibling directories belong to other plans.

Then report: what was built, the verification status, anything parked or deferred,
and the branch. Integration is your human partner's decision — present the options
and wait.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Close enough on spec compliance" | Reviewer found spec gaps = not done. Fix, or hit the cap and adjudicate. |
| "I'll fix it myself, dispatching is overhead" | Controller fixes pollute your context and skip review. Resume the implementer. |
| "One more round will converge" | Past the cap, rounds don't converge — the failure is structural. |
| "This finding is obviously wrong, I'll drop it" | You adjudicate only at the cap, and every ruling is a ledger entry. |
| "The fix was small, skip the re-review" | Unreviewed fixes are how regressions land. |
| "Reviews slow the loop down" | The loop without reviews is unverified churn. |
| "Ledger bookkeeping is overhead" | The ledger is what survives compaction. |
| "The plan has the code, so a cheap model can do it" | These plans don't have the code. See Model Selection. |
