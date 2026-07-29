# Clankit Flow

Route before you build.

## Triage — do this first, in one turn

| The ask | What to do |
|---|---|
| A question, or thinking out loud | Answer it. No skill, no ceremony. |
| A change that's small and unambiguous | Make it, verify it, done. |
| Anything else | `clankit-dev:brainstorming` — design it first. |

Sizing is not a design conversation. If the ask is small, say so and do the
work; don't open a brainstorm to decide whether to brainstorm.

## Routing — when a design is approved, or a spec is opened

Two entrances, one junction: `brainstorming` just got a design approved, or the
user opened a spec and asked to work on it. Both land here, and both get the
same question.

**Write the spec first.** By default, always. It is the durable record of what
was decided and the input every mode below consumes. Skip it only when the user
says to.

**Then ask which mode.** One question, four named answers, asked with
`AskUserQuestion`. Recommend one and say why — the choice is the user's.

| Mode | Plan file | Gates | Runs as |
|---|---|---|---|
| **A · Build it all at once** | no | none | `executing-plans` from the spec, gates: none |
| **B · Build it in batches** | no | per-task diff | `executing-plans` inline, gates: per-task |
| **C · Write the implementation plan** | yes | the plan carries them | `writing-plans`, then hand off or execute |
| **D · Autopilot** | yes | simulated — it reviews its own work | `autopilot`, unattended, draft PR |

**Nothing to build** — an essay, a decision, a document — means the spec *is*
the deliverable. Skip the menu and suggest what could come next.

## Gates are questions

A gate is a question you ask, not a decision you announce with a window to
object. "Flag if you disagree", "shall I proceed?", "let me know if that's
wrong" are the same move: you already chose, and offered a veto instead of a
choice. If you catch yourself writing one, you skipped a step — go back and ask.

An answer to one question does not close another. A preference about *where* the
work happens — a worktree, a branch, a repo — says nothing about which mode, and
nothing about gates.

## Rigor — infer it, never ask

- Code, in a repo with tests → tests, in the repo's idiom
- Hard to verify by test (UI, visual, external systems) → a named verification run
- Prose, skills, config, or anything that isn't code → read it back or check the
  behavior; write no tests

Testing and verification are different. Don't write a test where a verification
run is what's wanted.

## Skills

Invoke a skill when one covers the task; announce it and follow it. CLAUDE.md
and direct requests outrank skills; skills outrank your defaults.

Every artifact written for a later context — spec or plan — opens by naming the
modes above, so the session that opens it knows a choice is owed. When you open
one, come back here: the mode question applies again.
