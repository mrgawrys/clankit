# Bash Watchdog Hook — Design

> **To act on this design:** pick a mode — *all at once*, *in batches*
> (per-task diffs), *plan first* (`writing-plans`, then a second question about
> how it gets built), or *autopilot*. Ask which; don't pick on the reader's
> behalf.

## Problem

An operator running several agents at once cannot see that one of them has been
blocked on a Bash call for minutes. The duration hook
(`2026-07-30-bash-duration-hook-design.md`) tells the *agent* what a slow call
cost — after it finishes. Nothing tells the *human* while it is still running.

## What it does

When a Bash call has been running longer than a threshold (default 2 minutes),
send one desktop notification naming the command, the elapsed time, and the
project. Nothing else: no repeat pings, and the running command is never touched
— killing is already Bash's own `timeout` machinery's job.

## Architecture

One script, `plugins/clankit-dev/hooks/bash-watchdog.sh`, on the same three
events as `bash-duration.sh` (matcher `Bash`), dispatching on
`hook_event_name`.

```
PreToolUse
    write $TMPDIR/clanker-bash-watch-<tool_use_id>
        (contents: first line of the command truncated to ~60 chars,
         basename of cwd, agent marker)
    spawn a detached timer, exit immediately:
        ( sleep $THRESHOLD
          [ -f watchfile ] || exit        # command finished → say nothing
          notify
          rm -f watchfile ) </dev/null >/dev/null 2>&1 &

PostToolUse, PostToolUseFailure
    rm -f watchfile                       # disarm
```

Three choices carry the design:

**The timer's fds are all redirected.** The backgrounded subshell inherits the
hook's stdout pipe, and Claude Code waits on that pipe to close — without
`</dev/null >/dev/null 2>&1` the hook blocks every Bash call for the full
threshold. This line makes the approach viable.

**Disarm is `rm`, not `kill`.** The post side deletes the file; the sleeper
wakes, finds nothing, exits. Killing the sleeper by PID would save one idle
`sleep` process per call for at most the threshold — state and a kill race
bought for nothing.

**Both post events are registered**, for the reason established in the duration
hook's spec: a non-zero exit routes to `PostToolUseFailure`, and a failing slow
command must still disarm, or the operator gets pinged about a command that
already returned.

The arm file is both the disarm signal and the notification payload. Deleting
it destroys exactly the data that would have been announced — the right
lifetime, since the watchdog's state is garbage the moment the command
finishes.

Threshold defaults to 120 seconds, overridable by
`CLAUDE_BASH_WATCHDOG_SECONDS`; `0` disables the watchdog, which is the
recommended setting for headless sessions nobody is watching. Parsing uses
`jq`, like the sibling hooks.

## Trace log (opt-in)

Set `CLAUDE_BASH_WATCHDOG_LOG` to a path and the hook appends one line per
decision — `arm` (with threshold, command, project), `disarm`, `fire` (ping
sent), `expire` (timer woke already disarmed), plus `arm-fail` and
`parse-fail`. Each line carries the tool id and the first eight characters of
the session id, so a log shared by concurrent sessions splits back apart.
Missing parent directories are created; a log that cannot be written is
silently dropped, never a hook failure. Unset means no log and no cost — the
notification path is byte-for-byte the pre-logging behavior.

This exists because the notification itself is unauditable: it names a command
but not the session or outcome, so a burst of pings cannot be diagnosed after
the fact. With the log, "why did I get pinged" is one grep: a healthy trace
pairs every `arm` with a `disarm`; an `arm` followed by `fire` with no
`disarm` in between is a call that never came back — genuinely long, or the
denial case below.

## Notification

Channel: `terminal-notifier`, checked with `command -v` up front; absent means
the hook is inert. The plugin README documents
`brew install terminal-notifier` as the dependency.

```
terminal-notifier -title "Clanker" -sound Sosumi \
  -message "Still running after 2m: mix test --only slow (myproject)"
```

- Elapsed rendered by the duration hook's formatting rules (duplicated —
  seven lines beat a shared-library dependency), so a raised threshold reads
  correctly.
- The command, first line only, truncated to ~60 characters.
- The project: basename of the hook input's `cwd` — with a fleet across repos
  it says where to look.
- With `agent_id` present the suffix becomes `(myproject, subagent)`: a stuck
  background agent and a stuck main session call for different reactions.

