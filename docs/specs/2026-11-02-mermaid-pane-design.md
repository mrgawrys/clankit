# Mermaid pane — Design

> **To act on this design:** pick a mode — *vibe* (inline, no machinery),
> *review each task* (per-task diffs), *review at the end* (one subagent
> builds, one review at the end), or *plan first* (`writing-plans`, then how it gets built).
> Ask the user which; don't pick for them.

## Problem

Claude Code's terminal shows a ```` ```mermaid ```` block as source. A diagram
drafted in chat — for a PR body, a spec, an explanation — can't be seen until
it lands somewhere that renders it, so it gets posted unseen or rendered by
hand.

## What it is

A hooks module (a mod) inside the `clankit-dev` plugin. When Claude's reply
contains Mermaid blocks, a pane beside the chat opens with them rendered as
real images.

Scope: Claude's chat replies only. Not files written or edited, not a command
to render an arbitrary file — both can be added later on the same renderer.

## Step 1 — feasibility check, before anything else

A kitty-graphics image drawn directly inside a terminal multiplexer pane can
render crisp. Claude Code's `Image` element documents kitty, Ghostty, iTerm2
and tmux, not other multiplexers, so under one it may decide the terminal
can't draw and show `alt`.

1. A throwaway pane draws one known PNG with `Image`, run in the multiplexer.
2. Confirm `clankit-dev/hooks/hooks.json` can carry the `modules` entry next to
   its existing classic `hooks` and that both still run.

If either fails, **stop and ask the user.** Fallbacks on the table: text art
(e.g. `mermaid-ascii`) in the pane, or opening a multiplexer floating pane
that draws the PNG itself. Neither is built speculatively.

## Behaviour

```
┌─ chat ───────────────────────────────┬─ Diagrams ──────────── ◀ 1/2 ▶ ─┐
│ …reply with a ```mermaid block…      │                                  │
│                                      │   [ rendered diagram ]           │
│ > _                                  │  flowchart · open full size ↗    │
└──────────────────────────────────────┴──────────────────────────────────┘
```

- **Trigger:** a turn ends (`turn.complete`) and the reply holds at least one
  Mermaid block → the pane opens, or updates if open, with that reply's
  diagrams. A reply without Mermaid leaves the pane as it is.
- **Several diagrams:** one at a time, ◀ ▶ and an `n/m` counter.
- **Size:** fits the pane width, aspect kept. "Open full size ↗" opens the PNG
  in the OS viewer (`open` on macOS, `xdg-open` elsewhere).
- **Rendering:** the pane shows "Rendering…" until the image arrives.
- **Render failure:** the first line of the renderer's error in place of that
  diagram's image — a broken diagram is visible, never silently missing.
- **Narrow terminal:** a pane opened unasked only seats above a width
  threshold. When it doesn't seat, a toast: "1 diagram — /mermaid to view".
- **`/mermaid`:** reopens the last diagrams, or closes the pane when open. A
  pane the person opens seats at any width.
- **Theme:** white background, matching how GitHub's light theme shows it.

## Components

| Unit | In → out | Depends on |
|---|---|---|
| Extract | reply text → ordered Mermaid sources | nothing (pure) |
| Render | one source → `{ png }` or `{ error }` | `mmdc`, source on stdin, PNG to a temp dir |
| State | current reply's diagrams + shown index | `$.state` (survives reloads) |
| Pane + command | draws state; ◀ ▶, full size, `/mermaid` | state; OS `open` |

Flow: `turn.complete` → extract → none: stop · some: open pane, state =
rendering → render each in order, writing state as each finishes → pane
redraws on each write.

- **Finding `mmdc`:** a CLI installed under a Node version manager may not be
  on Claude Code's own `PATH`. At `session.start` resolve it through the
  user's login shell (`$SHELL -lc 'command -v mmdc'`) and keep the absolute
  path; a `userConfig` option overrides it. Not found → the pane says
  "mmdc not found — install @mermaid-js/mermaid-cli".
- **Cache:** results keyed by source hash, so `/mermaid` and paging never
  re-render.

## Testing

| Seam | How | Catches |
|---|---|---|
| Extract | unit test on reply text | order; non-Mermaid fences ignored; unclosed fence doesn't throw |
| Pane | `claude plugin test`, state seeded | counter and paging, error line, mmdc-not-found message |
| Render + live pane | verification run in a real session, no mocks | a reply with two diagrams, one broken: pane opens, pages, shows the error, full size opens the viewer |

The renderer is not mocked: a fake `mmdc` tests only the fake.
