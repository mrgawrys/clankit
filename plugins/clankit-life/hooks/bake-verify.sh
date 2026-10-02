#!/usr/bin/env bash
# Verification run for bake.sh — the spec's acceptance cases, executed.
#
# The hook reads a flag file and the clock, so it earns a driver that points
# XDG_STATE_HOME at a sandbox and back-dates the flag rather than unit tests.
#
# Run:  bash plugins/clankit-life/hooks/bake-verify.sh

set -u

command -v jq >/dev/null 2>&1 || { echo "jq required to verify"; exit 1; }

HOOK="$(cd "$(dirname "$0")" && pwd)/bake.sh"
SANDBOX="$(mktemp -d)"
trap 'rm -rf "$SANDBOX"' EXIT

FLAG="$SANDBOX/clankit/bake"
mkdir -p "$SANDBOX/clankit"

pass=0
fail=0

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

run() {
  echo '{"hook_event_name":"UserPromptSubmit","prompt":"hej"}' |
    XDG_STATE_HOME="$SANDBOX" bash "$HOOK"
}

flag_hours_ago() { echo $(( $(date +%s) - $1 * 3600 )) > "$FLAG"; }

echo "verifying $HOOK"
echo

flag_hours_ago 0
out="$(run)"
check "fresh flag: emits for UserPromptSubmit" "UserPromptSubmit" \
  "$(printf '%s' "$out" | jq -r '.hookSpecificOutput.hookEventName')"
ctx="$(printf '%s' "$out" | jq -r '.hookSpecificOutput.additionalContext')"
case "$ctx" in
  *clankit-life:bake*"rm -f '$FLAG'"*) check "fresh flag: names the skill and the off switch" ok ok ;;
  *) check "fresh flag: names the skill and the off switch" "skill + rm -f '$FLAG'" "$ctx" ;;
esac

rm -f "$FLAG"
check "no flag: silent" "" "$(run)"

flag_hours_ago 13
check "13h-old flag: silent" "" "$(run)"

echo "lol" > "$FLAG"
out="$(run)"; code=$?
check "garbage flag: silent" "" "$out"
check "garbage flag: exit 0" "0" "$code"

flag_hours_ago 2
check "CLANKIT_BAKE_HOURS=1, 2h-old flag: silent" "" \
  "$(echo '{}' | XDG_STATE_HOME="$SANDBOX" CLANKIT_BAKE_HOURS=1 bash "$HOOK")"

echo $(( $(date +%s) + 3600 )) > "$FLAG"
check "flag from the future: silent" "" "$(run)"

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
