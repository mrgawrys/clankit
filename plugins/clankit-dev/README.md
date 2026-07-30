# clankit-dev

Dev/work skills and hooks for Claude Code: planning, review, autopilot, and a
couple of Bash-call observability hooks.

## Dependencies

- **`jq`** — both Bash hooks (`bash-duration.sh`, `bash-watchdog.sh`) parse
  hook JSON with it. Without `jq` on `PATH`, they're silently inert.
- **`terminal-notifier`** (`brew install terminal-notifier`) — the watchdog
  hook sends its desktop notification through it. Without it, the watchdog is
  inert; the duration hook doesn't need it.

## Tunables

- `CLAUDE_SLOW_BASH_SECONDS` — threshold in seconds before `bash-duration.sh`
  reports a call as slow. Default 30.
- `CLAUDE_BASH_WATCHDOG_SECONDS` — threshold in seconds before
  `bash-watchdog.sh` pings that a call is still running. Default 120.
