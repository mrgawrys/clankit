# Clankit Workflow Skills — Design

**Date:** 2026-07-27
**Status:** Approved, not yet implemented

## Goal

Own the design→plan→build workflow as a set of clankit skills, vendored from
superpowers (MIT) and patched at the points where its assumptions conflict with
how this workflow is actually used.

## Problem

The superpowers workflow forces one path: brainstorm → write a spec file →
write a plan document → execute. Three things go wrong with it.

**It fires for trivial asks.** The bootstrap injected on every session says to
invoke a skill if there is "even a 1% chance" one applies, and brainstorming's
description says it MUST be used before any creative work. A question that
deserved an answer gets a design conversation.

**Its terminal state is hardcoded.** Brainstorming ends by invoking
writing-plans — "Do NOT invoke any other skill" — regardless of whether a plan
document helps. When a fresh spec already carries the design, the plan restates
it at greater length.

**Its plans contain all the code.** writing-plans requires literal code blocks
in every step and forbids abbreviating ("repeat the code — the engineer may be
reading tasks out of order"). The orchestrator writes the implementation into a
document; the subagent transcribes it.

Overriding these from instruction files does not work. Every override that
holds is one the skill explicitly yields to ("user preferences for spec
location override this default"). Every override that fails is one fighting
imperative body text. Instruction files are a static preamble; skill bodies
arrive fresh at the moment of decision, in the imperative. Proximity wins.

## Root cause

**Policy and control flow are welded together.** Superpowers' skills state both
*how* to do something and *what happens next*. brainstorming → writing-plans →
subagent-driven-development is a fixed chain expressed inside the policy
skills, so a routing decision gets made by a skill that lacks the information
to make it. The artifact decision in particular is downstream of the design:
you cannot know whether the work needs a written plan until you know how many
tasks it is and who will execute them, and you learn that by designing it.

The existing `autopilot` skill already states the fix — "this skill is control
flow, not policy" — and works precisely because it never enters the superpowers
stack.

**The plan format follows from one premise.** writing-plans says to assume the
implementer has "questionable taste" and "doesn't know good test design very
well." Once you assume bad taste, full specification is forced: any freedom
left is an opportunity to exercise the taste you distrust. Change the premise
to "capable, but blind to context it cannot see," and the format collapses to
interfaces, constraints, and boundaries.

Superpowers concedes the consequence in its own model-selection guidance: "when
the task's plan text contains the complete code to write, the implementation is
transcription plus testing: use the cheapest tier." It treats this as a cost
win. It is an inversion — the expensive orchestrator does the creative work,
and its context, which subagents exist to protect, is spent before
orchestration begins.

## Why vendor rather than depend

Movement between superpowers 6.1.1 and 6.2.0, by skill:

| Skill | Lines changed | Nature |
|---|---|---|
| subagent-driven-development | 525 | Real: plan-scoped workspaces, resume-implementer fix loop, circuit breaker |
| finishing-a-development-branch | 184 | Real: menu fix, forge-agnostic PRs |
| test-driven-development | 71 | Real: eval-backed |
| using-git-worktrees | 51 | Superseded by native worktree tools |
| requesting-code-review | 20 | Prose deletion |
| verification-before-completion | 19 | Prose deletion |
| dispatching-parallel-agents | 18 | Prose deletion |
| executing-plans | 18 | Prose deletion |
| systematic-debugging | 15 | Prose deletion |
| brainstorming | 10 | Prose deletion |
| writing-plans | 6 | Prose deletion |

The skills to be forked are frozen. The one with real churn is being absorbed
and rewritten anyway. Vendoring costs almost nothing in forgone updates.

Much of the remaining bulk is portability: superpowers targets five harnesses
and Windows, so it reimplements in markdown and shell what this harness now
does natively — a hand-maintained progress ledger where a native task list
exists, 167 lines of worktree management where native worktree tools exist,
three hook variants for shells never used here.

**Vendoring only costs at upgrade time for files that are patched.** A skill
copied verbatim is re-copied wholesale on a new release. Ongoing maintenance
equals the patched files, and nothing else.

## Architecture

```
  ask
   │
   ▼  bootstrap (hook-injected, always resident)
   │  TRIAGE
   ├─ conversation / question ──────► answer. no ceremony.
   ├─ trivial + unambiguous ────────► do it → verify → done.
   └─ real change
          │
          ▼  brainstorming — conversation only, writes nothing
          │
          ▼  ROUTING TABLE (in the bootstrap; reachable from anywhere)
          │
    ┌─────┴──────────┬────────────────────┐
    ▼                ▼                    ▼
 write spec       spec in context     spec in context
 (+ plan)         → executing-plans   → autopilot
 → clear chat        delegated |         unattended
 → fresh session      inline
    │
    └──► fresh session reads plan → routing table again
```

### The bootstrap

A new file, injected by a clankit SessionStart hook on `startup|clear|compact`.
This is the only file in the design with no ancestor. It carries:

1. **The triage rule** — talk gets an answer, trivial work gets done, real
   changes get a design conversation.
2. **The routing table** — artifact, gates, execution.
3. **Skill invocation rules** — replacing superpowers' `using-superpowers`.

Triage lives here rather than in a skill because the bootstrap is already
resident: the decision costs no invocation and no turn. This is what fixes
over-triggering — brainstorming's description can then be honestly narrow.

Budget: ~50 lines. superpowers compressed its own bootstrap because "its size
is paid for constantly," and `writing-skills` sets 200 lines as the ceiling for
frequently-loaded content.

The routing table lives here too, because routing happens at two moments —
after a design conversation, and when a fresh session opens a plan file. One
copy, reachable from both.

### The routing table

Two questions asked, one property inferred.

**Q1 — Where does it execute?** This determines the artifact, because the
artifact only has to exist if the writer and the reader are different contexts.

| Execution | Artifact |
|---|---|
| Fresh session after clearing context | Spec, plus a plan when task sequencing matters |
| This session | Approved design in context; nothing written |
| Unattended (`autopilot`) | Approved design in context; nothing written |

**Q2 — Gates?** Independent of everything else. Per-task diff review (via
`revdiff`), a single approval up front, or none. Full test rigor with zero
gates is a common and valid combination.

**Inferred — rigor.** Never asked. Derived from the repo's conventions and the
change's testability:

- Testable code in a repo with tests → tests, in the repo's idiom
- Hard to test (UI, visual output, external systems) → a named verification
  run, stated explicitly
- Prose, skills, config → behavior check, no tests

This last distinction is the one superpowers lacks: it conflates testing with
verification and writes tests where a verification run is what is wanted.

## The reduced plan format

Each task carries what an implementer cannot derive, and nothing else.

```markdown
### Task N: <name>

**Units**       — code units created or changed, one line each: name plus
                  responsibility. Altitude is whatever the language calls for:
                  a module, a class, a single function, a hook.
**Interacts**   — how they talk to each other and to existing code; what
                  crosses each boundary.
**Signatures**  — exact names and types later tasks depend on, verbatim.
**Constraints** — exact values, plus design decisions that are easy to get
                  wrong ("sliding window, not fixed").
**Code**        — only where prose cannot carry it. Rule: you must be able to
                  name what breaks without it. Usually zero blocks per plan,
                  sometimes one.
**Done when**   — the acceptance bar, per the inferred rigor above.
```

Kept from writing-plans: File Structure, Task Right-Sizing ("split only where a
reviewer could meaningfully reject one task while approving its neighbor"),
Global Constraints, the Interfaces block, and the type-consistency self-review.

Dropped: Bite-Sized Task Granularity, per-step code blocks, the No-Placeholders
code mandates, the Execution Handoff.

## Skill inventory

### New

| Skill | Notes |
|---|---|
| `bootstrap` | Hook-injected. Triage, routing table, invocation rules. ~50 lines |

### Patched — the entire maintenance surface

| Skill | Change |
|---|---|
| `brainstorming` | Terminal becomes "consult the routing table." Spec writing moves from a fixed step to a routing outcome. Drop the vestigial `spec-document-reviewer-prompt.md` (the skill already reviews inline). Keep `visual-companion`. **Neutralize the domain**: the code-specific guidance ("cover architecture, components, data flow, error handling, testing"; "working in existing codebases"; design-for-isolation) becomes conditional on the work being software. What generalizes — one question at a time, two or three approaches, sections gated on approval, YAGNI — stays unconditional |
| `writing-plans` | The reduced format above. Home of the testing-vs-verification rule, in "Done when" |
| `executing-plans` | Absorbs the subagent loop; see below |
| `systematic-debugging` | One-line rewire: its `test-driven-development` reference is dropped. Its `verification-before-completion` reference survives |
| `autopilot` | Becomes a routing destination. Phases 0–1 accept an approved design or a plan file instead of re-deriving one |

### Vendored verbatim — re-copied wholesale on upgrade

`writing-skills` (and its references) · `receiving-code-review` ·
`verification-before-completion` · `dispatching-parallel-agents` ·
`writing-good-tests.md`, kept as a reference document without its TDD wrapper

### Dropped

`using-superpowers` · `subagent-driven-development` (absorbed) ·
`test-driven-development` (skill only) · `finishing-a-development-branch` ·
`requesting-code-review` · `using-git-worktrees` (native) · all harness
reference files and alternate hook variants

## Execution

`executing-plans` is the entry point a plan file names, and the destination the
routing table offers for attended work. It reviews the plan critically first,
stops when blocked rather than guessing, then runs in one of two modes:

**Delegated (default)** — a fresh subagent per task, isolated context, review
and fix loop between tasks. This absorbs subagent-driven-development: brief
composition, dispatch, review packages, the fix loop, and the five-round
circuit breaker with adjudication. The breaker is scar tissue from real
failures and is ported close to verbatim.

**Inline** — the session does the work itself. Short plans, tightly coupled
tasks.

Modes are orthogonal to gates. Delegated-with-gates and delegated-ungated are
both valid.

Slimming relative to subagent-driven-development's 503 lines: no `task-brief`
extraction (a reduced plan's task *is* the brief), no harness-portability
notes, and the hand-rolled ledger optionally replaced by the native task list.
Target ~250–300 lines.

**The critical patch.** Superpowers directs implementers to the cheapest model
tier because the plan already contains the code. The reduced plan does not, so
implementers do creative work and tiers go **up**, not down. Document this by
intent, not as a diff — a future re-pull would otherwise revert it silently.

## Maintenance

`MAINTENANCE.md` records:

- Vendored-verbatim skills are re-copied wholesale on a superpowers release.
- Only `test-driven-development` (for `writing-good-tests.md`) and
  `subagent-driven-development` (for the execution loop) have historically
  moved. Everything else has been static.
- Each patch is recorded by **intent**, so it can be re-applied to a rewritten
  upstream file. The model-tier inversion is the most important one.

Superpowers is MIT (Copyright 2025 Jesse Vincent). A `NOTICE` file lists which
skills derive from it. The repository is public, so attribution is required.

## Non-goals

**Subagents with gates outside `executing-plans`.** Delegated mode with gates
covers the case. `dispatching-parallel-agents` is vendored for ad-hoc use.

**A `/vibe` skill.** A loop-shaped sibling to autopilot — build a slice, run
it, look, next slice, in place, no worktree, no PR — is a real and distinct
shape. Autopilot is a *pipeline* and its weight is correct for its job: review
and fix phases exist because nobody watched, and the draft PR exists because
the work must survive absence. Trimming autopilot would not produce a vibe
tool; it would produce an autopilot that ships unreviewed work.

Deferred because the routing table already has a cell for it — this session, no
artifact, no gates. **Revisit when that cell demonstrably feels heavy in
practice.** The annoyance is a better spec than a guess.

**Replacing the ledger with the native task list.** Worth doing, but it adds
divergence to the file most likely to be rewritten upstream. Revisit once the
execution loop has run enough to trust.

## Packaging

Everything lands in `clankit-dev`. Splitting is deferred, not rejected.

`brainstorming` is domain-independent by design and worth sharing with people
who do not write software, which argues for its own installable unit — a
non-developer should not receive a hook-injected preamble about repositories,
subagents, and test suites in every session. Skills that never fire cost
nothing; an injected bootstrap is paid unconditionally.

That split is deferred because nobody else installs these yet, and moving a
skill directory plus a marketplace entry is cheap. The patch that makes it
possible is already in the design: brainstorming ending with a question rather
than a fixed terminal is what lets it stand alone. With the flow installed, the
question consults the routing table; without it, the question degrades to
"should this be written down?" and stops.

**The bootstrap names capabilities, not skills** — "hand it off and walk away,"
not `autopilot`. A skill reference that crosses a plugin boundary dangles when
that plugin is absent, and this keeps the split available later at no cost.

## Build order

1. `bootstrap` and the hook — nothing routes without it
2. `brainstorming`, patched — the entry the bootstrap points at, including the
   neutralization pass
3. Vendor the verbatim set; rewire `systematic-debugging`
4. `writing-plans`, patched — the reduced format
5. `executing-plans` — absorbing the subagent loop; the largest piece
6. Adjust `autopilot` to accept a design or plan as input
7. `NOTICE`, `MAINTENANCE.md`

Steps 1–2 are usable on their own, and 1–4 give design, routing, and a written
plan with execution still falling back to whatever is installed.
