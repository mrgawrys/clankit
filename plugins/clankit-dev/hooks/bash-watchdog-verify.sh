#!/usr/bin/env bash
# Verification run for bash-watchdog.sh — the spec's acceptance table, executed.
#
# The hook is driven by JSON on stdin and its whole point is a side effect that
# lands later, in another process, so it earns a driver that fabricates the
# events rather than unit tests. `terminal-notifier` is stubbed by a fake earlier
# on $PATH that appends its argv to a log, and the threshold shrinks through the
# env var so nothing waits two minutes.
#
# Run:  bash plugins/clankit-dev/hooks/bash-watchdog-verify.sh

set -u

HOOK="$(cd "$(dirname "$0")" && pwd)/bash-watchdog.sh"

# The harness itself needs both: jq to stand in for the hook's parser on a $PATH
# without a notifier, perl for sub-second timing bash 3.2 cannot measure.
for tool in jq perl; do
  command -v "$tool" >/dev/null 2>&1 || { echo "$tool required to verify"; exit 1; }
done

SANDBOX="$(mktemp -d)"
trap 'rm -rf "$SANDBOX"' EXIT

LOG="$SANDBOX/notify.log"
: > "$LOG"

pass=0
fail=0

mkdir -p "$SANDBOX/bin" "$SANDBOX/fastbin" "$SANDBOX/nobin"

# The notifier stub: earlier on $PATH than any real terminal-notifier, one line
# per call. Each argument is bracketed rather than space-joined, so the log
# records argv structure — an unquoted payload would reach the real notifier as
# `-message Still` plus a tail of stray arguments, and a flattened log could not
# tell that apart from a correct call.
cat > "$SANDBOX/bin/terminal-notifier" <<STUB
#!/bin/bash
for a in "\$@"; do printf '<%s>' "\$a"; done >> "$LOG"
printf '\n' >> "$LOG"
STUB

# A `sleep` that does not, so cases about the message rather than the timing fire
# at once — and so a test of a one-hour threshold leaves no one-hour sleeper.
cat > "$SANDBOX/fastbin/sleep" <<'STUB'
#!/bin/bash
exit 0
STUB

chmod +x "$SANDBOX/bin/terminal-notifier" "$SANDBOX/fastbin/sleep"

# A $PATH with jq but deliberately no terminal-notifier, for the absent case.
ln -s "$(command -v jq)" "$SANDBOX/nobin/jq"

# Emit a hook payload. tool_response is a string when RESP_STRING is set, which
# reproduces the shape a non-zero exit arrives in.
payload() {
  local event="$1" id="$2" cmd="$3" cwd="$4" agent="$5"
  printf '{"hook_event_name":"%s","tool_use_id":"%s","cwd":"%s"' \
    "$event" "$id" "$cwd"
  [ -n "$agent" ] && printf ',"agent_id":"%s"' "$agent"
  printf ',"tool_input":{"command":"%s"}' "$cmd"
  if [ -n "${RESP_STRING:-}" ]; then
    printf ',"tool_response":"Error: Exit code 1"'
  else
    printf ',"tool_response":{"stdout":"","stderr":"","interrupted":false}'
  fi
  printf '}'
}

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

# Assert the log holds exactly one call, whose line contains $2.
one_call_matching() {
  local name="$1" needle="$2"
  if [ "$(calls)" != "1" ]; then
    fail=$((fail + 1))
    printf '  FAIL  %s\n        expected: 1 notification\n        actual:   %s: %s\n' \
      "$name" "$(calls)" "$(cat "$LOG")"
    return
  fi
  case "$(cat "$LOG")" in
    *"$needle"*) pass=$((pass + 1)); printf '  ok    %s\n' "$name" ;;
    *) fail=$((fail + 1))
       printf '  FAIL  %s\n        expected to contain: %s\n        actual:   %s\n' \
         "$name" "$needle" "$(cat "$LOG")" ;;
  esac
}

reset_log() { : > "$LOG"; }
calls() { wc -l < "$LOG" | tr -d ' '; }
watch_state() {
  [ -f "$SANDBOX/clanker-bash-watch-$1" ] && echo present || echo gone
}

# Poll rather than sleep a fixed span: the ping comes from another process and
# lands when it lands. Only positive cases can poll — proving a ping never
# happens needs a real wait past the threshold.
wait_for_calls() {
  local want="$1" i=0
  while [ "$(calls)" -lt "$want" ] && [ "$i" -lt 40 ]; do sleep 0.1; i=$((i + 1)); done
}

# One second of threshold, the stub ahead of any real notifier.
run() {
  PATH="$SANDBOX/bin:$PATH" TMPDIR="$SANDBOX" \
    CLAUDE_BASH_WATCHDOG_SECONDS="${THRESH:-1}" bash "$HOOK"
}

