#!/usr/bin/env bash
# Keep bake mode alive in every session while its flag is fresh.
#
# The bake skill writes the flag (epoch seconds, one line) and removes it on
# "normal"; this only reads. A fresh flag puts a reminder on every prompt, so
# sessions that never saw /bake pick the mode up and long ones don't drift out
# of it. Anything else — no flag, stale, garbage, no jq — is silence.

set -u
trap 'exit 0' EXIT   # a mode reminder must never fail a prompt

[ -t 0 ] || cat > /dev/null

FLAG="${XDG_STATE_HOME:-$HOME/.local/state}/clankit/bake"
HOURS="${CLANKIT_BAKE_HOURS:-12}"

case "$HOURS" in
  ''|*[!0-9]*) exit 0 ;;
esac

since="$(head -n 1 "$FLAG" 2>/dev/null)" || exit 0
case "$since" in
  ''|*[!0-9]*) exit 0 ;;
esac

age=$(( $(date +%s) - since ))
[ "$age" -ge 0 ] && [ "$age" -lt $(( HOURS * 3600 )) ] || exit 0

command -v jq >/dev/null 2>&1 || exit 0

msg="Bake mode is on (switched on $(( age / 3600 ))h ago, lapses after ${HOURS}h). If the clankit-life:bake skill is not loaded in this session, load it now and follow it. When the user says \"normal\", switch it off: rm -f '$FLAG'"

jq -cn --arg c "$msg" \
  '{hookSpecificOutput: {hookEventName: "UserPromptSubmit", additionalContext: $c}}'
