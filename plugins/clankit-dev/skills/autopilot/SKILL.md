---
name: autopilot
description: Use when you want a feature implemented end-to-end autonomously, without supervision — writes the plan, builds and reviews it task by task, fixes what review finds, and opens a draft PR, all inside a git worktree so the main workspace is never touched. Use when the user says "/autopilot", "autopilot this", "ship this without me watching", "build this end to end", or hands over a self-contained feature and steps away.
user_invocable: true
---

# Autopilot

Take a self-contained feature from a one-line ask to a **draft PR**, with no human
in the loop in between. The result handed back is one PR link (plus the worktree
path) for you to check out at your leisure.

Autopilot's premise is: run the workflow exactly as a human would — the plan gets
written, every task gets reviewed, findings get fixed — with nobody present to
confirm any of it. It is not a lighter path. It is the same path with the gates
answered in advance.

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
through `executing-plans`. Three reasons, all of which bite hardest precisely
because nobody is watching:

- **Traceability.** The PR is reviewed by someone who wasn't there. The plan is
  what they check the diff against.
- **Resumability.** An unattended run that dies halfway has no conversation to
  recover from. The plan plus `executing-plans`' ledger is the whole recovery map.
- **Review in between.** A per-task review catches a wrong turn at task 2 instead
  of inheriting it through task 7. An end-only review on unattended work reviews a
  compounded mistake.

A "short build brief" cannot do any of these. Don't substitute one.

## Phases

### Phase 0 · Understand & set up (orchestrator)
- **Check what you were handed.** Autopilot is a routing destination as well as a
  standalone entry point, so the work may already be designed:
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
  exempts it from both questions: no gate on the plan, and no handoff question at the
  end. Phase 2 answers the second one.
- The acceptance bar follows the work: code in a repo with tests earns tests; work
  that's hard to test (UI, visual, external systems) earns a named verification run;
  prose and config earn a behavior check and no tests.
- Skip only if Phase 0 handed you a plan file already.

### Phase 2 · Build and review (orchestrator, via `executing-plans`)
- Run the plan through the `executing-plans` skill with **gates: none** and its
  delegated mode. That gives you, without asking anyone: a subagent per task, a task
  review after each, the fix loop with its five-round cap, the ledger, and the final
  whole-branch review.
- Do not re-implement any of that here. `executing-plans` owns the build loop; this
  skill owns the envelope around it — worktree, plan, PR, and the decision that
  nobody will be asked.
- Carry its outcome forward: tasks completed, findings parked or deferred, and the
  verification status it observed.
- `executing-plans` ends by presenting integration options and waiting for a human.
  **You are that human.** Take its report and go to Phase 3 — don't stall, and don't
  ask the user.

### Phase 3 · Ship (orchestrator)
- Push the branch and open a **draft** PR with `gh pr create --draft`.
- PR body covers: what was built, the review summary, anything parked or deferred by
  the fix loop, and the best-effort verification status (note failures plainly — they
  do NOT block the PR). Link the plan file; it is what a reviewer checks the diff
  against.
- Report back to the user: the **PR link** and the **worktree path**. Stop.

## Model tiers

`executing-plans` owns tier selection for everything inside the build loop — follow its
Model Selection section, which scales implementers and reviewers to the task rather
than fixing a tier per phase. The one call this skill makes directly is Phase 1's
planning, which is design work and takes the most capable model available.

## Verification policy

Best-effort, never blocking. Subagents run whatever checks the repo exposes and report
results; failures are recorded in the PR body, not treated as a stop condition.

What substitutes for a human sanity-check is the per-task review inside
`executing-plans` — each task's diff is checked against its own acceptance bar by
something that didn't write it. That is the whole reason autopilot plans before it
builds: without an acceptance bar per task there is nothing for a reviewer to check
intent against, only taste.

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
- `executing-plans` reports BLOCKED on a load-bearing finding. Its breaker exists to
  stop work building on a structural failure; shipping past it defeats the point.

A draft PR with *failing tests* is a valid outcome (flag it). A draft PR with *nothing
meaningful built* is not — report the failure instead.
