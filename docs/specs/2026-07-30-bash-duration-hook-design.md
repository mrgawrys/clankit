# Bash Duration Hook — Design

> **To act on this design:** pick a mode — *all at once*, *in batches*
> (per-task diffs), *plan first* (`writing-plans`, then a second question about
> how it gets built), or *autopilot*. Ask which; don't pick on the reader's
> behalf.

## Problem

A Bash call that takes four minutes leaves no trace the model can act on. The
tool result carries stdout, stderr and an exit code, but no duration — verified
across ~16,800 Bash results in local transcripts, none of which record elapsed
time. So an agent that just paid four minutes for a test suite will pay it
again, and again, because nothing in its context says the command is expensive.

The cost compounds under a fleet: several agents run at once, one of them is
grinding through a slow suite, and the operator watching a different pane never
finds out.

## What it does

Report the duration of any Bash call that takes longer than 30 seconds, as
context attached to that call's result. Stay silent otherwise.

That is the whole feature. The model reads the number and decides what to do —
background it, narrow the target, or investigate. The hook makes no decision and
blocks nothing.

## Architecture

Two events on one script, `plugins/clankit-dev/hooks/bash-duration.sh`,
dispatching on `hook_event_name` the way `context-usage.sh` already does.

```
PreToolUse  (matcher: Bash)
    date +%s  →  $TMPDIR/clanker-bash-start-<tool_use_id>
    no stdout, never blocks

PostToolUse (matcher: Bash)
    read stamp, delete it
    elapsed = now - start

    no stamp             →  silent
    interrupted == true  →  silent  (guard; see Must verify)
    elapsed < threshold  →  silent
    otherwise            →  one line of additionalContext
```

Threshold defaults to 30 seconds, overridable by `CLAUDE_SLOW_BASH_SECONDS`,
following the `CLAUDE_CONTEXT_STEP` precedent in `context-usage.sh`.

**No persistent state.** Stamps live in `$TMPDIR`, keyed by `tool_use_id`, and
are deleted on read. Nothing survives the session, and nothing needs to.

### Duration format

Integer seconds throughout — bash 3.2 has no `EPOCHREALTIME`, and a 30-second
threshold has no use for milliseconds.

| elapsed | rendered |
|---|---|
| 47 s | `47s` |
| 252 s | `4m12s` |
| 3780 s | `1h03m` |

### Emission text

Every over-threshold call after the first in a session:

```
This command took 4m12s.
```

The first emission of a session expands once. In the main agent:

```
This command took 4m12s. Bash calls over 30s get their duration reported here;
faster ones stay silent. If a duration looks out of place for what the command
does, investigate it rather than re-running — and if it looks like a real
problem, say so to the user. For work you now know is slow, prefer
run_in_background or a narrower target.
```

Inside a subagent, the escalation target changes:

```
This command took 4m12s. Bash calls over 30s get their duration reported here;
faster ones stay silent. Don't work around a slow command on your own — report
it to your orchestrator with the duration and let it decide.
```

A subagent escalates to its orchestrator; the main agent escalates to the user.
Neither self-remediates silently.

The expansion is gated by a marker file keyed on **`session_id` and `agent_id`
together** — see Failure modes.

## Cost

Measured on an arm64 macOS host.

| | per call | runs on |
|---|---|---|
| `context-usage.sh`, already installed | 52 ms | every tool call |
| this hook, both sides with `jq` | ~77 ms | Bash calls only |

Against real transcripts — median 8 Bash calls per session, heaviest observed
76 — that is roughly 0.6 s of added latency across a median session and 6 s
across the heaviest. Less than the already-installed context hook costs on a
larger number of calls.

Tokens: nothing below threshold, ~8 tokens per terse emission, ~55 tokens once
per session for the expansion. A four-minute suite run five times costs about
90 tokens.

Both sides use `jq`. Pulling `tool_use_id` with a bash pattern match instead
saves ~20 ms on the Pre side, which is not worth hand-rolled JSON parsing on a
call that took over 30 seconds by definition.

## Measurement accuracy

`PreToolUse` fires **before** the permission check, and no hook fires between
approval and execution. A stamp therefore includes any time spent waiting for
approval.

Measured against 451 commands that cannot take measurable time (`echo`, `ls`,
`pwd`, `cat`, `which`, solo, unchained):

| | |
|---|---|
| median | 0.11 s |
| p90 | 3.19 s |
| p99 | 39.1 s |
| over 5 s | 5.8 % |
| over 30 s | 1.1 % |

A median of 0.11 s shows there is no systematic overhead — the measurement is
essentially exact almost always. The error is a thin episodic tail, not a bias.

