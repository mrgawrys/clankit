#!/usr/bin/env bash
# SessionStart hook — inject the flow bootstrap into every session.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BOOTSTRAP="$(cat "${SCRIPT_DIR}/../bootstrap.md")"

# Sweep bash-duration stamps and markers, and bash-watchdog watch files, orphaned
# by a denied permission or a killed session. Once per session, because a per-call
# sweep would cost more than the bytes it reclaims. Sweeping a marker costs at
# worst one re-expanded duration message in a session older than 12 hours.
find "${TMPDIR:-/tmp}" -maxdepth 1 \
  \( -name 'clanker-bash-start-*' -o -name 'clanker-bash-seen-*' \
     -o -name 'clanker-bash-watch-*' \) \
  -mmin +720 -delete 2>/dev/null || true

# Parameter substitution beats a per-character loop by orders of magnitude.
escape_for_json() {
    local s="$1"
    s="${s//\\/\\\\}"; s="${s//\"/\\\"}"
    s="${s//$'\n'/\\n}"; s="${s//$'\r'/\\r}"; s="${s//$'\t'/\\t}"
    printf '%s' "$s"
}

printf '{\n  "hookSpecificOutput": {\n    "hookEventName": "SessionStart",\n    "additionalContext": "%s"\n  }\n}\n' \
  "$(escape_for_json "$BOOTSTRAP")"
