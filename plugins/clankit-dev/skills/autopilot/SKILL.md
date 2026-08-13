---
name: autopilot
description: Use when you want a feature implemented end-to-end autonomously, without supervision — writes the plan, hands the whole build to one implementer, reviews the finished branch, fixes what review finds, and opens a draft PR, all inside a git worktree so the main workspace is never touched. Use when the user says "/autopilot", "autopilot this", "ship this without me watching", "build this end to end", or hands over a self-contained feature and steps away.
user_invocable: true
---

# Autopilot

Take a self-contained feature from a one-line ask to a **draft PR**, with no human
in the loop in between. The result handed back is one PR link (plus the worktree
path), and a report of every decision that was made for you along the way.

Autopilot's premise is: run the workflow exactly as a human would — the plan gets
written, the build gets independently reviewed, findings get fixed — with nobody
present to confirm any of it. It is not a lighter path. It is the same path with
the gates answered in advance.

Use this when you trust the task enough not to sit over it. It is autonomous by
design: **after invocation it does not stop to ask you anything** unless it genuinely
cannot proceed (see Aborting).

## Core principle — orchestrate, don't restate

This skill is **control flow, not policy.** It sequences phases and dispatches subagents.
The *specifics* — how this repo names branches, writes commits, runs tests, whether it
uses TDD — are NOT written here. They come from the target repo's `CLAUDE.md` / `AGENTS.md`
and the workspace `CLAUDE.md`, which every subagent inherits automatically.

So: never hardcode a branch-naming scheme, commit format, or test command in this flow.
Tell each subagent to **follow the repo's own conventions** and let those files drive.
This keeps autopilot portable across repos.

## The orchestrator runs in the main conversation

You (the main loop) are the orchestrator. Subagents cannot reliably spawn their own
subagents, so YOU dispatch every phase as a separate `Agent` call, own the worktree
lifecycle, and pass each phase's output forward as the next phase's input. Per the global
rule, say "clank, clank" before launching each subagent.

## The plan file is not optional

Autopilot always produces a written plan before it builds, and always executes it
through `executing-plans`. Two reasons, both of which bite hardest precisely
because nobody is watching:

- **Traceability.** The PR is reviewed by someone who wasn't there. The plan is
  what they check the diff against — and what the final review's spec axis
  checks it against first.
- **Resumability.** An unattended run that dies halfway has no conversation to
  recover from. The plan, the git log, and the build report are the whole
  recovery map.

A "short build brief" cannot do either. Don't substitute one.

## The decision report

Nobody is present to answer the questions the attended flow would ask, so every
phase answers them itself. That debt is repaid at the end: **throughout the run,
collect every decision a gate would normally have put to the user** — approaches
chosen between and why, trade-offs taken, ambiguities in the ask or the spec and
how they were resolved, findings adjudicated after review. Carry the list
forward from phase to phase and report it in your **final chat message**,
alongside the PR link. Nothing is written elsewhere — no decision log in the
repo or the PR body beyond its normal summary. The final message is where the
user learns where their judgment was substituted, and where to intervene.

## Phases

### Phase 0 · Understand & set up (orchestrator)
- **Check what you were handed.** Autopilot is invoked deliberately, and the work
  may already be designed:
  - **A plan file** → you already have Phase 1's output. Skip to Phase 2.
  - **An approved design or spec** → that is the input to Phase 1, not a substitute
    for it. Don't re-derive the design; do turn it into a plan.
  - **A bare ask** → proceed with the rest of this phase, then design it before
    planning it. Unattended work on an undesigned ask is how autopilot ships the
    wrong feature competently.
- Read the ask. If a ticket ID/URL was given, fetch it to get the full brief (via whatever tracker integration is available).
- Determine the **target repo**: use the sub-repo you're invoked in; otherwise infer it
  from the ask/ticket. If it's genuinely ambiguous, ask once — this is the only routine
  question allowed.
