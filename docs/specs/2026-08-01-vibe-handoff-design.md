# Vibe Handoff — Design

> **To act on this design:** pick a mode — *vibe* (inline, no machinery),
> *review each task* (per-task diffs), *review at the end* (delegated, reviewed
> per task), or *plan first* (`writing-plans`, then how it gets built).
> Unattended end-to-end is `/autopilot`. Ask the user which; don't pick for
> them.

## The problem

`/vibe` builds inline, in the session that invoked it. That is the mode's
definition, and it is also its only cost: a vibe invoked at 150K tokens spends
the rest of a degrading context window reading files and writing code. The user
wanted a way to say "build this, but not in here" — and to pick how much brain
the elsewhere gets.

## What changes

Vibe opens with one question, every time. Three answers:

| Answer | What happens |
|---|---|
| **Build it here** | today's behavior, unchanged |
| **Hand off — capable** | one subagent, most capable model, high effort |
| **Hand off — cheap** | one subagent, mid-tier model, standard effort |

No threshold gates the question — it is always asked. The `Context: X tokens
used` line drives the *recommendation*, not the gate: past ~100K the recommended
answer is a handoff; below it, build here.

Both routes into vibe — typing `/vibe` and picking vibe from the mode menu —
land in the skill, so both get the question.

## The delegate

One subagent, not a loop. Its brief carries:

- the spec or plan path if one exists; otherwise the ask, written out by the
  orchestrator (the delegate cannot see the conversation)
- the repo path
- vibe's own rules verbatim: commit as you go, verify the cheapest honest way,
  repo `CLAUDE.md` still binds, don't stop to ask "should I continue"

It works in the **current workspace**, not a worktree. Vibe means the result
shows up where the user already is, and a subagent shares the filesystem, so
only the reading moves — not the files.

It returns what vibe's Finish section already asks for: what was built, how it
was verified, what to look at. The orchestrator relays that report and does not
re-read the diff to summarize it — re-reading it is the context burn the handoff
existed to avoid.

## What this does not buy

A handed-off vibe is still an **un-reviewed build**. No ledger, no per-task
review, no final review; the delegate wrote the code and nobody checked it. If
the delegate dies halfway there are commits and no map. That is the deal vibe
already offers inline — delegating changes whose context does the work, not what
safety the mode provides. The skill says this plainly so the handoff is never
mistaken for a lighter *review at the end*.

## Why only vibe

The obvious larger version — offer this handoff across the modes — collapses
under one observation: **the other modes already delegate.**

- *Review at the end* and `/autopilot` run `executing-plans` delegated. A
  subagent per task, a reviewer per task; the main loop holds reports, not code.
  Their context is already thin, and moving the orchestrator into a subagent
  would cost them the thing that makes them worth running — a subagent cannot
  reliably dispatch the per-task subagents the review loop is built from.
- *Review each task* puts the user in the loop as the reviewer. The diffs have
  to come back to the user's context regardless, so a handoff saves nothing.

Vibe is the only mode defined as building inline with no subagents. It is the
only one where the context burn is real, so it is the only one that gets the
question.

## Scope

- `plugins/clankit-dev/skills/vibe/SKILL.md` — the question, the delegate brief,
  and the un-reviewed caveat. Two existing lines need amending, since both
  currently assert something the handoff route contradicts: the announce line
  ("Vibing it — inline, no machinery") and the "No machinery" bullet ("No
  subagents"). Both become conditional on the answer — a handoff is one
  subagent, and still no ledger and no reviews.
- No change to `bootstrap.md`, `autopilot`, `executing-plans`, or
  `writing-plans`. If a second mode ever wants this rule, it moves to
  `bootstrap.md` then — that is a copy-paste, not a redesign.

## Verification

Prose, not code: no tests. Read the skill back and confirm the question fires on
both routes into vibe and that the announce line no longer claims something the
handoff route contradicts.
