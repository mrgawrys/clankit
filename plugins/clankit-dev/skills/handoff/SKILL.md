---
name: handoff
description: "Use when the user invokes /handoff or says to stop and hand off, save the context and stop, or freeze this for a fresh session — mid-anything: a build, a debugging session, a review, a brainstorm. Stops the work and writes the state to a file any agent can resume from. Never trigger on a hunch that context looks full; the context-budget check-in offers it and the user decides."
user_invocable: true
---

# Handoff

The user is leaving this session and wants the next one — any agent, any
tool — to continue from where this one stopped. Stop, write the state down,
print the path. Nothing else.

## The stop

The reply is the handoff. No acknowledgement, no recap, no insight box, no
question.

Abandon the current step where it stands. A half-written file stays
half-written and gets described; nothing gets finished "to leave it tidy". No
test runs, no commits, **no git writes of any kind** — the working tree is
left exactly as found. Git reads (`git log`, `git status`) are expected;
paste their output rather than recalling it.

Subagents and background tasks: don't wait for them, don't kill them. Record
what each was doing and where its output lands (commits on the branch, a
workspace `build-report.md`). They die with the session; the resumer checks
`git log`.

## The target

First match wins:

1. **A plan in flight** — a `docs/plans/` file this session was writing or
   building from. Prepend a `## Handoff` section directly under the plan's
   header. Tasks and constraints stay untouched: the handoff is a layer on
   the plan, not a rewrite. A second `/handoff` on the same plan replaces the
   section; never stack a second one.
2. **Anything else** — a build straight from a spec, a debugging session, a
   review, a brainstorm whose spec isn't written yet — a new file:
   `${CLAUDE_CONFIG_DIR:-~/.claude}/handoffs/<repo-basename>/YYYY-MM-DD-<topic>.md`
   Expand the variable yourself and create the directory. Outside a repo,
   `<repo-basename>` is the working directory's name.

"In flight" means the session was working *on or from* it. A plan mentioned
in passing is not the target. **Never edit a spec** — it records what was
decided, not where the build is; the outside file names it as source of
truth instead.

## The file

The outside file is a standalone `# Handoff — <topic>`. On a plan it is
`## Handoff` with the same parts minus *Goal* (the plan has one). Omit any
part that would be empty.

### Header

Open with the resume instruction, verbatim:

> **To resume:** read this, then check `git log` and `git status` in
> `<repo path>` — they are the record, this file may be behind them. Say in
> one line what you're picking up, then take **Next step**. Don't recap,
> don't re-plan, don't re-ask what's under *Decided*.

Then:

- **Written:** date and time
- **Repo:** absolute path, branch
- **Activity:** what the session was doing, plainly — a build, debugging, a
  brainstorm, a review. On a build, record the mode the user picked (*Vibe*,
  *Review each task*, *Review at the end*) as the answer already given; the
  next session owes no second mode question.
- **Source of truth:** the spec, the plan, a PR — or "none, the ask is under
  Goal".

### Parts

- **Goal** — what the session was trying to do, in the user's own words.
- **Decided** — decisions made in conversation that live nowhere else, each
  with its reason in a few words. This part earns the file: everything else
  is reconstructible from git, this isn't.
- **Done** — what's finished, with proof: commits (hash and one line),
  verifications run and their result.
- **In progress** — the abandoned step: what was being changed, why, how far
  it got. `git status --short` pasted, one clause per entry saying what it's
  for. Subagents running at the time and where their output lands.
- **Next step** — the one concrete action this session was about to take,
  then briefly what follows.
- **Open questions** — anything the user hasn't answered or you were unsure
  of.
- **Gotchas** — dead ends and surprises: "X fails because Y".
- **Key files** — the handful of paths that matter and a word on why. Not an
  inventory.

### Writing it

- For an agent that has the repo and nothing else: every reference by path,
  every decision with its reason.
- Point at records instead of copying them — a workspace `build-report.md`,
  a spec, a PR.
- No session narrative, no transcript. What's needed to continue and nothing
  more.

## The reply

Two lines, nothing else:

```
Handoff written: /abs/path/to/file.md
Paste in a fresh session: Resume from /abs/path/to/file.md
```

On a plan: `Handoff written into docs/plans/<file>.md (uncommitted)`, and the
second line carries the plan's absolute path.

## Not

- **A plan.** No tasks, no done-when bars. `writing-plans` is for an approved
  design with a build ahead; this is for wherever the session happens to be.
- **A summary for the user.** They read the file if they want it. The reply
  is the path.
- **Self-triggered.** Context looking full is the check-in's business; the
  user says the word.
