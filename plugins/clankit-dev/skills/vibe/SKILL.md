---
name: vibe
description: "Use when the user wants something built right now with no process — quick and dirty, inline in this session. Trigger on \"/vibe\", \"vibe it\", \"just build it\", \"quick and dirty\", or when the routing menu's vibe answer is picked. Builds straight from a spec, a plan, or a bare ask; commits as it goes; the user eyeballs the result."
user_invocable: true
---

# Vibe

Build it now, in this session, and stop when it works.

**Announce at start:** "Vibing it — inline, no machinery."

## What this means

- Work straight from whatever you hold — a spec, a plan, or the ask itself.
  Enough is decided to start; start.
- **No machinery.** No subagents, no ledger, no plan workspace, no briefs, no
  derived task list shown for approval, no dispatched reviews — per-task or
  final. The user reviews by looking at the result.
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

## Finish

Report what was built, how you verified it, and what to look at — a command to
run, a page to open, a diff to skim. Nothing else survives this mode, so the
report is the handoff.

## Not for

Work someone else picks up later (nothing durable is written — that's the
point), or changes that deserve a reviewer that didn't write them. Those take a
heavier mode; say so instead of vibing them.
