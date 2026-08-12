# Maintenance

## Vendored from Superpowers

The design→plan→build workflow in `plugins/clankit-dev/skills/` is vendored from
[Superpowers](https://github.com/obra/superpowers) (MIT). See `NOTICE`.

Vendoring costs nothing for a skill copied verbatim — on a new release you
re-copy it. It costs something only for a skill that was patched. **The patched
files are the entire maintenance surface.**

### Re-pull policy

| Skill | Policy |
|---|---|
| `dispatching-parallel-agents`, `receiving-code-review`, `verification-before-completion` | Copy wholesale. No merge. |
| `writing-skills` | Copy wholesale, then re-drop the other-harness paths (see below). |
| `systematic-debugging` | Copy wholesale, then re-drop skill-development artifacts and rewire two references. |
| `brainstorming`, `writing-plans`, `executing-plans` | Re-apply the patches **by intent**, below. Do not merge blind. |
| `writing-good-tests` | Was a reference doc inside `test-driven-development`. Copy that file, keep our frontmatter. |

### What actually moves

Measured across superpowers 6.1.1 → 6.2.0:

- **`subagent-driven-development` (525 lines), `finishing-a-development-branch`
  (184), `test-driven-development` (71)** — real change.
- **Everything else: 6–20 lines**, all of it deleted prose.

So on a new release, the files worth diffing are `test-driven-development` (for
`writing-good-tests.md`) and `subagent-driven-development` (for improvements to
the execution loop that `executing-plans` should absorb). The rest can be
re-copied without reading.

## The patches, by intent

Record intent, not diffs. Upstream rewrote `subagent-driven-development` wholesale
in a single release; a diff would not have applied, but the intent still would.

### `brainstorming`

**The terminal state is a menu, not a destination — and not a derivation.**
Upstream ends by invoking `writing-plans` unconditionally. That is a routing
decision made before the information needed to make it exists: you cannot know
whether the work needs a written *plan* until you know how big it is and who
will execute it. Ours ends by asking which of four modes to run.

The spec still gets written every time, as upstream does — that was never the
problem. **The plan file was.** An earlier revision of this patch replaced the
terminal with a routing *table* and made the spec conditional on it. Both were
mistakes, and they failed the same way in practice: a table gets *consulted*,
silently, and on the most common route its answer was "write nothing" — which is
behaviourally identical to skipping the step. The observed result was a session
that designed, announced its own route, and started building without ever asking.

So: a menu with named answers, asked with a tool call, not a table to compute
against. If a re-sync or a later edit turns the four modes back into inferred
axes — artifact × gates — it will regress the same way.

**The modes have names, not letters, and a plan file is a prefix.** The letters
A–D lived only in the bootstrap, and a session duly told its user "we're in Mode
C" — vocabulary nobody outside that file could decode. The handles are now the
option labels and nothing else speaks them. The same pass fixed what the letters
had hidden: a plan file answers which artifact gets written, not how the build
is gated, so `writing-plans` ends by asking the second question — *Review at the
end / Review each task / Hand it off*. That question cannot become a fifth menu
entry, because `AskUserQuestion` caps options at four, and it must not become an
axis computed up front, for the reason in the paragraph above. Asking it late is
what keeps it a menu.

**Labels name cadence, *vibe* is seated, and *autopilot* is typed-only.** A
later pass renamed the build-now modes: *all at once* read lighter than the
thorough path it is — the flow even carried a warning sentence compensating for
the label — so the labels now name the user's review cadence (*review at the
end*, *review each task*) and carry an effort parenthetical in the menu. *Vibe*
joined as the light path small work never had: inline, this session, no
subagents, no ledger, no review — handing over a spec skips triage's "small →
just do it" row by construction, and every other answer buys machinery. Its
seat came from *autopilot*, because the menu caps at four and unattended is the
one mode nobody discovers from a list: `/autopilot` arrives already decided and
answers both halves by itself. The question line names the typed route so it
stays visible. A tidy-up that re-seats *autopilot*, drops *vibe*, or gives
*vibe* artifacts regresses this — vibe's whole job is suppression.

