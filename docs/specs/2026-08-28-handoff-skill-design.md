# Handoff — Design

> **To act on this design:** pick a mode — *vibe* (inline, no machinery),
> *review each task* (per-task diffs), *review at the end* (one subagent
> builds, one review at the end), or *plan first* (`writing-plans`, then how it gets built).
> Ask the user which; don't pick for them.

## The problem

A session mid-task runs out of room. The context line says 360k, the agent is
three tasks into a plan or two hypotheses into a bug, and the user wants to
continue in a fresh session without losing what this one knows. Today the
options are to push on into a degrading window or to explain, by hand, what
to write down and where.

`/handoff` is the one-word exit: stop, freeze the state into a file, print the
path. The user opens a fresh session and pastes the path. Any agent that reads
the file can continue.

It is not `writing-plans`. A plan assumes an approved design and a build ahead;
a handoff can happen mid-brainstorm, mid-debug, mid-review, with nothing
approved yet. The state it saves is different: what was decided, what was
tried, what comes next — not tasks.

## What `/handoff` does

### The stop

Invoked bare, with no explanation. The reply *is* the handoff: no
acknowledgement, no recap of the work, no insight box, no question.

The current step is abandoned where it stands. A half-written file stays
half-written and gets described; nothing is finished "to leave it tidy". No
tests run, no commits, no git writes of any kind — the working tree is left
exactly as found and described in the file. Git *reads* (`git log`,
`git status`) are expected.

Subagents and background tasks are neither waited for nor killed. The file
records what each was doing and where its output lands (commits on the
branch, a workspace `build-report.md`); the resumer checks `git log`. They die
with the session anyway.

### The target

First match wins:

1. **A plan in flight** — a `docs/plans/` file this session was writing or
   building from — gets a `## Handoff` section prepended
   directly under its header. Progress on a plan's tasks belongs in the plan,
   and the next session opens the plan anyway.
2. **Anything else** — a build straight from a spec, a debugging session, a
   review, a brainstorm whose spec isn't written yet — goes to a new file:
   `${CLAUDE_CONFIG_DIR:-~/.claude}/handoffs/<repo-basename>/YYYY-MM-DD-<topic>.md`.
   Same env-var precedent the context-usage hook uses, so the file lands in
   whichever config dir the session runs under. Outside a repo,
   `<repo-basename>` is the working directory's name.

Specs are never edited. A spec is a design record — what was decided, not
where the build is — and a progress note on it would have to be stripped when
the build finishes. The outside file names the spec as its source of truth
instead.

"In flight" means the session was working *on or from* it. A plan mentioned
in passing is not the target.

Editing a plan means adding a layer, not rewriting: tasks and constraints stay
untouched. A second `/handoff` on the same plan replaces the section; it never
stacks a second one.

## The file

Two containers, one shape. The outside file is a standalone
`# Handoff — <topic>`; on a plan it is `## Handoff` under the plan's header,
with the same parts minus *Goal* (the plan has one).

### Header

The header is the resume instruction, which is why no resume skill exists:

> **To resume:** read this, then check `git log` and `git status` in
> `<repo path>` — they are the record, this file may be behind them. Say in
> one line what you're picking up, then take **Next step**. Don't recap,
> don't re-plan, don't re-ask what's under *Decided*.

Then one metadata block:

- **Written:** date and time
- **Repo:** absolute path, branch
- **Activity:** what the session was doing, plainly — a vibe build, debugging,
  a brainstorm, a review. On a build, the menu answer the user gave
  (*Review each task*, *Review at the end*, *Vibe*) is recorded as the answer,
  so a resumed plan owes no second mode question.
- **Source of truth:** the spec, the plan, a PR — or "none, the ask is under
  Goal".

### Parts

Each as short as it can be. Omit an empty one.

- **Goal** — what the session was trying to do, in the user's own terms.
- **Decided** — decisions made in conversation that live nowhere else, each
  with its reason in a few words. This section earns the file: everything
  else is reconstructible from git, this is not.
- **Done** — what is finished, with proof: commits (hash and one line),
  verifications run and their result.
- **In progress** — the abandoned step: what was being changed, why, how far
  it got. `git status --short` pasted, one clause per entry saying what it is
  for. Subagents running at the time and where their output lands.
- **Next step** — the one concrete action the session was about to take, then
  briefly what follows.
- **Open questions** — anything the user hasn't answered or the agent was
  unsure of.
- **Gotchas** — dead ends and surprises: "X fails because Y".
- **Key files** — the handful of paths that matter and a word on why. Not an
  inventory of everything touched.

### Writing rules

- Write for an agent that has the repo and nothing else: every reference by
  path, every decision with its reason.
- Paste `git log` and `git status` output rather than recalling it.
- Point at records instead of copying them — a workspace `build-report.md`,
  a spec, a PR.
- No session narrative, no transcript. What is needed to continue and
  nothing more.

## The reply

Two lines, nothing else:

```
Handoff written: /abs/path/to/file.md
Paste in a fresh session: Resume from /abs/path/to/file.md
```

On a plan the first line reads
`Handoff written into docs/plans/<file>.md (uncommitted)` and the path in the
second line is the plan's absolute path.

## Scope

- `plugins/clankit-dev/skills/handoff/SKILL.md` — new. Name `handoff`,
  invoked as `/handoff`; "stop and hand off" and "save the context and stop"
  are trigger phrases. Like `one-at-a-time`, it never fires on a hunch that
  context looks full — only when the user asks.
- `home/CLAUDE.md`, *Context Budget* — one clause: the check-in offers
  `/handoff` as the way out. The user still decides; the model names the exit.
- `plugins/clankit-dev/bootstrap.md` — one sentence. It says opening a spec or
  plan means the mode question applies again; a plan carrying a `## Handoff`
  already records the answer, so opening one owes no second question. Without
  this line the skill's header and the bootstrap contradict each other.
- `README.md` — one row in the clankit-dev flow table, next to
  `writing-plans`: both cross a context boundary, this one mid-flight.
- `plugins/clankit-dev/.claude-plugin/plugin.json` — description gains
  `handoff`.
- Untouched: `writing-plans`, `executing-plans`, `vibe`. Nothing changes in
  how they run; they become resumable.

## Verification

Prose, no tests. Read the skill back against four checks:

1. the target rule picks a plan only when one is in flight, and never a spec;
2. no git writes anywhere;
3. the reply is two lines;
4. a second `/handoff` replaces the section rather than stacking.

Then one real dry run — `/handoff` on the building session's own state once
the build is done — to see whether the shape holds with real content. The
file is deleted after.