# The same, with the timer's sleep neutered.
runfast() {
  PATH="$SANDBOX/fastbin:$SANDBOX/bin:$PATH" TMPDIR="$SANDBOX" \
    CLAUDE_BASH_WATCHDOG_SECONDS="${THRESH:-1}" bash "$HOOK"
}

echo "verifying $HOOK"
echo

# --- arming -----------------------------------------------------------------
out="$(payload PreToolUse t-arm "mix test --only slow" /tmp/myproject "" | THRESH=5 run)"
check "PreToolUse emits nothing" "" "$out"
check "PreToolUse writes a watch file" "present" "$(watch_state t-arm)"
check "the watch file carries the message" \
  "Still running after 5s: mix test --only slow (myproject)" \
  "$(cat "$SANDBOX/clanker-bash-watch-t-arm")"

# --- disarmed before the threshold ------------------------------------------
out="$(payload PostToolUse t-arm "mix test --only slow" /tmp/myproject "" | run)"
check "PostToolUse emits nothing" "" "$out"
check "PostToolUse deletes the watch file" "gone" "$(watch_state t-arm)"
sleep 6
check "disarmed before threshold: never notifies" "0" "$(calls)"

# --- the threshold passes ---------------------------------------------------
reset_log
payload PreToolUse t-fire "mix test --only slow" /tmp/myproject "" | run
wait_for_calls 1
one_call_matching "threshold passes: one ping with command and project" \
  "<-message><Still running after 1s: mix test --only slow (myproject)>"
# The whole argv, once: the flags, their order, and the message as one argument.
check "ping argv is exactly title, sound, message" \
  "<-title><Clanker><-sound><Sosumi><-message><Still running after 1s: mix test --only slow (myproject)>" \
  "$(cat "$LOG")"
check "the timer consumes the watch file" "gone" "$(watch_state t-fire)"

# --- subagent marker --------------------------------------------------------
reset_log
payload PreToolUse t-agent "pnpm build" /tmp/myproject agent-7 | run
wait_for_calls 1
one_call_matching "agent_id present: subagent marker" \
  "<-message><Still running after 1s: pnpm build (myproject, subagent)>"

# --- non-zero exit ----------------------------------------------------------
reset_log
payload PreToolUse t-err "false" /tmp/myproject "" | run
out="$(RESP_STRING=1 payload PostToolUseFailure t-err "false" /tmp/myproject "" | run)"
check "PostToolUseFailure emits nothing" "" "$out"
check "PostToolUseFailure disarms" "gone" "$(watch_state t-err)"
sleep 2
check "non-zero exit: never notifies" "0" "$(calls)"

# --- long and multi-line commands -------------------------------------------
# Asserted on the watch file, so the threshold has to outlast the assertion —
# the file is deleted straight after, and the sleeper wakes to nothing.
reset_log
long="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
payload PreToolUse t-long "$long" /tmp/myproject "" | THRESH=5 run
check "over-long command is truncated to 60" "60" \
  "$(sed -n 's/^Still running after 5s: \(.*\) (myproject)$/\1/p' \
       "$SANDBOX/clanker-bash-watch-t-long" | tr -d '\n' | wc -c | tr -d ' ')"
check "truncation is marked with an ellipsis" "yes" \
  "$(grep -q '\.\.\. (myproject)$' "$SANDBOX/clanker-bash-watch-t-long" \
       && echo yes || echo no)"

payload PreToolUse t-multi 'echo one\nrm -rf two' /tmp/myproject "" | THRESH=5 run
check "multi-line command keeps only its first line" \
  "Still running after 5s: echo one (myproject)" \
  "$(cat "$SANDBOX/clanker-bash-watch-t-multi")"

# A command carrying the field separator the hook joins on. Left in, it ends the
# field early and the message picks up cwd and agent_id as command text.
payload PreToolUse t-us 'echo one\u001ftwo' /tmp/myproject "" | THRESH=5 run
check "unit separator in the command is stripped" \
  "Still running after 5s: echo onetwo (myproject)" \
  "$(cat "$SANDBOX/clanker-bash-watch-t-us")"

rm -f "$SANDBOX/clanker-bash-watch-t-long" "$SANDBOX/clanker-bash-watch-t-multi" \
      "$SANDBOX/clanker-bash-watch-t-us"

