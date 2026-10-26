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
same question. An overview is not a spec: opening one, or starting a part of
one, takes the next section's route, never this one.

**Write the spec first.** By default, always. It is the durable record of what
was decided and the input every mode below consumes. Skip it only when the user
says to.

**Then ask which mode.** One question, four named answers, asked with
`AskUserQuestion`. Recommend one and say why — the choice is the user's.

| Mode | Plan file | Gates | Runs as |
|---|---|---|---|
| **Vibe** | no | none — you eyeball the result | `vibe` — here, or one subagent; it asks only past ~100K context |
| **Review each task** | no | per-task diff | `executing-plans` inline |
| **Review at the end** | no | none | `executing-plans` from the spec |
| **Plan first** | yes | asked once the plan exists | `writing-plans`, then the build question |

**Labels name the user's review cadence and carry an effort parenthetical; the
descriptions name the machinery.** Each option states who builds, who reviews,
and what the user sees, roughly:

- *Vibe (minutes, no safety net)* — "built right now, here or by one subagent;
  no machinery, no review; you eyeball the result"
- *Review each task (your time, quality = your eyes)* — "built in this session;
  you approve each task's diff — you're the reviewer; one machine review pass
  at the end of the whole plan"
- *Review at the end (hands-off, reviewed once)* — "one subagent builds the
  whole thing, a reviewer that didn't write it checks the finished branch;
  you see the result"
- *Plan first (adds a reviewable plan file)* — "a plan file gets written first,
  then the same choice about how it gets built"

The question line is just "Which mode?"

**Nothing to build** — an essay, a decision, a document — means the spec *is*
the deliverable. Skip the menu and suggest what could come next.

**Plan first is a prefix, not a peer.** It answers what gets written, not how it
gets built. Once the plan exists, ask the second question — *Review at the end /
Review each task / Hand it off* — and, unless they hand it off, build from the
plan.

**Typing a skill answers that skill's question and no other.**
`/writing-plans` means "I want a plan file": the artifact, not the gates.

**Say the action, not the name.** The four names are option labels — in the menu,
and in the artifact headers that stand in for it. Nowhere else. In running prose,
say what will happen — "I'll write the plan first, then ask how you want it
built" — never "we're in plan-first mode". Nobody outside this file knows what
that means, which goes for every skill `description:` too, since those show up in
the skill list.

## Overviews — when a part is started

An overview (`docs/specs/*-overview.md`, headed "This is an overview, not a
design to build from") lays out a multi-part effort; each part gets designed
when work on it starts. When the user opens one, or starts a part of one —
"start the next part", or a part by name:

1. **Read the overview for that part** — its scope line, what it depends on,
   the decisions that hold across parts, and Deferred items tagged for it. If a
   part it depends on has no spec yet, say so.
2. **Size it with triage, and recommend.** Deferred items for this part, or more
   than one reasonable shape → brainstorm it. Small and unambiguous → build it.
3. **Ask with `AskUserQuestion`:** *Brainstorm it / Build it / Stop here*, with
   the recommendation and its reason.
   - *Brainstorm it* — `brainstorming`, with the cross-part decisions as given
     and the part's Deferred items as its first questions.
   - *Build it* — write a short spec for the part, then the mode menu above.
   - *Stop here* — nothing more; the part starts later, often in a fresh session.

   Whenever a part's spec gets written, link it in the overview's Parts table
   and commit. From then on, opening that spec takes the ordinary spec route.

**A part's scope line, a ticket describing it, or a convention about where its
plan goes does not settle its design.** Only the part's own spec does.

**A builder handed an overview builds one part, never all of it.** The user
naming the part and the skill — "vibe part 3" — answers the
brainstorm-or-build question. Your own routing never does: ask.

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

**A user who says they won't be answering is away.** From that moment until
their next message, a gate has nobody to ask. It goes to the `advisor` skill's
away tier, which says what may proceed in their absence and what waits for
them. Only their saying so starts it.

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
one, come back here: the mode question applies again. The exception is a plan
carrying a `## Handoff` section: it records the mode already chosen, so opening
one owes no second question — resume where it says. An overview names no modes:
its header owes the starting-a-part question instead.
