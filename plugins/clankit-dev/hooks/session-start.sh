#!/usr/bin/env bash
# SessionStart hook — inject the flow bootstrap into every session.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BOOTSTRAP="$(cat "${SCRIPT_DIR}/../bootstrap.md")"

# Parameter substitution beats a per-character loop by orders of magnitude.
escape_for_json() {
    local s="$1"
    s="${s//\\/\\\\}"; s="${s//\"/\\\"}"
    s="${s//$'\n'/\\n}"; s="${s//$'\r'/\\r}"; s="${s//$'\t'/\\t}"
    printf '%s' "$s"
}

printf '{\n  "hookSpecificOutput": {\n    "hookEventName": "SessionStart",\n    "additionalContext": "%s"\n  }\n}\n' \
  "$(escape_for_json "$BOOTSTRAP")"
