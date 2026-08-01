---
name: vibe
description: "Use when the user wants something built right now with no process — quick and dirty, in this session or handed to a single subagent. Trigger on \"/vibe\", \"vibe it\", \"just build it\", \"quick and dirty\", or when the routing menu's vibe answer is picked. Builds straight from a spec, a plan, or a bare ask; commits as it goes; the user eyeballs the result."
user_invocable: true
---

# Vibe

Build it now and stop when it works.

## First — here or elsewhere?

Ask this before anything else, every time, with one `AskUserQuestion`:

| Answer | What happens |
|---|---|
| **Build it here** | you build it, in this session |
| **Hand off — capable** | one subagent, most capable model, high effort |
| **Hand off — cheap** | one subagent, mid-tier model, standard effort |

Recommend from the context budget, don't gate on it: the turn carries a
`Context: X tokens used` line, and past ~100K a handoff is the recommended
answer — the alternative is spending a degrading window on file reading. Below
that, building here is recommended. Either way the user picks.

Every route into vibe gets this question — typed `/vibe`, "just build it", or
the menu's vibe answer.

**Announce after the answer:** "Vibing it — inline, no machinery" if building
here, "Vibing it — handed to a subagent, no machinery" if not.

## What this means

- Work straight from whatever you hold — a spec, a plan, or the ask itself.
  Enough is decided to start; start.
- **No machinery.** No ledger, no plan workspace, no derived task list shown for
  approval, no dispatched reviews — per-task or final. The user reviews by
  looking at the result. A handoff is one subagent doing all of the above work,
  not a loop; it buys context, not safety.
- **Commit as you go.** Small commits at each working step; they are the only
  trail this mode leaves.
- Verify the cheapest honest way: run the thing, or run the tests the change
  touches. Write new tests only where the repo's conventions clearly expect
  them — this mode skips process, not correctness.
- Repo rules still bind. CLAUDE.md outranks skills; a migration gate or a
  formatter rule is not process to skip. Quick and dirty is exactly the mood
  that talks itself past those — don't.
- Don't stop to ask "should I continue". Stop only when genuinely blocked, or
  done.

## If it was handed off

One subagent, dispatched once, at the tier the user picked. Its brief carries:

- the spec or plan path if one exists — otherwise the ask, written out in full,
  since the subagent cannot see this conversation
- the repo path; it works in the **current workspace**, not a worktree. Only the
  reading moves elsewhere, not the files.
- everything under "What this means" above, verbatim. Those rules are the mode;
  the subagent is running the mode, so it needs them.

Relay its report. Do not re-read the diff to summarize it — that is the context
burn the handoff existed to avoid.

**A handed-off vibe is still an un-reviewed build.** The subagent wrote the code
and nobody checked it. If it dies halfway there are commits and no map. That is
the deal vibe already offers inline; a handoff changes whose context does the
work, not what safety the mode provides. Never sell it as a lighter *review at
the end*.

## Finish

Report what was built, how you verified it, and what to look at — a command to
run, a page to open, a diff to skim. Nothing else survives this mode, so the
report is all the user gets.

## Not for

Work someone else picks up later (nothing durable is written — that's the
point), or changes that deserve a reviewer that didn't write them. Those take a
heavier mode; say so instead of vibing them.
