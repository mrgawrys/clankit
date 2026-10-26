# Overview Specs — Design

> **To act on this design:** pick a mode — *vibe* (inline, no machinery),
> *review each task* (per-task diffs), *review at the end* (one subagent
> builds, one review at the end), or *plan first* (`writing-plans`, then how it gets built).
> Ask the user which; don't pick for them.

## The problem

Some work is too big for one design but needs a single high-level picture
first: the goal, the steps in order, what holds across all of them. Each step
then usually needs its own design conversation before it gets built.

The flow has no artifact for that picture and no route out of it:

- `brainstorming` already says to decompose a too-large project into
  sub-projects and brainstorm the first one. The decomposition lives only in
  the conversation; nothing durable records it.
- When such a picture is written anyway, it gets the spec header ("pick a
  mode") and is filed as a spec. The bootstrap routes "user opened a spec and
  asked to work on it" straight to the mode menu, and every menu answer builds.
  There is no path from "start the next part" back into designing that part.

Observed failure: a user opened a multi-part design whose parts each had a
ticket with a spelled-out scope, plus a convention "each part gets its plan
written just before it starts", and said "start the next part". The session
read the scope and the convention as a settled design and the mode question
as already answered, invoked `writing-plans` in the same message it announced
the pick, and settled the part's open design forks silently inside the plan.
The user wanted to brainstorm that part first.

## The design

### 1. The overview document

Path: `docs/specs/YYYY-MM-DD-<topic>-overview.md`. The `-overview` suffix sets
it apart from `-design` specs.

It opens with this header instead of the spec header:

```markdown
# [Topic] — Overview

> **This is an overview, not a design to build from.** Each part below gets
> designed when work on it starts. Starting a part is a new ask: size it,
> recommend brainstorming it or going straight to the build menu, and ask
> which. Only a part the user names gets built straight from here, never
> the whole file.
```

Body sections, in order:

| Section | Holds |
|---|---|
| **Goal** | One paragraph: what the whole effort delivers, and why. |
| **Parts** | Table: # · part · scope (1–2 lines) · depends on · spec. The spec cell is empty until that part's own spec exists, then links to it. That cell is the only status; progress tracking stays in whatever tool the user already uses. |
| **Decisions that hold across parts** | Choices the overview brainstorm settled for every part. A part's brainstorm treats them as given. |
| **Deferred** | Questions left for a part's own brainstorm, each tagged with its part number. |

### 2. Brainstorming produces an overview

Replaces the two "assess scope / decompose into sub-projects" bullets in
`brainstorming/SKILL.md` (Understanding the idea).

1. **Spotting it is a question.** When the ask clearly has several parts that
   each need their own design, say so and ask: one design, or an overview now
   with each part designed later. Never switch to an overview unasked.
2. **The overview brainstorm** runs the normal checklist at a higher altitude:
   goal, parts and their order, cross-part decisions. A question that belongs
   to one part goes to Deferred, tagged, unanswered. The overview brainstorm
   designs no part.
3. **Write, self-review, user review** as for a spec. The self-review adds one
   check: each part is small enough for a single spec; one that isn't becomes
   two parts.
4. **The terminal state is the starting-a-part question** (section 3) for the
   first part in order, not the mode menu. Commit the overview before asking.

The checklist and process-flow diagram gain the overview branch so the skill's
own summary matches its body.

### 3. The bootstrap route: starting a part

`bootstrap.md` Routing gains a third entrance beside "design approved" and
"spec opened": **an overview is opened, or a part of one is started** ("start
the next part", or a named part). It never leads straight to the mode menu.

1. **Read the overview for this part:** its scope line, dependencies, the
   cross-part decisions, and Deferred items tagged for it. If a part it
   depends on has no spec yet, say so.
2. **Size it with triage and recommend.** Deferred items tagged for this part,
   or more than one reasonable shape → *brainstorm it*. Small and unambiguous →
   *build it*.
3. **Ask with `AskUserQuestion`:** *Brainstorm it / Build it / Stop here*, with
   the recommendation and its reason.
   - **Brainstorm it:** normal brainstorm. Cross-part decisions are given; the
     part's Deferred items are its first questions. The resulting spec carries
     the normal spec header plus a line `Part N of [overview](path)`.
   - **Build it:** write a short spec for the part first (spec-first still
     holds), then the mode menu.
   - **Stop here:** nothing further; the user will start the part later,
     usually in a fresh session.
   - Whenever a part's spec is written, link it in the overview's Parts table
     and commit.
4. Two rules stated explicitly next to the route:

   > A part's scope line, a ticket describing it, or a convention about where
   > its plan goes does not settle its design. Only the part's own spec does.

   > A builder handed an overview builds one part, never all of it. The user
   > naming the part and the skill answers the brainstorm-or-build question;
   > your own routing never does — ask.

Once a part has a spec, opening that spec takes the existing spec route to the
mode menu.

The Skills section's sentence about artifacts opening by naming the modes
gains the overview's header as the exception: an overview names the
starting-a-part question instead.

### 4. Builders handed an overview

| Skill | Handed an overview |
|---|---|
| `vibe` | Builds one part. Part named ("vibe part 3") → build it from that part's row plus the cross-part decisions, no further question. No part named → ask which. |
| `executing-plans` | Asks which part if none named. Writes the part's short spec first (the *Build it* path), links it in the overview, then runs its usual gate question. |
| `writing-plans` | One part only, and only when the user invoked it directly. Reached through the session's own routing → go to the starting-a-part route instead. Lands in its Scope Check section. |
| `autopilot` | Stops and says so — an unattended run cannot ask which part or whether it needs design. A fourth case in Phase 0's "Check what you were handed". |
| `README.md` | Half a sentence in the clankit-dev flow paragraph: a multi-part ask can produce an overview, and each part is designed when it starts. |

All wording stays generic: no reference to any particular tracker, project or
workplace.

## Testing

Prose and skills — no tests. Verification is a scenario replay with a fresh
subagent, run once against the current text and once after the change:

- **Setup:** the bootstrap text; a sample overview whose part 1 has a fully
  spelled-out scope line and two Deferred items; a note that each part's plan
  is written just before it starts.
- **Prompt A — "start the next part":** pass = it asks *Brainstorm it / Build
  it / Stop here* and recommends brainstorming, citing the Deferred items.
  Fail = it invokes `writing-plans` or any builder, or announces a choice
  instead of asking.
- **Prompt B — "vibe part 2":** pass = it builds part 2 without the
  brainstorm-or-build question and touches no other part.

The run against the current text should fail Prompt A (with the current
text there is no overview header, so the sample uses the spec header);
that confirms the scenario exercises the change.
