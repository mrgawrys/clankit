# clankit-dev

Dev/work skills and hooks for Claude Code: planning, review, autopilot, and a
couple of Bash-call observability hooks.

## Dependencies

- **`jq`** — both Bash hooks (`bash-duration.sh`, `bash-watchdog.sh`) parse
  hook JSON with it. Without `jq` on `PATH`, they're silently inert.
- **`terminal-notifier`** (`brew install terminal-notifier`) — the watchdog
  hook sends its desktop notification through it. Without it, the watchdog is
  inert; the duration hook doesn't need it.
- **`node`** — `qa-run`'s report generator is a dependency-free ES module run
  with plain `node`; nothing to install.

## Tunables

- `CLAUDE_SLOW_BASH_SECONDS` — threshold in seconds before `bash-duration.sh`
  reports a call as slow. Default 30.
- `CLAUDE_BASH_WATCHDOG_SECONDS` — threshold in seconds before
  `bash-watchdog.sh` pings that a call is still running. Default 300.
  Set to `0` to disable the watchdog entirely — useful for headless or
  unattended sessions nobody is watching.
- `CLAUDE_BASH_WATCHDOG_LOG` — path of an append-only trace of the watchdog's
  decisions (`arm` / `disarm` / `fire` / `expire`, with tool and session ids).
  Off unless set. Set it when notifications don't add up — the log answers
  which session armed what, and why a ping did or didn't happen.
