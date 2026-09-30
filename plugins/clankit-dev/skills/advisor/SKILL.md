---
name: advisor
description: "Use when a planner or builder mid-run is about to decide alone - two or more viable approaches the spec or plan does not settle, a choice that is expensive to reverse, a builder blocked on a reasoning or architecture problem - or holds a question for the user during an unattended or delegated run, or after the user said they will not be answering. Not for taste, naming, or anything a quick read of the code answers."
---

# Advisor

A second opinion for the places where an agent decides alone. You dispatch the
`clankit-dev:advisor` agent with one question and get a ruling back. The skill
and the agent share a name: this skill is the protocol every caller follows,
the agent is the one that rules.

**The advisor stands in for the user's judgment, never for their authority.**
Every rule below follows from that.

## When to ask

Two kinds of decision reach this skill, and they route differently. An own
call is one you would have made without asking anyone: it goes to the advisor
wherever the user is. A question that was the user's is one you would have
stopped to ask: who answers it depends on where the user is.

### Your own calls

Ask the advisor when one of these holds; otherwise decide alone:

- Two or more viable approaches that the spec or plan does not settle and that
  differ in downstream cost.
- A choice that is expensive to reverse.
- A builder blocked on a reasoning or architecture problem.

Taste, naming, and anything a quick read of the code answers are not triggers.
There is no cap on advisor calls per run.

### Questions that were the user's

The bar is unchanged — a question you would have asked the user. Who answers
depends on where the user is:

| The user is | Meaning | What happens |
|---|---|---|
| **Present** | Any session not covered below | Ask the user. The advisor never answers in the user's place. |
| **Reachable** | A delegated build with no gates (*review at the end*), outside autopilot | Ask the advisor first. A `clear` ruling proceeds. |
| **Away** | The whole of an `/autopilot` run; or from the moment the user says they will not be answering until their next message | The advisor stands in. A `clear` ruling proceeds. |

Away is never inferred from silence, elapsed time, or a mode other than
autopilot. When a user who is away also has a reachable-tier build running,
away governs.

## Judgment, not authority

The advisor stands in for the user's judgment on design and scope. It never
grants permission, and a ruling — however `clear` — is not one:

- Anything the user's standing instructions put behind confirmation stays
  there in every tier — destructive or hard-to-reverse actions, merging,
  posting comments. With the user away, such an action waits for them; you do
  not take it.
- Existing stop conditions are untouched. A load-bearing review finding still
  stops `executing-plans`; autopilot's abort list still applies.
- Questions about the user's own involvement — which mode, which gates — never
  go to the advisor. A user who says they are away before choosing a mode gets
  a *review at the end* build.

## The brief

Invoking this skill loaded the rules; it rules on nothing. The ruling comes
from the agent, and the agent is dispatched with the `Agent` tool — not the
Skill tool — with `subagent_type: clankit-dev:advisor` and the brief as its
prompt. Pass no `model`: the agent's definition sets its model and effort, and
a model given per call would override it — this holds even inside a skill that
tells you to name a model on every dispatch. One question per call.

Write:

- the question, in one sentence
- the options, stated neutrally — what each one is, not what it is good for
- the paths to read — spec, plan, code; the advisor reads them itself
- what is already decided
- what depends on the answer

**Withhold your own lean.** An advisor handed a preferred answer tends to
return it confirmed. A lean leaks through more than "I prefer": an advantage
listed for one option and not the others is one. If a reader of the brief
could tell which option you favour, rewrite it.

## The ruling

The reply carries five fields: **Ruling**, **Confidence** (`clear` or
`unclear`), **Why**, **Cheapest to undo**, **What would settle it**. The
advisor may rule for an option you did not list.

A `clear` ruling proceeds. An `unclear` ruling is the advisor's lean, and what
you do with it depends on the tier, whoever's question it was:

- **Present or reachable:** ask the user when "what would settle it" says only
  they can supply the missing fact. Otherwise proceed on the lean.
- **Away:** proceed on the lean when the choice is cheap to undo, and list it
  first in the decision report as decided without confidence. Stop when the
  choice is hard to reverse or outward-facing: report the question and the
  lean, and leave the choice to the user.

## If you are a builder subagent

Only the own-call triggers apply. You cannot know where the user is, so a
question that was the user's goes back to the controller as `BLOCKED` or
`NEEDS_CONTEXT`, as it always has.

A nested call returns in the background. **Wait for the ruling before acting
on the decision** — do not build on either option while the call is out. If
the call fails, return `BLOCKED` with the question, and the controller asks
the advisor.

An `unclear` ruling is read by tier, and you do not know the tier. Proceed on
the lean only where every tier would: the choice is cheap to undo, and the
missing fact is not one only the user can supply. Otherwise return `BLOCKED`
with the question and the ruling, and the controller applies the tier.

## If the controller's own call fails

Treat it as an `unclear` ruling with no lean. Present or reachable: ask the
user. Away: decide alone if the choice is cheap to undo and record "advisor
unavailable"; otherwise stop.

## Recording

Every advisor call leaves one line — question, ruling, confidence:

| Caller | Record |
|---|---|
| Planner | In the plan, as a Constraint on the task it governs, with its reason; under autopilot, in the decision report as well |
| Builder | An `## Advisor rulings` section in `build-report.md`; the controller carries it forward |
| Controller, autopilot | The final report or the decision report, `unclear` rulings first |