- Gather just enough context to brief the build: skim the target repo's `CLAUDE.md` /
  `AGENTS.md` and the directly relevant code. Don't over-research a small feature.
- Create a **git worktree** off the repo's main branch, following that repo's branch
  conventions. All subsequent work happens in this worktree path.

### Phase 1 · Plan (orchestrator)
- Use the `writing-plans` skill to produce a real plan file in the worktree. **Tell the
  subagent it is running under autopilot** — it cannot know otherwise, and that is what
  exempts it from the question `writing-plans` asks at the end (how the plan gets
  built): under autopilot nobody is asked, and Phase 2 already holds the answer —
  gates none, delegated.
- The acceptance bar follows the work: code in a repo with tests earns tests; work
  that's hard to test (UI, visual, external systems) earns a named verification run;
  prose and config earn a behavior check and no tests.
- Skip only if Phase 0 handed you a plan file already.

### Phase 2 · Build and review (orchestrator, via `executing-plans`)
- Run the plan through the `executing-plans` skill, **delegated, with gates:
  none**. That gives you, without asking anyone: one implementer building the
  whole plan, the two-axis final review of the finished branch, the fix wave,
  and the adjudication of whatever the fix wave leaves open.
- Do not re-implement any of that here. `executing-plans` owns the build and its
  review; this skill owns the envelope around it — worktree, plan, PR, and the
  decision that nobody will be asked.
- Carry its outcome forward: what was built, findings deferred or adjudicated,
  the verification status it observed — and every adjudication into the decision
  report.
- `executing-plans` ends by presenting integration options and waiting for a human.
  **You are that human.** Take its report and go to Phase 3 — don't stall, and don't
  ask the user.

### Phase 3 · Ship (orchestrator)
- Push the branch and open a **draft** PR with `gh pr create --draft`.
- PR body covers: what was built, the review summary, anything deferred or ruled on
  by the review, and the best-effort verification status (note failures plainly — they
  do NOT block the PR). Link the plan file; it is what a reviewer checks the diff
  against.
- Report back to the user: the **PR link**, the **worktree path**, and the
  **decision report** — every choice made on their behalf, per the section above.
  Stop.

## Model tiers

`executing-plans` owns tier selection for everything inside the build — follow its
Model Selection section, which scales the builder, reviewers, and fix subagent to the
work rather than fixing a tier per phase. The one call this skill makes directly is
Phase 1's planning, which is design work and takes the most capable model available.

## Verification policy

Best-effort, never blocking. Subagents run whatever checks the repo exposes and report
results; failures are recorded in the PR body, not treated as a stop condition.

What substitutes for a human sanity-check is the plan's acceptance bars plus the
two-axis final review inside `executing-plans`: the finished branch is checked
against the plan by reviewers that didn't write it — one axis for what was asked,
one for how well it's built. That is the whole reason autopilot plans before it
builds: without acceptance bars there is nothing for a reviewer to check intent
against, only taste.

## Guardrails

- **Draft PR only.** Open the draft and stop. Never `gh pr ready`, never merge, never
  comment on the PR. The draft is the deliverable; the human reviews from there.
- **Outbound hygiene.** PR title and body must not leak private planning-workspace paths,
  filenames, or internal task numbers. External tracker IDs (Jira, ClickUp, etc.) are fine.
- **Worktrees are pre-authorized** for this skill — create and use them without asking.
- **Leave the worktree in place** so the user can `cd` in and inspect. Removal is manual.

## Aborting (don't ship junk)

Stop and report instead of opening a PR when:
- The target repo can't be resolved and the user isn't around to disambiguate.
- The build produced no usable changes, or could not implement the feature at all.
- `executing-plans` stops on a load-bearing finding. Its adjudication exists to
  stop work shipping on a structural failure; pushing past it defeats the point.

A draft PR with *failing tests* is a valid outcome (flag it). A draft PR with *nothing
meaningful built* is not — report the failure instead. An abort still owes the
decision report for everything decided up to the stop.
