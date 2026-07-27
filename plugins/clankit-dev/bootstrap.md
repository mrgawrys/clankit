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

## Routing — after a design is approved

Ask two questions. Infer the third.

**1. Who does the work next, and where?** This decides what gets written down:
an artifact earns its place only when the writer and the reader are different
contexts.

| Next | Write |
|---|---|
| You, here, now | Nothing. The design is already in context |
| You, in a fresh session after clearing | Spec — plus a plan when task order matters |
| Subagents, unattended — hand it off and walk away | Nothing |
| Nobody — the design *was* the deliverable | The doc, if it's worth keeping. Stop |

**2. Gates?** Independent of everything else. Per-task diff review, one
approval up front, or none. Full rigor with zero gates is normal.

**3. Rigor — infer it, never ask.**

- Code, in a repo with tests → tests, in the repo's idiom
- Hard to verify by test (UI, visual, external systems) → a named verification run
- Prose, skills, config, or anything that isn't code → read it back or check the
  behavior; write no tests

Testing and verification are different. Don't write a test where a verification
run is what's wanted.

## Skills

Invoke a skill when one covers the task; announce it and follow it. CLAUDE.md
and direct requests outrank skills; skills outrank your defaults.

A plan file names the skill that runs it. When you open one, come back here —
the routing questions apply again.
