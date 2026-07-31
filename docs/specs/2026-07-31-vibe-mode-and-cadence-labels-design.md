# Vibe Mode and Cadence-Named Labels — Design

> **To act on this design:** pick a mode — *vibe* (inline, no machinery),
> *review each task* (per-task diffs), *review at the end* (delegated, reviewed
> per task), or *plan first* (`writing-plans`, then how it gets built).
> Unattended end-to-end is `/autopilot`. Ask the user which; don't pick for
> them.

## The problem

Two defects surfaced in the same session, both traced to the routing menu in
`plugins/clankit-dev/bootstrap.md`.

**The labels don't do what the flow says they do.** `bootstrap.md` claims "the
labels name the user's review cadence" — but *All at once* names run-shape, not
cadence, which is exactly why it reads as the light option when it is the
thorough path. The flow already carries a warning sentence compensating for the
label. A label that needs a warning is the wrong label.

**There is no light path out of the junction.** Handing over a spec routes past
triage's "small and unambiguous → just do it" row by construction, and every
menu answer buys machinery: subagents, ledgers, task-list approval, or per-task
diffs. A user who wants small work vibe-coded — built inline, right now, no
process — had to name four pieces of internal machinery to waive them. The menu
is hard-capped at four (`AskUserQuestion`), so the missing mode can't simply be
appended.

## The design

### Names: labels say cadence, parentheticals say cost

| Old | New |
|---|---|
| All at once | **Review at the end** |
| In batches | **Review each task** |

Menu labels carry an effort/quality parenthetical; descriptions keep naming the
machinery. The menu becomes, lightest first:

1. **Vibe** *(minutes, no safety net)* — built inline right now; no subagents,
   no ledger, no review; you eyeball the result
2. **Review each task** *(your time, quality = your eyes)* — built in this
   session; you approve each task's diff — you're the reviewer
3. **Review at the end** *(slow, thorough)* — subagents build it task by task,
   each task reviewed and fixed; you see the finished branch
4. **Plan first** *(adds a reviewable plan file)* — `writing-plans` writes the
   plan, then asks how it gets built

With labels finally naming cadence, the "reads lighter than it is" warning
sentence retires — the parenthetical does its job. The menu is now a clean
gradient of the user's attention, every row attended.

### Vibe is a mode and a skill

A new one-screen skill, `plugins/clankit-dev/skills/vibe/SKILL.md`,
user-invocable as `/vibe`. Its whole job is suppression: build inline from
whatever is held (spec, plan, or bare ask), no subagents, no ledger, no
plan-workspace, no derived-task-list approval, no dispatched reviews. Commit as
you go, stop only when blocked or done, report what was built and how to check
it. Repo hard gates still bind — CLAUDE.md outranks skills already; vibe skips
process, never rules.

### Autopilot leaves the menu, not the flow

Vibe needs a seat and `AskUserQuestion` caps the menu at four. The seat comes
from *autopilot*, not *plan first*: nobody discovers unattended in a menu —
`/autopilot` arrives already decided, has always been a typed entrance, and
answers both halves (plan file and gates) by itself. *Plan first*, by contrast,
is a judgment call the recommendation line can guide, which is what menus are
for. It keeps its seat and stays a prefix: `writing-plans` ends by asking how
the build gets gated — *Review at the end / Review each task / Hand it off*.

So the typed route stays visible, the question line names it:

> Which mode? (unattended end-to-end is also an option — type /autopilot)

## The edits

| File | Change |
|---|---|
| `bootstrap.md` | Routing table gains the Vibe row and drops *Autopilot*; labels renamed; descriptions gain parentheticals; the question line names the typed `/autopilot` route; Gates section renamed. |
| `skills/vibe/SKILL.md` | New. One screen. |
| `brainstorming/SKILL.md` | Menu table and spec-header template take the new four; rationale sentence about "all at once" retires. |
| `writing-plans/SKILL.md` | "Two modes call for one" rewritten for the typed route; plan header template and Handoff table take the new names. |
| `executing-plans/SKILL.md` | Handle sweep — spec route, weld paragraph, Gates table. Vibe never reaches this skill. |
| `MAINTENANCE.md` | Handle sweep plus a note recording this change, so a tidy-up doesn't re-seat *plan first* or drop Vibe's slot. |
| `docs/specs/2026-07-29-…` | Untouched — historical record. |

## Verification

Prose and skills — read-back and greps, no tests.

1. `grep -rniE "all at once|in batches" plugins MAINTENANCE.md` returns nothing
   (historical specs excluded).
2. Read the four edited skills end to end; handles must read naturally.
3. The vibe skill fits one screen and adds no artifact, question, or gate.
