# Advisor — Design

> **To act on this design:** pick a mode — *vibe* (inline, no machinery),
> *review each task* (per-task diffs), *review at the end* (one subagent
> builds, one review at the end), or *plan first* (`writing-plans`, then how it gets built).
> Ask the user which; don't pick for them.

## The problem

A running planner or builder decides alone in exactly the places where a second
opinion is worth most.

- **Nobody is answering.** Under `/autopilot`, or after the user says they are
  stepping away, every question that would have gone to the user is answered by
  the agent that asked it. The decision report tells the user afterwards where
  their judgment was substituted; nothing checks the substitute at the time.
- **The decision is hard.** A planner at a fork the spec doesn't settle picks
  one and writes it into the plan. A builder at the same fork must stop and
  return `BLOCKED`, because its brief forbids guessing.

The advisor gives both a way out: dispatch one high-effort agent on the most
capable model, hand it the question, and get a ruling back.

## What gets built

Two new files, five short edits to existing skills, and documentation updates
in three files.

### The advisor

`plugins/clankit-dev/agents/advisor.md`, dispatched as
`clankit-dev:advisor`. Its frontmatter, exactly:

```yaml
name: advisor
model: fable
effort: high
tools: Read, Grep, Glob, Bash
```

plus a `description` saying it rules on one hard decision for a running planner
or builder.

This file is the only place the change names a model or an effort. `effort` is
settable only in an agent definition — the `Agent` tool takes a model per call
but no effort — so a definition file is the only way to deliver "high".

The body instructs the advisor to:

- Rule on exactly one question per call.
- Read the paths the brief names — spec, plan, code — itself, and not rely on
  the caller's summary of them.
- Inspect, never change: no edits, no commits, no command that writes. `Bash`
  is granted for reads such as `git log` and `git diff`; read-only rests on
  this instruction, not on the tool list.
- Spawn no subagents.
- Answer with an option the caller did not list when that option is better.
- Refuse to rule on permission. Asked whether an action may be taken, it
  answers that the question is the user's.

**The reply**, fixed, about fifteen lines:

| Field | Content |
|---|---|
| **Ruling** | The option it picks |
| **Confidence** | `clear` or `unclear`. When `unclear`, the ruling is its lean |
| **Why** | The deciding reason, a few sentences |
| **Cheapest to undo** | Which option costs least to reverse |
| **What would settle it** | When `unclear`: the missing fact, and whether only the user could supply it |

Two values of confidence, not three: a middle value would become the default
answer and carry no signal.

### The protocol

`plugins/clankit-dev/skills/advisor/SKILL.md` holds the rules every caller
shares. The skill and the agent share a name; one loads through the Skill tool,
the other dispatches through the `Agent` tool. The other skills point at it and restate none of it.

**The agent's own calls.** Ask the advisor when one of these holds; otherwise decide
alone:

- Two or more viable approaches that the spec or plan does not settle and that
  differ in downstream cost.
- A choice that is expensive to reverse.
- A builder blocked on a reasoning or architecture problem.

Taste, naming, and anything a quick read of the code answers are not triggers.
There is no cap on advisor calls per run.

**Questions that were the user's.** The bar is unchanged — a question the agent
would have asked the user. Who answers depends on where the user is:

| The user is | Meaning | What happens |
|---|---|---|
| **Present** | Any session not covered below | Ask the user. The advisor never answers in the user's place. |
| **Reachable** | A delegated build with no gates (*review at the end*), outside autopilot | Ask the advisor first. A `clear` ruling proceeds. |
| **Away** | The whole of an `/autopilot` run; or from the moment the user says they will not be answering until their next message | The advisor stands in. A `clear` ruling proceeds. |

Away is never inferred from silence, elapsed time, or a mode other than
autopilot. When a user who is away also has a reachable-tier build running,
away governs.

**An `unclear` ruling**, whoever's question it was:

- **Present or reachable:** ask the user when "what would settle it" says only
  they can supply the missing fact. Otherwise proceed on the lean.
- **Away:** proceed on the lean when the choice is cheap to undo, and list it
  first in the decision report as decided without confidence. Stop when the
  choice is hard to reverse or outward-facing.

**Judgment, not authority.** The advisor stands in for the user's judgment
on design and scope. It never grants permission:

- Anything the user's standing instructions put behind confirmation stays
  there in every tier — destructive or hard-to-reverse actions, merging,
  posting comments.
- Existing stop conditions are untouched. A load-bearing review finding still
  stops `executing-plans`; autopilot's abort list still applies.
- Questions about the user's own involvement — which mode, which gates — are
  never go to the advisor. A user who says they are away before choosing a mode gets
  a *review at the end* build.

**The brief.** The caller writes:

- the question, in one sentence
- the options, stated neutrally
- the paths to read
- what is already decided
- what depends on the answer

The caller withholds its own lean. An advisor handed a preferred answer tends
to return it confirmed.

**If you are a builder subagent.** Only the own-call triggers apply. A builder
cannot know where the user is, so a question that was the user's goes back to
the controller as `BLOCKED` or `NEEDS_CONTEXT`, as today. A nested call returns
in the background: wait for the ruling before acting on the decision. If the
call fails, return `BLOCKED` with the question and the controller asks the advisor.

