#!/usr/bin/env bash
# Verification run for bash-duration.sh — the spec's acceptance table, executed.
#
# The hook is driven by JSON on stdin and measures wall time between two events,
# so it earns a driver that fabricates both rather than unit tests. Elapsed time
# is simulated by back-dating the stamp file.
#
# Run:  bash plugins/clankit-dev/hooks/bash-duration-verify.sh

set -u

HOOK="$(cd "$(dirname "$0")" && pwd)/bash-duration.sh"
SANDBOX="$(mktemp -d)"
trap 'rm -rf "$SANDBOX"' EXIT

pass=0
fail=0

# Emit a post-event payload. tool_response is an object unless RESP_STRING is set,
# which reproduces the shape a non-zero exit arrives in.
payload() {
  local event="$1" id="$2" session="$3" agent="$4" interrupted="$5" timed_out="$6"
  local resp
  if [ -n "${RESP_STRING:-}" ]; then
    resp='"Error: Exit code 1"'
  else
    resp="{\"stdout\":\"\",\"stderr\":\"\",\"interrupted\":$interrupted"
    [ -n "$timed_out" ] && resp="$resp,\"timedOutAfterMs\":$timed_out"
    resp="$resp}"
  fi
  printf '{"hook_event_name":"%s","tool_use_id":"%s","session_id":"%s"' \
    "$event" "$id" "$session"
  [ -n "$agent" ] && printf ',"agent_id":"%s"' "$agent"
  printf ',"tool_input":{"command":"mix test"},"tool_response":%s}' "$resp"
}

# Back-date a stamp so the hook sees $2 seconds of elapsed time.
stamp() { echo $(( $(date +%s) - $2 )) > "$SANDBOX/clanker-bash-start-$1"; }

# Mark a session as having already expanded, so it emits the terse line.
seen() { : > "$SANDBOX/clanker-bash-seen-$1-${2:--}"; }

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    pass=$((pass + 1)); printf '  ok    %s\n' "$name"
  else
    fail=$((fail + 1))
    printf '  FAIL  %s\n        expected: %s\n        actual:   %s\n' \
      "$name" "$expected" "$actual"
  fi
}

# Extract just the additionalContext, so assertions read as prose not JSON.
ctx() { jq -r '.hookSpecificOutput.additionalContext // ""' 2>/dev/null; }

run() { TMPDIR="$SANDBOX" bash "$HOOK"; }

echo "verifying $HOOK"
echo

# --- the stamp itself -------------------------------------------------------
out="$(payload PreToolUse t-pre s1 "" false "" | run)"
check "PreToolUse emits nothing" "" "$out"
check "PreToolUse writes a stamp" "yes" \
  "$([ -f "$SANDBOX/clanker-bash-start-t-pre" ] && echo yes || echo no)"

# --- threshold --------------------------------------------------------------
stamp t-under 5
out="$(payload PostToolUse t-under s1 "" false "" | run)"
check "under threshold is silent" "" "$out"
check "under threshold still consumes the stamp" "gone" \
  "$([ -f "$SANDBOX/clanker-bash-start-t-under" ] && echo present || echo gone)"

# --- first emission expands, second is terse --------------------------------
stamp t-first 252
out="$(payload PostToolUse t-first s-exp "" false "" | run | ctx)"
case "$out" in
  "This command took 4m12s. Bash calls over 30s get their duration reported here;"*"say so to the user."*)
    pass=$((pass + 1)); printf '  ok    first emission expands, main-agent wording\n' ;;
  *) fail=$((fail + 1)); printf '  FAIL  first emission expands\n        actual: %s\n' "$out" ;;
esac

stamp t-second 252
out="$(payload PostToolUse t-second s-exp "" false "" | run | ctx)"
check "second emission is terse" "This command took 4m12s." "$out"