At a 30-second threshold roughly 1 in 90 reports is spurious, and it costs 8
tokens next to a command the model can see is trivial. Accepted without
mitigation. Suppressing gated calls would buy about one percentage point and
pay for it by going blind on every command that required approval.

The threshold doubles as the error budget: the target signal (30 s to 5 min)
sits an order of magnitude above the noise. A hook aiming at 2-second commands
could not use this measurement at all.

## Failure modes

**Stamp leaks.** Nothing deletes the stamp when permission is denied or the
session dies mid-call. Sweep in the existing `SessionStart` hook:
`find "$TMPDIR" -name 'clanker-bash-start-*' -mmin +720 -delete`. Once per
session, not once per call.

**First-emission marker key.** Key it on `session_id` *and* `agent_id`. Keyed on
session alone, whichever call finishes first consumes the expansion and every
other caller gets the bare line — including every subagent, which would then
never receive its escalate-upward instruction. The hook would still look like it
works, which is what makes this the likeliest bug to ship.

**Never fail the tool call.** Missing `jq`, unwritable `$TMPDIR`, corrupt stamp:
`exit 0` silently. A duration reporter that breaks a Bash call is worse than no
duration reporter.

**bash 3.2.** No `EPOCHREALTIME`, no associative arrays, no reliance on
`date +%N`. `date +%s` and integer arithmetic only.

**Concurrency.** Stamps are keyed by `tool_use_id`, which is globally unique, so
parallel agents never contend.

**Backgrounding self-heals.** `run_in_background: true` returns immediately, so
elapsed is ~0 and the hook stays silent. Taking the hook's advice makes it stop
talking. The same holds for calls Claude Code auto-backgrounds.

## Must verify before shipping

**Which post event a failing Bash call fires.** The design assumes a non-zero
exit is a normal result and reaches `PostToolUse`, so a suite that fails after
four minutes still gets reported — the most valuable case. Tool-level errors
(timeout, interrupt) are assumed to reach `PostToolUseFailure`, which this hook
deliberately does not register: an interrupted command's duration is
meaningless, and a timed-out one already reports `timedOutAfterMs`.

This is inferred from documentation, not observed. If slow *failures* route to
`PostToolUseFailure`, the hook is blind to what it was built for and must
register there too, guarded on `interrupted`.

**Whether subagents share the parent's `session_id`.** Determines whether the
marker key needs `agent_id` at all. Include it regardless; it is free.

## Out of scope

Dropped deliberately, recorded so a later reader does not rebuild them:

**A duration ledger with cross-run matching.** Remembering that `mix test` took
four minutes last week, to warn before it runs again. Rejected because deciding
that two runs are "the same command" fails in practice: `pnpm run <script>`
shares leading tokens across unrelated work, and exact string matching only pays
off when the command repeats character for character. It also demands persistent
state for a benefit a capable model gets from the plain duration.

**A pre-flight warning.** `PreToolUse` fires after the model has already emitted
the tool call, so `additionalContext` there cannot change the decision — the
command runs anyway and the model reads the warning beside a result it was
getting regardless.

**Blocking a known-slow command** via `permissionDecision: "deny"`, and
**clamping `timeout`** via `updatedInput`. Both change behavior rather than
inform it. Out of scope for a reporting hook.

**Rewriting the command to time itself in-shell.** The only route to true
execution time with full coverage, but the rewrite lands before the permission
prompt, so the operator would approve a command other than the one displayed.
Rejected on approval integrity.

**Notifying the operator about work still running.** A separate concern, and a
separate hook: a dead-man's switch armed at `PreToolUse` and disarmed at
`PostToolUse`. Its state is garbage the moment a command finishes, where this
hook's is meaningful across the session. Same skeleton, opposite lifetimes.

## Verification

clankit has no test framework, and a shell hook driven by JSON on stdin earns a
verification run rather than unit tests. Drive the script directly with
synthetic payloads and confirm each case:

| case | expected |
|---|---|
| elapsed under threshold | no stdout |
| elapsed over threshold, first in session | expanded text, correct duration |
| elapsed over threshold, second in session | terse text |
| `agent_id` present, first in session | subagent wording |
| `interrupted: true` | no stdout |
| no stamp file | no stdout |
| `jq` absent from `PATH` | exit 0, no stdout |
| 47 s / 252 s / 3780 s | `47s` / `4m12s` / `1h03m` |

Then a live check: run a `sleep 35` in a real session and confirm one expanded
line arrives, and that a fast command in the same session produces nothing.
