#!/usr/bin/env bash
# Ping the operator when a Bash call has been running past a threshold.
#
# An operator running several agents cannot see that one of them has been stuck
# on a Bash call for minutes. bash-duration.sh tells the agent what a slow call
# cost, after the fact; this tells the human while it is still running.
#
#   PreToolUse                       arm: write the watch file, spawn a timer
#   PostToolUse / PostToolUseFailure disarm: delete the watch file
#
# The timer sleeps out the threshold and notifies only if the watch file is
# still there. Disarm is a delete, not a kill: the sleeper wakes, finds nothing,
# and exits, so there is no PID to track and no kill to race.
#
# Both post events are registered for the reason bash-duration.sh documents: a
# non-zero exit arrives at PostToolUseFailure, and a failing slow command must
# still disarm or the operator gets pinged about a command that already returned.
#
# Targets bash 3.2 (macOS): whole seconds, no associative arrays. Never exits
# nonzero and never blocks a call.

set -u
trap 'exit 0' EXIT   # a watchdog that breaks a Bash call is worse than none

THRESHOLD="${CLAUDE_BASH_WATCHDOG_SECONDS:-120}"
STATE_DIR="${TMPDIR:-/tmp}"

# A threshold that is not a positive integer would make `sleep` fail instantly
# and fire the notification the moment the call started. Stay inert instead.
case "$THRESHOLD" in
  ''|*[!0-9]*) exit 0 ;;
esac
[ "$THRESHOLD" -gt 0 ] || exit 0

command -v jq >/dev/null 2>&1 || exit 0
# No notifier means nothing to arm for: no watch file, no timer, on either side.
command -v terminal-notifier >/dev/null 2>&1 || exit 0

input=""
[ -t 0 ] || input="$(cat)"
[ -n "$input" ] || exit 0

# One jq pass, joined on the ASCII unit separator rather than a tab: tab counts
# as IFS whitespace, so `read` would collapse a run of them and an absent
# agent_id would shift every later value one position left.
#
# The command is reduced to its first line inside jq — a newline in a field would
# end `read` early and truncate the record, not just the command.
fields="$(printf '%s' "$input" | jq -r '
  [ (.hook_event_name // "")
  , (.tool_use_id // "")
  , ((.tool_input // {}) | if type == "object" then (.command // "") else "" end
     | split("\n")[0]
     # A command may legitimately contain the separator; left in, it would end
     # the field early and shift cwd and agent_id into the message text.
     | gsub("\u001f"; "")
     | if length > 60 then .[0:57] + "..." else . end)
  , (.cwd // "")
  , (.agent_id // "")
  ] | join("\u001f")' 2>/dev/null)"
[ -n "$fields" ] || exit 0

IFS=$'\037' read -r event tool_id cmd cwd agent <<EOF
$fields
EOF
[ -n "$event" ] && [ -n "$tool_id" ] || exit 0

watch="$STATE_DIR/clanker-bash-watch-$tool_id"

if [ "$event" != "PreToolUse" ]; then
  rm -f "$watch" 2>/dev/null
  exit 0
fi

[ -n "$cmd" ] || exit 0   # nothing to announce

if [ "$THRESHOLD" -lt 60 ]; then
  pretty="$(printf '%ds' "$THRESHOLD")"
elif [ "$THRESHOLD" -lt 3600 ]; then
  pretty="$(printf '%dm%02ds' $((THRESHOLD / 60)) $((THRESHOLD % 60)))"
else
  pretty="$(printf '%dh%02dm' $((THRESHOLD / 3600)) $(((THRESHOLD % 3600) / 60)))"
fi

# Which repo, so a fleet spread across checkouts says where to look; and whether
# it is a subagent, because a stuck background agent and a stuck main-session
# call warrant different reactions.
where="${cwd##*/}"
where="${where:-unknown}"
[ -n "$agent" ] && where="$where, subagent"

# The file holds the finished message rather than its parts: the timer needs no
# parsing, and reading it is both the survival check and the payload.
#
# The braces matter: `2>/dev/null` on printf alone silences printf, not the
# shell's own "cannot open" message when $TMPDIR is unwritable.
msg="Still running after $pretty: $cmd ($where)"
{ printf '%s\n' "$msg" > "$watch"; } 2>/dev/null || exit 0

# All three fds must be redirected. The subshell inherits the hook's stdout pipe
# and Claude Code waits for that pipe to close, so without this the hook blocks
# every Bash call for the full threshold.
( sleep "$THRESHOLD"
  # One read, so a disarm landing between an existence test and the read cannot
  # announce a command that already finished.
  payload="$(cat "$watch" 2>/dev/null)"
  [ -n "$payload" ] || exit 0
  terminal-notifier -title "Clanker" -sound Sosumi -message "$payload"
  rm -f "$watch" 2>/dev/null
) </dev/null >/dev/null 2>&1 &

exit 0
