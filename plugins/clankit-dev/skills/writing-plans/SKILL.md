---
name: writing-plans
description: "Use when a design is approved and the work has to cross a context boundary - a fresh session, a subagent, or another person. Produces right-sized tasks carrying units, interfaces, constraints and acceptance bars. Not a transcript of the code."
---

# Writing Plans

## Overview

Write for a capable implementer who cannot see what you can see.

They can write good code and design good tests. What they cannot do is guess
the decisions already made, the names their neighbours will call, or the exact
values the spec pinned down. Give them those. Leave the implementation to them.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>.md`
- (User preferences for plan location override this default)

## First: does this need a plan at all?

A plan exists because the work crosses a context boundary — a fresh session
after clearing, a subagent, someone who wasn't in the design conversation. Two
routing modes call for one: **C** (write the plan, then hand off or execute) and
**D** (autopilot, which runs it unattended). Modes A and B build straight from
the spec and want no plan file at all.

So if you got here without the user picking C or D, stop and ask which mode —
the plan is the artifact they may have been trying to avoid.

**The plan is not the code.** An implementer handed the finished implementation
is a transcriber, and writing it spent the orchestrator's context — the very
thing delegation exists to protect. A plan that contains every line is a plan
whose author did the work in the wrong place.

## Scope Check

If the spec covers multiple independent subsystems, it should have been broken
into sub-project specs during brainstorming. If it wasn't, suggest breaking this
into separate plans — one per subsystem. Each plan should produce working,
testable software on its own.

## File Structure

Before defining tasks, map out which files will be created or modified and what
each one is responsible for. This is where decomposition decisions get locked in.

- Design units with clear boundaries and well-defined interfaces. Each file
  should have one clear responsibility.
- You reason best about code you can hold in context at once, and your edits are
  more reliable when files are focused. Prefer smaller, focused files over large
  ones that do too much.
- Files that change together should live together. Split by responsibility, not
  by technical layer.
- In existing codebases, follow established patterns. If the codebase uses large
  files, don't unilaterally restructure — but if a file you're modifying has
  grown unwieldy, including a split in the plan is reasonable.

This structure informs the task decomposition.

## Task Right-Sizing

A task is the smallest unit that carries its own test cycle and is worth a fresh
reviewer's gate. When drawing task boundaries: fold setup, configuration,
scaffolding, and documentation steps into the task whose deliverable needs them;
split only where a reviewer could meaningfully reject one task while approving
its neighbor.

Each task ends with an independently testable deliverable and a commit. Prefer
more, smaller commits over one at the end — a task that can't be committed on
its own is either two tasks or none.

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **To execute this plan:** use the `executing-plans` skill. It reviews the plan,
> then asks whether to run delegated (a subagent per task) or inline.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

## Global Constraints

[The spec's project-wide requirements — version floors, dependency limits,
naming and copy rules, platform requirements — one line each, with exact
values copied verbatim from the spec. Every task's requirements implicitly
include this section.]

---
```

## Task Structure

````markdown
### Task N: [Name]

**Units** — what this creates or changes, one line each: name plus what it's
responsible for. Altitude is whatever the language calls for — a module, a
context, a class, a single function, a hook.

**Interacts** — how those units talk to each other and to existing code. What
crosses each boundary.

**Signatures** — exact names and types later tasks depend on, verbatim. A task's
implementer sees only their own task; this is how they learn the names their
neighbours use.

**Constraints** — exact values, and the design decisions that are easy to get
wrong.

**Done when** — the acceptance bar, and how it gets checked (see Rigor below).
````

Worked example:

````markdown
### Task 3: Rate limiter

**Units:** `Limiter` — decides whether a key may proceed right now.
**Interacts:** the request middleware calls it once per inbound request;
nothing else touches it.
**Signatures:** `class Limiter { constructor(o: {max: number, windowMs: number}); allow(key: string): boolean }`
**Constraints:** sliding window, not fixed — a fixed window lets 2× through at
the boundary. Keys are tenant ids and unbounded, so entries must be evicted.
**Done when:** over-limit requests rejected, the window slides, eviction covered.
Tests in the repo's idiom. Commit.
````

## Rigor: what "done when" asks for

Testing and verification are different things. A test is durable and re-runs; a
verification is a one-time check that the thing works. Ask for the one the work
actually admits:

- **Code in a repo with tests** → tests, in the repo's idiom
- **Hard to verify by test** (UI, visual output, external systems) → name the
  verification: the command to run, what to look at, what "right" looks like
- **Prose, skills, config** → check the behavior or read it back. No tests.
  Asserting that a file contains a string counterfeits falsifiability — the
  observable is behavior, never text.

Never ask for "appropriate tests" on something that can't be tested, and never
accept an assertion of success in place of a verification nobody ran.

## What earns a code block

Usually nothing. Sometimes one block in a whole plan.

**The rule: you must be able to name what specifically breaks without it.** A
state machine's transition table, a non-obvious regex, an exact SQL shape, a
protocol's byte layout — prose carries these badly and a subtle mistake is
expensive. An ordinary function body is not one of these.

If you can't name the failure, the block is a transcript, and the implementer
writes it better themselves because they can see the code around it.

## No Vagueness

Brevity is not vagueness. The plan must not hide decisions behind words:

- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases" —
  say which errors, which validations, which edges, or say nothing at all
- "Similar to Task N" — state the constraint again; tasks get read out of order
- References to types, functions, or methods that no task defines

"Sliding window, not fixed" is complete. "Handle the window correctly" is not.

## Self-Review

After writing the plan, check it against the spec with fresh eyes. This is a
checklist you run yourself — not a subagent dispatch.

**1. Spec coverage:** Skim each requirement in the spec. Can you point to a task
that implements it? Add tasks for any gaps.

**2. Type consistency:** Do the signatures and property names in later tasks
match what earlier tasks declared? A function called `clearLayers()` in Task 3
but `clearFullLayers()` in Task 7 is a bug you are shipping to an implementer
who cannot see both.

**3. Derivability:** For each task, ask what the implementer could not work out
alone. If everything in it is derivable from the codebase and the signatures,
the task is over-specified. If a decision is missing, add it.

Fix issues inline. No need to re-review.

## Handoff

The plan names `executing-plans` in its header, so the session that opens it
knows where to start. What happens now follows the mode that sent you here:
**C** hands the plan over and stops, or executes it here; **D** hands it to
`autopilot`, which runs it unattended.