# --- threshold rendering ----------------------------------------------------
# On the neutered sleep, so the hour-long thresholds cost nothing.
i=0
for spec in "47 47s" "252 4m12s" "3780 1h03m" "60 1m00s" "3600 1h00m"; do
  set -- $spec
  i=$((i + 1))
  reset_log
  payload PreToolUse "t-fmt$i" "sleep 1" /tmp/myproject "" | THRESH="$1" runfast
  wait_for_calls 1
  one_call_matching "threshold ${1}s renders as $2" \
    "<-message><Still running after $2: sleep 1 (myproject)>"
done

# --- never break the call ---------------------------------------------------
reset_log
out="$(payload PreToolUse t-nonotifier "sleep 1" /tmp/myproject "" \
  | env PATH="$SANDBOX/nobin:/usr/bin:/bin" TMPDIR="$SANDBOX" \
        CLAUDE_BASH_WATCHDOG_SECONDS=1 /bin/bash "$HOOK" 2>&1)"
check "terminal-notifier absent: silent" "" "$out"
payload PreToolUse t-nonotifier "sleep 1" /tmp/myproject "" \
  | env PATH="$SANDBOX/nobin:/usr/bin:/bin" TMPDIR="$SANDBOX" \
        CLAUDE_BASH_WATCHDOG_SECONDS=1 /bin/bash "$HOOK" >/dev/null 2>&1
check "terminal-notifier absent: exit 0" "0" "$?"
check "terminal-notifier absent: no watch file" "gone" "$(watch_state t-nonotifier)"

# An absolute interpreter: with PATH emptied, `env` cannot resolve `bash` itself.
out="$(payload PreToolUse t-nojq "sleep 1" /tmp/myproject "" \
  | env PATH="" TMPDIR="$SANDBOX" /bin/bash "$HOOK" 2>&1)"
check "jq absent: silent" "" "$out"

out="$(payload PreToolUse t-ro "sleep 1" /tmp/myproject "" \
  | PATH="$SANDBOX/bin:$PATH" TMPDIR=/nonexistent-xyz \
    CLAUDE_BASH_WATCHDOG_SECONDS=1 bash "$HOOK" 2>&1)"
check "unwritable TMPDIR: silent" "" "$out"
payload PreToolUse t-ro "sleep 1" /tmp/myproject "" \
  | PATH="$SANDBOX/bin:$PATH" TMPDIR=/nonexistent-xyz \
    CLAUDE_BASH_WATCHDOG_SECONDS=1 bash "$HOOK" >/dev/null 2>&1
check "unwritable TMPDIR: exit 0" "0" "$?"

out="$(printf '' | run 2>&1)"
check "empty stdin: silent" "" "$out"
out="$(printf 'not json' | run 2>&1)"
check "malformed stdin: silent" "" "$out"
out="$(printf '{"hook_event_name":"PreToolUse"}' | run 2>&1)"
check "missing tool_use_id: silent" "" "$out"
check "missing tool_use_id: arms nothing" "0" \
  "$(find "$SANDBOX" -maxdepth 1 -name 'clanker-bash-watch-*' | wc -l | tr -d ' ')"

out="$(payload PreToolUse t-bad "sleep 1" /tmp/myproject "" | THRESH=twenty run 2>&1)"
check "non-numeric threshold: silent" "" "$out"
check "non-numeric threshold: arms nothing" "gone" "$(watch_state t-bad)"

sleep 2
check "none of the guard cases notified" "0" "$(calls)"

# --- Pre side latency -------------------------------------------------------
# The hazard the fd redirections exist for: the timer subshell inherits the
# hook's stdout, and a caller reading that pipe waits for every writer to close,
# not for the hook to exit. So this times the read to EOF — the same thing
# Claude Code does — rather than the hook's own exit, which is fast either way.
reset_log
payload PreToolUse t-lat "sleep 300" /tmp/myproject "" > "$SANDBOX/lat.json"
ms="$(PATH="$SANDBOX/bin:$PATH" TMPDIR="$SANDBOX" CLAUDE_BASH_WATCHDOG_SECONDS=5 \
  perl -MTime::HiRes=time -e '
    my $t = time;
    open(my $fh, "-|", "/bin/bash", $ARGV[0]) or die $!;
    local $/; my $ignored = <$fh>; close $fh;
    printf "%d", (time - $t) * 1000;' "$HOOK" < "$SANDBOX/lat.json")"
if [ "$ms" -lt 1000 ]; then
  pass=$((pass + 1))
  printf '  ok    Pre side stdout closes in %sms despite a live timer\n' "$ms"
else
  fail=$((fail + 1))
  printf '  FAIL  Pre side latency\n        expected: <1000ms\n        actual:   %sms\n' "$ms"
fi
rm -f "$SANDBOX/clanker-bash-watch-t-lat"   # disarm the 5s timer before teardown

echo
printf '%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