**Vibe's one gate: here or handed off.** Amends the paragraph above, which said
vibe gets no gates. Vibe now opens by asking where it runs — this session, or
one subagent at a capable or a cheap tier — because vibe is the only mode that
builds inline, so it is the only one whose cost is the invoking context. The
other modes were considered and excluded: *review at the end* and `/autopilot`
already dispatch a subagent per task, and moving their orchestrator into a
subagent would break the per-task review it dispatches; *review each task* needs
the diffs back in the user's context by definition. The question is asked every
time rather than gated on a token threshold — the threshold only picks which
answer gets recommended. This is the one gate vibe is allowed; anything that
adds a second, or a ledger, or a review, is the regression the paragraph above
is guarding.

**Gates are questions, not announcements.** Added, because the failure above had
a second half: every gate in that session came out as a statement with an
objection window ("decisions I'm making — flag if you disagree", "shall I
proceed?"). Prose alone did not hold this — the same model repeated it in the
next session after agreeing with the correction — so the terminal is specified as
an `AskUserQuestion` call, which either appears in a transcript or doesn't.

**Specs carry the mode header, and land in `docs/specs/`.** Upstream never needed
either: its spec was always followed by a plan, and the plan carried the "use
this skill" pointer. Once a spec can be the only artifact, it has to say what to
do with it, and it must not be filed in `docs/plans/`, where a reader expects
tasks and an acceptance bar.

**No todo-list mandate.** Upstream opens the checklist by ordering the model to
track every step as a task in the native task list, on the theory that an
unfinished task is what makes a skipped step visible. That theory needs a reader.
The panel is disabled here, so the list is written and never seen — ceremony on
every run, buying nothing. Ours says only that the steps are completed in order;
the checklist itself is untouched. The same cut applies to `executing-plans`,
where a ledger file already does the job for real. Upstream ships this mandate in
more than one skill, so expect a re-sync to bring it back.

**The trigger is narrowed and the domain is neutral.** Triage lives in the session
bootstrap, so this skill does not need to fire on everything. Its code-specific
design guidance is scoped to software, because the skill is meant to work on a
document or a decision too.

**The companion is unbranded.** Upstream's visual companion fetched a logo from a
remote host on every render. Text credit only; attribution is in `NOTICE`. Its
scratch directory is `.clankit/`, not `.superpowers/`.

### `writing-plans`

**Plans carry interfaces, not implementations.** Upstream tells the author to
assume the implementer has "questionable taste", which forces literal code in
every step. The result inverts the economics: the orchestrator writes the code
into a document and the subagent transcribes it, spending the context that
delegation exists to protect.

Our premise is a capable implementer who cannot see what the author sees. A task
carries **units, interactions, signatures, constraints, and an acceptance bar** —
what cannot be derived. Code appears only where you can name what specifically
breaks without it.

**"Done when" distinguishes testing from verification.** A test is durable and
re-runs; a verification is a one-time check. Work that cannot be tested gets a
named verification run, not tests that assert nothing.

### `executing-plans`

**It absorbed `subagent-driven-development`.** Upstream split execution in two:
`executing-plans` was the fallback for harnesses without subagents, and the real
machinery lived in SDD. Delegated is our default; inline is for short plans.

**Model selection is inverted — this is the patch most likely to be silently
reverted.** Upstream sends implementers to the cheapest tier *because its plans
contain the complete code to transcribe*. Ours don't, so implementers do creative
work and tiers go **up**. If a re-sync reintroduces "cheapest tier for
transcription", delete it.

**Gates are an explicit setting.** Upstream never pauses between tasks. That is
correct only when the user asked for no gates.

**No brief-extraction script.** A task in the reduced format is already a brief.

**No todo-list mandate**, for the reason recorded under `brainstorming`. The
ledger file is the progress record; todos were a second, unread copy of it.

**It accepts a spec, not only a plan.** *Review at the end* and *review each task* build
straight from the spec with no plan file, so the skill derives the task list
itself and shows it for approval before Task 1. The scripts needed no change — a
spec is a file on disk, so `plan-workspace` keys off its basename exactly as it
does for a plan.

**The derived list has a specified render, and the bodies live in the ledger.**
Saying "show the list for approval" and stopping there is what an observed
session did with it: five task bodies, box-drawing separators and a pre-flight
finding in one message nobody could read. The gate is now one line per task and
the bodies go to `progress.md`. This is not a loosening of the "not a document"
rule — that rule names `docs/plans/`, and the ledger is git-ignored workspace
that dies with the plan. If a later edit drops the render constraint as
redundant, the prose padding comes straight back.

**Gates and run style are welded — oversight substitutes for machinery.**
*Review each task* runs inline with one review when the plan is done; *review
at the end* runs delegated
with a review per task and the fix loop. A human approving every diff makes
per-task subagent reviews redundant hoops, and nobody watching is exactly what
those hoops exist for. An earlier revision called the delegated/inline choice
"independent of gates" — a leftover from when the axes were designed as
orthogonal — and that sentence read as license to un-weld them. If a later edit
reintroduces independence, or offers delegated *review each task* by default, it
regresses this intent.

**Attended delegated runs are single-builder.** Amends the welding entry above,
which described *review at the end* as a subagent and a review per task. Usage
data said that machinery priced the mode out of existence: with per-task
reviews and fix loops it was slow enough that vibe won every time, so the
safety net caught nothing. Foundation defects it was meant to catch early are
rare in practice and mostly caught at the plan stage anyway. Now one
implementer builds the whole plan and the final review is the only review. The
per-task loop keeps exactly two callers — `/autopilot`, where per-task review
substitutes for the absent human, and plans too large for one implementer's
context — and autopilot names it explicitly when invoking `executing-plans`.
If a later edit makes the per-task loop the attended default again, it
regresses this intent.

**No hand-off answer in the gates question.** Reaching this skill already means
the work gets built, so offering "stop before Task 1" asks it to undo its own
invocation. It also has nothing to hand over on the spec path: the derived task
list is deliberately never written to disk, so a session that stopped there
would leave the next one re-deriving different tasks from the same spec. Handing
work over is `writing-plans`' answer to give, because there a plan file exists.

Ported close to verbatim, and worth keeping that way: the fix loop, the five-round
circuit breaker, and the adjudication rules. Those encode real failures.

### `autopilot` (not vendored — ours, but it moved)

**Autopilot writes a plan and runs `executing-plans`.** It used to write a few-bullet
brief, build with one subagent, and review once at the end. That is a *lighter*
path, and autopilot's premise is the opposite: run the workflow exactly as a human
would, with the gates answered in advance rather than removed. Unattended work is
where an end-only review is worst — a wrong turn at task 2 gets inherited through
task 7 — and where a plan file matters most, because the PR reviewer wasn't there
and a dead run has no conversation to resume from.

So autopilot is now the envelope: worktree, plan, draft PR, and the standing
decision that nobody will be asked. `executing-plans` owns the build loop, its
reviews, its fix rounds, and its model tiers. Don't re-implement any of that here.

### `writing-skills`, `systematic-debugging`

Only reference rewiring. References to skills we do not vendor
(`test-driven-development`) either inline the one idea they needed — write the
test first, watch it fail — or point at `writing-good-tests`. Other-harness
install paths and links into `using-superpowers/references/` are removed, since
those files do not exist here.

`systematic-debugging` also drops superpowers' own skill-development artifacts
(creation log, pressure tests): they document how the skill was built and
evaluated, and nothing references them at runtime.

## Not vendored, deliberately

`using-superpowers` (replaced by `plugins/clankit-dev/bootstrap.md`),
`subagent-driven-development` (absorbed), `test-driven-development` (the skill;
its `writing-good-tests.md` is kept), `finishing-a-development-branch`,
`requesting-code-review` (the `code-review` plugin covers it),
`using-git-worktrees` (the harness has native worktree tools).

## Deferred

Recorded in `docs/specs/2026-07-27-clankit-workflow-skills-design.md`:

- **A `/vibe` skill** — a loop-shaped sibling to autopilot. Revisit when *all at
  once* (no gates, report at the end) feels heavy.
- **Autopilot as a workflow.** Now that it is a fixed pipeline — plan, then
  `executing-plans` with gates off, then a draft PR — it is deterministic control
  flow over subagents, which is what the harness's workflow scripts are for.
  Revisit once the current shape has run a few times.
- **Replacing the ledger with the native task list** — worth doing, but it adds
  divergence to `executing-plans`, the file most likely to be rewritten upstream.
- **Splitting `brainstorming` into its own plugin** — it is domain-independent and
  worth sharing with people who don't write software, who should not receive a
  hook-injected preamble about repos and subagents. Deferred only because nobody
  else installs these yet.
