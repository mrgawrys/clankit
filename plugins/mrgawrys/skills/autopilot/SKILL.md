---
name: autopilot
description: Use when you want a small feature implemented end-to-end autonomously, without supervision — plans, builds, reviews, fixes, and opens a draft PR, all inside a git worktree so the main workspace is never touched. Use when the user says "/autopilot", "autopilot this", "ship this without me watching", "build this end to end", or hands over a small self-contained feature and steps away.
user_invocable: true
---

# Autopilot

Take a small, self-contained feature from a one-line ask to a **draft PR**, with no
human in the loop in between. The skill orchestrates a chain of subagents — plan →
build → review → fix → ship — each working inside a single git worktree. The result
handed back is one PR link (plus the worktree path) for you to check out at your leisure.

Use this when you trust the task to be small enough that you don't want to sit over it.
It is autonomous by design: **after invocation it does not stop to ask you anything**
unless it genuinely cannot proceed (see Aborting).

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

## Phases

### Phase 0 · Understand & set up (orchestrator)
- Read the ask. If a ticket ID/URL was given, fetch it to get the full brief (via whatever tracker integration is available).
- Determine the **target repo**: use the sub-repo you're invoked in; otherwise infer it
  from the ask/ticket. If it's genuinely ambiguous, ask once — this is the only routine
  question allowed.
- Gather just enough context to brief the build: skim the target repo's `CLAUDE.md` /
  `AGENTS.md` and the directly relevant code. Don't over-research a small feature.
- Create a **git worktree** off the repo's main branch, following that repo's branch
  conventions. All subsequent work happens in this worktree path.

### Phase 1 · Plan (orchestrator, lightweight)
- Write a short build brief: what to change, which files/areas, the acceptance bar
  ("done when…"). A few bullets — not a formal plan document. No user gate.

### Phase 2 · Build  → subagent (Opus)
- Dispatch one subagent with the brief and the worktree path. It implements the feature,
  commits incrementally per the repo's conventions, and runs whatever quick checks the
  repo offers (build/tests/lint) **best-effort**.
- It returns: a summary of what it changed, and the verification status it observed.

### Phase 3 · Review  → subagent (Opus)
- Dispatch a reviewer in the worktree with **two lenses**:
  1. **Correctness** — invoke the `code-review` skill on the worktree diff for bugs and
     quality issues.
  2. **Intent** — compare the diff against the Phase 1 brief: was what we asked for
     actually built? Flag gaps and missed acceptance criteria.
- It returns structured findings in both buckets (or "clean").

### Phase 4 · Fix  → subagent (Sonnet)
- If there are findings, dispatch a fix subagent in the worktree with the findings list.
  It applies the fixes (both correctness and intent gaps), commits, and re-runs the quick
  checks best-effort. **Single pass — no re-review loop.**
- If review came back clean, skip this phase.

### Phase 5 · Ship (orchestrator)
- Push the branch and open a **draft** PR with `gh pr create --draft`.
- PR body covers: what was built, the review summary, and the best-effort verification
  status (note failures plainly — they do NOT block the PR).
- Report back to the user: the **PR link** and the **worktree path**. Stop.

## Model tiers

Set per `Agent` call — tweak freely:
- **Build, Review** → Opus (creative work and subtle-bug detection).
- **Fix** → Sonnet (mechanical application of a known findings list).

## Verification policy

Best-effort, never blocking. Subagents run whatever checks the repo exposes and report
results; failures are recorded in the PR body, not treated as a stop condition. The
*intent* lens in Phase 3 is the substitute for a human sanity-check that the right thing
got built.

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
- The build subagent produced no usable changes, or could not implement the feature at all.

A draft PR with *failing tests* is a valid outcome (flag it). A draft PR with *nothing
meaningful built* is not — report the failure instead.