One ping per call. A command that runs 20 minutes was announced at minute 2,
and Bash's 10-minute timeout ceiling bounds it anyway.

## Failure modes

**Never fail the call.** Missing `jq`, missing `terminal-notifier`, unwritable
`$TMPDIR`, malformed stdin: `exit 0` silently, `trap 'exit 0' EXIT`. A watchdog
that breaks a Bash call is worse than none.

**Permission-denial false ping.** `PreToolUse` fires before the permission
check, and a call that is then *denied* fires neither `PostToolUse` nor
`PostToolUseFailure` — the denial returns to the model as a tool error with no
post hook event at all. The armed timer therefore always fires: one false
"still running" ping per denied call, for a command that never ran.
Interactively this is rare (a call waiting at an approval prompt, already
announced by a permission notification). In a headless session under a
restricted allowlist it is common and silent — confirmed in the field, where
one automated review session produced ~37 false pings, one per denied call.
The env vars above are the mitigations: `CLAUDE_BASH_WATCHDOG_SECONDS=0` for
sessions nobody watches, and the trace log shows the pattern (`arm` then
`fire`, no `disarm`) when a burst needs diagnosing. A real fix needs a hook
event that fires on denial; none exists today.

**The 120-second race.** A command with an unraised timeout is backgrounded at
exactly 120s — the same moment the timer fires, so the ping is nondeterministic
there. When it does fire it is not wrong: the command is still running, in a
background task. Accepted.

**Esc interrupt.** Whether any post event fires on interrupt is still
unverified (see the duration hook's spec). If none does, the watch file
survives and the operator gets one ping about a command they cancelled
themselves — within the threshold, while at the keyboard. Harmless.

**Sleeper leaks.** A killed session orphans timers; each dies of natural causes
within the threshold. Watch files are swept at session start: the existing
sweep in `session-start.sh` broadens its pattern to cover
`clanker-bash-watch-*`.

**bash 3.2.** `date +%s` and integer arithmetic only, as the sibling hooks.

**Concurrency.** Watch files are keyed by `tool_use_id`, globally unique;
parallel calls never contend, and each in-flight call gets its own timer.

**Backgrounding self-heals.** `run_in_background: true` returns immediately and
disarms. Subagent Bash calls fire hooks too, so the fleet case — the reason
this exists — is covered without any extra work.

## Out of scope

**Killing the stuck command.** Bash's own timeout already kills or backgrounds.
A watchdog that kills would murder a legitimately long build precisely when the
operator is away — the unattended case this hook exists to serve.

**Re-notification.** One ping per call. The 10-minute tool ceiling bounds the
un-noticed tail.

**A session daemon scanning the duration hook's stamps.** Zero per-call cost
and free re-pings, but it pings on stamps orphaned by denied permissions,
double-pings under concurrent sessions, and needs lifetime management of its
own. Rejected.

**Folding into `bash-duration.sh`.** One jq pass for both, but it couples
agent-facing context with human-facing notification and mixes opposite state
lifetimes; neither could be disabled without editing code. Rejected.

**A channel fallback chain** (`terminal-notifier` → `osascript` → configurable
command). Rejected for one documented dependency; anyone wanting different
delivery edits one obvious line.

## Verification

Synthetic harness like the duration hook's, with `terminal-notifier` stubbed by
a fake on `$PATH` that records its arguments; the threshold shrinks via the env
var so nothing waits two minutes.

| case | expected |
|---|---|
| armed, disarmed before threshold | stub never called |
| armed, threshold passes | one stub call; message carries command + project |
| `agent_id` present | message carries the subagent marker |
| non-zero exit (`PostToolUseFailure`) | disarms, stub never called |
| `terminal-notifier` absent | exit 0, no stdout |
| log opted in, armed → fired | `arm` and `fire` lines, tool + session ids |
| log opted in, disarmed | `disarm` then `expire` lines, no `fire` |
| log unset | no log file, behavior unchanged |
| unwritable `$TMPDIR` | exit 0, no stdout |
| malformed stdin | exit 0, no stdout |
| Pre side latency | returns in milliseconds despite the live timer |

Then a live check in a fresh session: `sleep 150` produces exactly one Sosumi
ping naming `sleep 150`; a fast command produces nothing.