# --- subagent wording, and its own expansion --------------------------------
stamp t-agent 252
out="$(payload PostToolUse t-agent s-exp agent-7 false "" | run | ctx)"
case "$out" in
  *"report it to your orchestrator with the duration"*)
    pass=$((pass + 1)); printf '  ok    subagent expands separately from the parent session\n' ;;
  *) fail=$((fail + 1)); printf '  FAIL  subagent wording\n        actual: %s\n' "$out" ;;
esac

# --- suppression guards -----------------------------------------------------
stamp t-int 252
out="$(payload PostToolUse t-int s2 "" true "" | run)"
check "interrupted is silent" "" "$out"

stamp t-timeout 252
out="$(payload PostToolUse t-timeout s2 "" false 120000 | run)"
check "timedOutAfterMs is silent" "" "$out"

out="$(payload PostToolUse t-missing s2 "" false "" | run)"
check "no stamp is silent" "" "$out"

echo "corrupt" > "$SANDBOX/clanker-bash-start-t-corrupt"
out="$(payload PostToolUse t-corrupt s2 "" false "" | run)"
check "corrupt stamp is silent" "" "$out"

# --- the error-result shape -------------------------------------------------
seen s3
stamp t-err 252
out="$(RESP_STRING=1 payload PostToolUse t-err s3 "" false "" | run | ctx)"
check "string tool_response (non-zero exit) still reports" \
  "This command took 4m12s." "$out"

stamp t-fail 252
out="$(RESP_STRING=1 payload PostToolUseFailure t-fail s3 "" false "" | run | ctx)"
check "PostToolUseFailure behaves like PostToolUse" \
  "This command took 4m12s." "$out"

stamp t-ev 252
out="$(payload PostToolUseFailure t-ev s3 "" false "" | run \
  | jq -r '.hookSpecificOutput.hookEventName')"
check "hookEventName echoes the firing event" "PostToolUseFailure" "$out"

# --- never break the call ---------------------------------------------------
# An absolute interpreter: with PATH emptied, `env` cannot resolve `bash` itself.
stamp t-nojq 252
out="$(payload PostToolUse t-nojq s4 "" false "" | env PATH="" TMPDIR="$SANDBOX" /bin/bash "$HOOK" 2>&1)"
check "jq absent: silent" "" "$out"
payload PostToolUse t-nojq s4 "" false "" | env PATH="" TMPDIR="$SANDBOX" /bin/bash "$HOOK" >/dev/null 2>&1
check "jq absent: exit 0" "0" "$?"

out="$(payload PreToolUse t-ro s4 "" false "" | env TMPDIR=/nonexistent-xyz bash "$HOOK" 2>&1)"
check "unwritable TMPDIR: silent" "" "$out"
payload PreToolUse t-ro s4 "" false "" | env TMPDIR=/nonexistent-xyz bash "$HOOK" >/dev/null 2>&1
check "unwritable TMPDIR: exit 0" "0" "$?"

out="$(printf '' | run)"
check "empty stdin: silent" "" "$out"
out="$(printf 'not json' | run 2>&1)"
check "malformed stdin: silent" "" "$out"

# Without the threshold guard the comparison itself errors, so stderr is where
# the failure would show — hence 2>&1 on both.
stamp t-badthresh 252
out="$(payload PostToolUse t-badthresh s4 "" false "" \
  | CLAUDE_SLOW_BASH_SECONDS=thirty run 2>&1)"
check "non-numeric threshold: silent" "" "$out"
stamp t-zerothresh 252
out="$(payload PostToolUse t-zerothresh s4 "" false "" \
  | CLAUDE_SLOW_BASH_SECONDS=0 run 2>&1)"
check "zero threshold: silent" "" "$out"

# --- duration formatting ----------------------------------------------------
seen s-fmt
i=0
for spec in "47 47s" "252 4m12s" "3780 1h03m" "59 59s" "60 1m00s" "3599 59m59s" "3600 1h00m"; do
  set -- $spec
  i=$((i + 1))
  stamp "t-fmt$i" "$1"
  out="$(payload PostToolUse "t-fmt$i" s-fmt "" false "" | run | ctx)"
  check "format ${1}s" "This command took $2." "$out"
done

echo
printf '%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
