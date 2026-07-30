#!/usr/bin/env bash
# Report how long a slow Bash call took, as context on its own result.
#
# Claude Code records no duration for a Bash call, so an agent that just paid
# four minutes for a test suite has nothing in context saying so, and pays it
# again. This measures the gap between the two hook events that bracket the
# call and reports it when it crosses a threshold.
#
#   PreToolUse                       stamp the start time
#   PostToolUse / PostToolUseFailure elapsed; emit if over threshold
#
# Both post events are registered: a non-zero exit is handled as a tool error
# and is expected to arrive at PostToolUseFailure. Whichever fires consumes the
# stamp, so neither double-reports.
#
# Targets bash 3.2 (macOS): no EPOCHREALTIME, no associative arrays, whole
# seconds only. Never exits nonzero and never blocks a call.

set -u
trap 'exit 0' EXIT   # a duration reporter must never fail a Bash call

THRESHOLD="${CLAUDE_SLOW_BASH_SECONDS:-30}"
STATE_DIR="${TMPDIR:-/tmp}"

command -v jq >/dev/null 2>&1 || exit 0

input=""
[ -t 0 ] || input="$(cat)"
[ -n "$input" ] || exit 0

# One jq pass: the post side needs six fields, and a second invocation would
# double the cost of a hook that runs on every Bash call.
#
# Joined on the ASCII unit separator, NOT a tab. Tab counts as IFS whitespace,
# so `read` collapses a run of them into one delimiter — an absent agent_id
# would drop its field and shift every later value one position left.
fields="$(printf '%s' "$input" | jq -r '
  [ (.hook_event_name // "")
  , (.tool_use_id // "")
  , (.session_id // "")
  , (.agent_id // "")
  # An error result arrives as a string rather than an object, so guard the type
  # before reaching into it. A string means a non-zero exit, which is reported.
  , ((.tool_response // .tool_result // {}) | if type == "object"
       then ((.interrupted // false) | tostring) else "false" end)
  , ((.tool_response // .tool_result // {}) | if type == "object"
       then ((.timedOutAfterMs // "") | tostring) else "" end)
  ] | join("\u001f")' 2>/dev/null)"
[ -n "$fields" ] || exit 0

IFS=$'\037' read -r event tool_id session agent interrupted timed_out <<EOF
$fields
EOF
[ -n "$event" ] && [ -n "$tool_id" ] || exit 0

stamp="$STATE_DIR/clanker-bash-start-$tool_id"

if [ "$event" = "PreToolUse" ]; then
  # The braces matter: `2>/dev/null` on the command alone silences date, not the
  # shell's own "cannot open" message when $TMPDIR is unwritable.
  { date +%s > "$stamp"; } 2>/dev/null
  exit 0
fi

[ -f "$stamp" ] || exit 0
started="$(cat "$stamp" 2>/dev/null)"
rm -f "$stamp" 2>/dev/null

# A stamp that is not a plain integer is corrupt; stay quiet rather than guess.
case "$started" in
  ''|*[!0-9]*) exit 0 ;;
esac

[ "$interrupted" = "true" ] && exit 0   # cancelled: the duration means nothing
[ -n "$timed_out" ] && exit 0           # the tool already reports timedOutAfterMs

elapsed=$(( $(date +%s) - started ))
[ "$elapsed" -ge "$THRESHOLD" ] || exit 0

if [ "$elapsed" -lt 60 ]; then
  pretty="$(printf '%ds' "$elapsed")"
elif [ "$elapsed" -lt 3600 ]; then
  pretty="$(printf '%dm%02ds' $((elapsed / 60)) $((elapsed % 60)))"
else
  pretty="$(printf '%dh%02dm' $((elapsed / 3600)) $(((elapsed % 3600) / 60)))"
fi

# Expand once per session, and per agent within it: subagents may share the
# parent's session id, and without agent_id in the key whichever call landed
# first would eat the expansion and every subagent would miss its instruction.
marker="$STATE_DIR/clanker-bash-seen-${session:-nosession}-${agent:--}"

if [ -f "$marker" ]; then
  line="This command took $pretty."
elif [ -n "$agent" ]; then
  line="This command took $pretty. Bash calls over ${THRESHOLD}s get their duration reported here; faster ones stay silent. Don't work around a slow command on your own — report it to your orchestrator with the duration and let it decide."
else
  line="This command took $pretty. Bash calls over ${THRESHOLD}s get their duration reported here; faster ones stay silent. If a duration looks out of place for what the command does, investigate it rather than re-running — and if it looks like a real problem, say so to the user. For work you now know is slow, prefer run_in_background or a narrower target."
fi
{ : > "$marker"; } 2>/dev/null

jq -cn --arg e "$event" --arg c "$line" \
  '{hookSpecificOutput: {hookEventName: $e, additionalContext: $c}}'