**If the controller's own call fails**, treat it as an `unclear` ruling with no
lean: present or reachable, ask the user; away, decide alone if the choice is
cheap to undo and record "advisor unavailable", otherwise stop.

**Recording.** Every advisor call leaves one line — question, ruling,
confidence:

| Caller | Record |
|---|---|
| Planner | In the plan, as a Constraint on the task it governs, marked `advisor ruling, <confidence>`, with its reason; under autopilot, the orchestrator lifts the marked Constraints into the decision report |
| Builder | An `## Advisor rulings` section in `build-report.md`; the controller reads it before the workspace is deleted and carries it into its final report |
| Controller, autopilot | The final report or the decision report, `unclear` rulings first |

### Edits to existing files

| File | Change |
|---|---|
| `plugins/clankit-dev/bootstrap.md` | "Gates are questions" gains the away stance: once the user says they will not be answering, and until their next message, gates go to the `advisor` skill's away tier. The bootstrap loads in every session, so this is the stance's only session-wide home. |
| `skills/writing-plans/SKILL.md` | A short "Hard decisions" passage: when a trigger holds during the repo pass or task design, ask the advisor, and record the ruling as a Constraint marked `advisor ruling, <confidence>`. |
| `skills/executing-plans/SKILL.md` | Four spots. "Finish" reads `## Advisor rulings` from the build report before deleting the workspace and lists the rulings in its report. In "Handle the return", a `BLOCKED` for a reasoning problem gets an advisor ruling before any re-dispatch. The two "your human partner's call" passages — a wrong plan, and plan-mandated findings — go through the tiers. "Running inline" gains the own-call triggers. Integration at "Finish" stays the user's decision, unchanged. |
| `skills/executing-plans/implementer-prompt.md` | "STOP and escalate" on an unsettled architectural decision becomes "ask the advisor first": invoke the `advisor` skill, call the advisor, record the ruling, carry on. A failed call, or a question that was the user's, still returns `BLOCKED` or `NEEDS_CONTEXT`. The report format gains `## Advisor rulings`. |
| `skills/autopilot/SKILL.md` | Its would-be-user questions go to the advisor. The decision report lists the advisor's rulings with their confidence, `unclear` first — the builder's from the `executing-plans` report, the planner's lifted from the plan's marked Constraints. The claim that subagents cannot spawn subagents is removed — see Decisions. |

Documentation: a row each for the `advisor` skill and the `advisor` agent in the root
`README.md` skills table; a line in `plugins/clankit-dev/README.md` naming
`agents/advisor.md` as the file to edit for a different model or effort;
and an intent note in `MAINTENANCE.md` for the patches to the vendored
`writing-plans` and `executing-plans`, so a future re-sync re-applies them.

## Decisions

- **The builder calls the advisor itself.** A probe on 2026-09-30 confirmed
  a subagent holds the `Agent` tool and a nested call returns. The alternative
  — only the controller calls the advisor, the builder stops with a new return status
  and is resumed — costs a round trip per call, adds a status and a
  continuation step to `executing-plans`, and tempts a builder to guess
  instead of stopping. It survives as the fallback, through the existing
  `BLOCKED` path.
- **Autopilot's orchestrator still dispatches every phase.** Only the stated
  reason changes: it owns the worktree and passes each phase's output forward.
- **The builder loads the protocol by invoking the skill.** Pasting it into
  the implementer prompt would make two copies to keep in sync.
- **`Bash` for the advisor**, so it can read history itself. The cost is
  that read-only is an instruction, not a guarantee.
- **Prose-only was rejected** — a paragraph per skill telling the agent to
  dispatch the most capable model. It cannot set effort and repeats the
  protocol in four places.

## Out of scope

- `vibe`: its premise is no machinery.
- `brainstorming`: a conversation with the user by definition.
- A cap or budget on advisor calls.

## Verification

Prose and configuration: behavior checks, no tests. Run each once during the
build.

**The advisor works as defined.**

- After the plugin reloads, `clankit-dev:advisor` appears in the agent
  list, and the `advisor` skill in the skill list: the shared name resolves
  in both.
- A sample brief returns all five reply fields.
- A builder-shaped subagent invokes the `advisor` skill, calls the advisor by
  nested call, waits, and receives the ruling.

**The rules hold.** Five scenarios, each against a fresh subagent holding the
edited skills, run as `writing-skills` prescribes:

| Scenario | Expected |
|---|---|
| The user is present and the question was theirs | Asks the user; does not call the advisor |
| An own-call trigger holds | Calls the advisor; the brief carries no lean |
| A naming choice | Decides alone |
| Away, ruling `unclear`, choice hard to reverse | Stops |
| Away, ruling `clear`, action needs the user's confirmation | Does not act |

**One constraint.** Outside this spec, the change names a model only in
`agents/advisor.md`.

## Known gaps

- What happens when the pinned model is unavailable to an account is
  undocumented. The README line tells such a user which file to edit.
- Effort cannot be observed from outside a run. The check confirms the key is
  set and the dispatch succeeds, not that high effort was applied.
