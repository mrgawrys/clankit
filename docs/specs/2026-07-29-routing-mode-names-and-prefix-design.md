# Routing Modes: Names and the Plan-First Prefix — Design

> **To act on this design:** pick a mode — *all at once*, *in batches*, *plan
> first* (`writing-plans`, then a second question about how it gets built), or
> *autopilot*. Ask which; don't pick on the reader's behalf.

## The problem

The routing menu in `plugins/clankit-dev/bootstrap.md` labels its four modes
A, B, C and D. The letters exist only in that file, which the user never reads.
They leak anyway — an observed session opened with:

> Since you invoked /writing-plans, we're in Mode C — I'll produce a plan file
> from this spec.

A plugin user has no way to know what Mode C is. The letters are also carried in
skill text a user *can* see: `autopilot`'s description says "Routing mode D",
and `executing-plans`' says "(routing modes A and B)". Both surface in the skill
list.

Behind the naming sits a second defect. The four modes answer two questions at
once — does the work get a plan file, and how is the build gated — and they
cover only four of the six combinations:

```
                       gates on the build
                  none    per-task    unattended
plan   no    │  all at once │ in batches │     —
file   yes   │      —       │     —      │  autopilot
             │        └── "plan first" sits here with the
                           gate question left unanswered
```

`writing-plans` can therefore only describe its own mode as "write the plan,
then hand off **or** execute" — an unanswered question that nobody asks. A user
who wants a plan *and* per-task diffs has no way to say so, and
`/executing-plans` handed a bare spec asks about gates nowhere at all.

Two constraints bound any fix:

- **`AskUserQuestion` allows at most four options.** A fifth named mode cannot
  join the menu.
- **`MAINTENANCE.md:56` forbids decomposing the menu into axes.** An earlier
  revision made routing a table of artifact × gates; it regressed, because a
  table gets consulted silently while a menu gets asked out loud.

## The design

### Names

Four handles replace the letters: **All at once**, **In batches**,
**Plan first**, **Autopilot**.

| Where | Rule |
|---|---|
| `AskUserQuestion` option labels | The handles, verbatim. The only place a user meets them. |
| Prose spoken to the user | Name the action, never the mode. "I'll write the plan first, then ask how you want it built." |
| Skill files, agent-facing | Handles serve as cross-references — *in batches*, *plan first*. |
| Skill `description:` frontmatter | No mode vocabulary at all. Descriptions surface in the skill list. |

The follow-up question reuses the handles, so a returning user recognises them.

### Plan first is a prefix, not a peer

The upfront menu keeps four answers. *Plan first* writes the plan and then asks
a second, narrower question — *All at once / In batches / Hand it off* — which
fills the empty cells without adding a fifth mode.

| Mode | Plan file | Gates | Runs as |
|---|---|---|---|
| **All at once** | no | none | `executing-plans` from the spec |
| **In batches** | no | a diff per task | `executing-plans` inline |
| **Plan first** | yes | asked once the plan exists | `writing-plans`, then the build question |
| **Autopilot** | yes | none — it reviews its own work | `autopilot`, unattended, draft PR |

```
spec approved ─┬─ All at once ──→ executing-plans, no gates
   or opened   ├─ In batches ───→ executing-plans, diff per task
               ├─ Plan first ───→ writing-plans ──→ "how should this get built?"
               │                                     ├─ All at once
               │   /writing-plans lands here too ────┤─ In batches
               └─ Autopilot ────→ autopilot          └─ Hand it off (stop)
                   /autopilot lands here, asks nothing
```

Two rules carry the shape:

**Gates belong to whoever is about to build.** A build that starts without a
gate decision asks for one first — *All at once / In batches / Hand it off*.
`writing-plans` asks it when the plan is done; `executing-plans` asks it when it
holds a spec or a plan that no menu answer stands behind.

**Typing a skill answers that skill's question and no other.**
`/writing-plans` means "I want a plan file". It settles the artifact and leaves
the gates open. `/autopilot` is the one exception: unattended answers both, which
is the whole point of it.

## The edits

| File | Change |
|---|---|
| `bootstrap.md` | Table rows take the handles; *Plan first*'s Gates cell becomes "asked once the plan exists". Add both new rules and the vocabulary table above. |
| `brainstorming/SKILL.md` | Menu table (:182) and reference (:139) take the handles. The dot node `Ask which mode\n(A / B / C / D)` names them instead. The spec header block it prescribes matches the handles. |
| `writing-plans/SKILL.md` | :25-27 take the handles. **:29 changes meaning:** it currently bounces the user back to the menu when they arrive without having picked C or D; arriving via `/writing-plans` is now itself the answer, so the bounce goes. `## Handoff` gains the build question as an `AskUserQuestion` call. |
| `executing-plans/SKILL.md` | Description drops "(routing modes A and B)"; :14-19 take the handles. `## Gates` currently says to *confirm* which gate applies — a gate announced rather than asked. It becomes an `AskUserQuestion` call with the same three answers. |
| `autopilot/SKILL.md` | Description drops "Routing mode D."; :13 and :78 say what autopilot does rather than which letter it is. |
| `home/CLAUDE.md` | :83-85 take the handles. |
| `MAINTENANCE.md` | :126 and :162 take the handles, plus a note recording why *plan first* is a prefix — otherwise the next tidy-up collapses it back. |
| `docs/specs/2026-07-27-…` | Untouched. It records what was decided then, and the maintenance notes lean on that history. |

## Verification

Prose and skills, so no tests — a read-back and one named run.

1. `grep -rniE "mode[s]? [a-d]\b" plugins home MAINTENANCE.md` returns nothing.
2. Read the four skills end to end. The handles must read naturally in
   cross-references rather than like letters wearing costumes.
3. **Named run:** in a fresh session, invoke `/writing-plans` against a spec. It
   passes when the plan gets written and the session ends by asking how the
   build should be gated. Any sentence naming a mode letter fails it.
