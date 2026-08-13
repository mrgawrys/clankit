# Single-Builder Delivery — Design

> **To act on this design:** pick a mode — *vibe* (inline, no machinery),
> *review each task* (per-task diffs), *review at the end* (one subagent
> builds, one review at the end), or *plan first* (`writing-plans`, then how
> it gets built). Ask the user which; don't pick for them.

## Why

Usage showed the per-task machinery in `executing-plans` priced the delegated
modes out of existence: with a fresh subagent, a review, and a fix loop per
task, every real session picked *vibe* instead, so the safety net caught
nothing. Foundation defects the loop was meant to catch early are rare in
practice and mostly caught while writing the plan. Commit af2454c made
attended runs single-builder; this design finishes the move and removes the
per-task loop everywhere, autopilot included.

## Decisions

### executing-plans: single-builder is the only delegated shape

- Delete the per-task loop wholesale: per-task dispatch, per-task review, the
  five-round fix loop, the breaker, and fix-round model escalation.
- Keep: the pre-flight scan (plan-defect check before dispatch), the
  adjudication rules (now applied once, to residuals after the fix wave), and
  BLOCKED / NEEDS_CONTEXT / DONE_WITH_CONCERNS handling.
- The build: ONE implementer. Its brief is the plan or spec path plus Global
  Constraints plus standing orders — tasks in plan order, test at the spec's
  named seams as you go, full suite at the end, commit each working step,
  full report to `<workspace>/build-report.md`, return only status, commits,
  a one-line test summary, and concerns. Capable tier by default.
- Workspace: `plan-workspace` still creates the plan-named directory, purely
  as the file home (build report, review packages). No ledger, no
  `progress.md` — git log plus the report file are the recovery record.
- Oversized plans (won't fit one builder's context): sequential chunk
  dispatches split at task boundaries. Each brief carries the plan path, its
  chunk's tasks, and the prior chunks' reports; one `chunk N done` line
  appended to `<workspace>/chunk-log.md` per dispatch is the only
  bookkeeping. Zero interim reviews at any scale.
- Templates: the implementer prompt is reshaped for whole-plan briefs; the
  task-reviewer prompt is replaced by the two axis prompts below; the
  re-review prompt is kept for the fix wave.

### The final review: two parallel reviewers, one fix wave

- Two subagents over the same review package, run in parallel: a **spec
  axis** (built what the spec asked, nothing extra, nothing implemented
  wrong) and a **standards axis** (code quality, design, tests). Findings
  are reported side by side, never merged or reranked — one axis must not
  mask the other.
- The combined findings go to ONE fix subagent, then one scoped re-review,
  then adjudication of residuals. No second wave.

### autopilot: out of the flow, keeps the envelope, owes a decision report

- Remove autopilot from every flow artifact that advertises it: the
  bootstrap's question line, its "typed route, not a menu answer" paragraph,
  and the spec-header template. The skill remains, invoked deliberately when
  the user has no time to answer and believes the agent has enough to decide.
- Its body shrinks to the envelope: any input → worktree → plan
  (`writing-plans`, told nobody will be asked) → `executing-plans`
  single-builder with gates none → draft PR. The "per-task review
  substitutes for the absent human" rationale is deleted; the substitute is
  the plan's acceptance bars plus the two-axis final review.
- Decision report: throughout the run, autopilot collects every decision a
  gate would normally have asked the user — approaches chosen between,
  trade-offs taken, ambiguities resolved and how — and reports them in its
  final chat message. Nothing is written elsewhere.

### brainstorming: specs name test seams

- The spec template gains a short Testing section naming the seams — the
  public interfaces the tests exercise — agreed during design. The builder
  tests at those seams; `writing-good-tests` governs test quality. No TDD
  mandate.

## Out of scope

- Any wider port of Matt Pocock's flow (tickets, trackers, domain
  glossaries).
- Mid-build checkpoints — considered and dropped: foundation rot is rare and
  the plan stage is the early defense.
- Merging autopilot into `executing-plans` — rejected so the "ask nothing"
  disposition cannot leak into modes where asking is the point.

## Testing

Prose and skill files only — no tests. Verification is a read-back of each
changed skill against this spec, plus a check that no flow artifact still
advertises autopilot or the per-task loop.

## Affected files

- `plugins/clankit-dev/skills/executing-plans/` (SKILL.md, prompt templates)
- `plugins/clankit-dev/skills/autopilot/SKILL.md`
- `plugins/clankit-dev/skills/brainstorming/SKILL.md` (spec header + template)
- `plugins/clankit-dev/skills/writing-plans/SKILL.md` (handoff wording)
- `plugins/clankit-dev/bootstrap.md`
- `MAINTENANCE.md` (amend the af2454c entry)
