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
| **Vibe** | no | none — you eyeball the result | `vibe` — here, or one subagent; it asks |
| **Review each task** | no | per-task diff | `executing-plans` inline |
| **Review at the end** | no | none | `executing-plans` from the spec |
| **Plan first** | yes | asked once the plan exists | `writing-plans`, then the build question |

**Labels name the user's review cadence and carry an effort parenthetical; the
descriptions name the machinery.** Each option states who builds, who reviews,
and what the user sees, roughly:

- *Vibe (minutes, no safety net)* — "built right now, here or by one subagent;
  no ledger, no review; you eyeball the result"
- *Review each task (your time, quality = your eyes)* — "built in this session;
  you approve each task's diff — you're the reviewer"
- *Review at the end (slow, thorough)* — "subagents build it task by task, each
  task reviewed and fixed; you see the finished branch"
- *Plan first (adds a reviewable plan file)* — "a plan file gets written first,
  then the same choice about how it gets built"

The question line keeps the typed route visible:
"Which mode? (unattended end-to-end is also an option — type /autopilot)"

**Nothing to build** — an essay, a decision, a document — means the spec *is*
the deliverable. Skip the menu and suggest what could come next.

**Autopilot is a typed route, not a menu answer.** `AskUserQuestion` caps the
menu at four, and Vibe took a seat — the one nobody discovers from a list.
`/autopilot` arrives already decided, runs unattended (plans, builds, reviews
its own work in a worktree, opens a draft PR), and answers both halves — plan
file and gates — asking nothing. The question line above is what keeps it
visible.

**Plan first is a prefix, not a peer.** It answers what gets written, not how it
gets built. Once the plan exists, ask the second question — *Review at the end /
Review each task / Hand it off* — and, unless they hand it off, build from the
plan.

**Typing a skill answers that skill's question and no other.**
`/writing-plans` means "I want a plan file": the artifact, not the gates.
`/autopilot` is the one exception, because unattended answers both.

**Say the action, not the name.** The four names are option labels — in the menu,
and in the artifact headers that stand in for it. Nowhere else. In running prose,
say what will happen — "I'll write the plan first, then ask how you want it
built" — never "we're in plan-first mode". Nobody outside this file knows what
that means, which goes for every skill `description:` too, since those show up in
the skill list.

## Gates are questions

A gate is a question you ask, not a decision you announce with a window to
object. "Flag if you disagree", "shall I proceed?", "let me know if that's
wrong" are the same move: you already chose, and offered a veto instead of a
choice. If you catch yourself writing one, you skipped a step — go back and ask.

An answer to one question does not close another. A preference about *where* the
work happens — a worktree, a branch, a repo — says nothing about which mode, and
nothing about gates.

**Gates belong to whoever is about to build.** A build with no gate decision
behind it asks for one before task 1: *Review at the end* or *Review each task*.
`writing-plans` asks when its plan is finished, and adds *Hand it off* — it
holds a plan file worth handing over. `executing-plans` asks when it holds a
spec or plan that no menu answer stands behind, and offers no hand-off:
reaching it means the work gets built.

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
