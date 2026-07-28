#!/usr/bin/env bash
# Report the session's current context-window usage in tokens.
#
# Reads the transcript JSONL and sums the most recent main-chain assistant
# turn's request size — the same figure cc-statusline shows:
#   input_tokens + cache_creation_input_tokens + cache_read_input_tokens
#
# Two modes:
#   * Hook    — Claude Code pipes JSON on stdin (transcript_path, session_id,
#               hook_event_name). Emits an additionalContext line; PostToolUse
#               is throttled so it only speaks when usage jumps.
#   * Manual  — no stdin JSON. Falls back to the newest transcript for the CWD
#               and prints a plain number.

set -euo pipefail

STEP="${CLAUDE_CONTEXT_STEP:-25000}"   # PostToolUse: min growth before re-emitting

input=""
[ -t 0 ] || input="$(cat)"

json_field() { printf '%s' "$input" | jq -r "$1 // empty" 2>/dev/null || true; }

transcript="$(json_field '.transcript_path')"
event="$(json_field '.hook_event_name')"
session="$(json_field '.session_id')"

# Manual invocation: locate the newest transcript for the current directory.
if [ -z "$transcript" ]; then
  slug="$(pwd | sed 's/[/.]/-/g')"
  transcript="$(ls -t "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects/$slug"/*.jsonl 2>/dev/null | head -1 || true)"
fi
[ -n "$transcript" ] && [ -f "$transcript" ] || exit 0

# Sum the last main-chain assistant usage. Scan only the tail so this stays
# cheap when PostToolUse fires against a multi-megabyte transcript; fall back to
# a full scan if the tail happens to hold no assistant turn.
sum_usage() {
  jq -rs '
    [ .[]
      | select(.type == "assistant")
      | select(.isSidechain != true)
      | .message.usage
      | select(. != null)
    ] | last as $u
    | if $u == null then 0
      else ($u.input_tokens // 0) + ($u.cache_creation_input_tokens // 0) + ($u.cache_read_input_tokens // 0)
      end
  '
}
used="$(tail -n 1000 "$transcript" | sum_usage)"
[ "${used:-0}" -gt 0 ] || used="$(sum_usage < "$transcript")"
[ "${used:-0}" -gt 0 ] || exit 0

# Group digits with commas without depending on locale-aware printf.
group() {
  awk -v n="$1" 'BEGIN{
    s = sprintf("%d", n); r = ""
    while (length(s) > 3) { r = "," substr(s, length(s) - 2) r; s = substr(s, 1, length(s) - 3) }
    print s r
  }'
}

line="Context: $(group "$used") tokens used"

# Manual run: just print the number and stop.
if [ -z "$event" ]; then
  echo "$line"
  exit 0
fi

emit() {
  jq -cn --arg e "$event" --arg c "$line" \
    '{hookSpecificOutput: {hookEventName: $e, additionalContext: $c}}'
}

state="${TMPDIR:-/tmp}/clanker-context-${session:-nosession}"

case "$event" in
  PostToolUse)
    # Throttle: stay silent unless usage grew by at least $STEP since last emit.
    last="$(cat "$state" 2>/dev/null || echo 0)"
    if [ "$((used - last))" -ge "$STEP" ]; then
      echo "$used" > "$state"
      emit
    fi
    ;;
  *)
    # UserPromptSubmit (and anything else): always report, reset the baseline.
    echo "$used" > "$state"
    emit
    ;;
esac
