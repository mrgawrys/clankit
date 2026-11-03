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

A plugin of its own in this marketplace, `mermaid-pane` (beside `tomito`;
opt-in, not part of `clankit-dev`). It is a hooks module (a mod). When
Claude's reply contains Mermaid blocks, they are rendered to PNG and shown as
real images, by one of two viewers:

| Environment | Viewer |
|---|---|
| Inside Zellij (`ZELLIJ` set) | a Zellij floating pane that draws the PNG itself |
| Anywhere else | a Claude Code pane beside the chat, drawing with `Image` |

Why two: Claude Code's `Image` draws through kitty, Ghostty, iTerm2 and tmux
(with passthrough), and draws its `alt` everywhere else — including Zellij,
with no override (confirmed by a spike). A program in a Zellij pane writing
kitty graphics itself (`chafa -f kitty`) renders crisp there.

Scope: Claude's chat replies only. Not files written or edited, not a command
to render an arbitrary file — both can come later on the same renderer.

## Behaviour — shared

- **Trigger:** a main-loop turn ends (`turn.complete`, no `agentId`) and its
  `answer` holds at least one Mermaid block. `answer` is the turn's *final
  visible text* only — a diagram in text before a tool call is not seen. A
  reply without Mermaid changes nothing.
- **Several diagrams:** shown one at a time with an `n/m` counter and paging.
- **Render failure:** the first line of the renderer's error in place of that
  diagram — visible, never silently missing.
- **Theme:** white background, matching GitHub's light theme.
- **`/mermaid`:** reopens the last reply's diagrams in the active viewer; in
  the Claude Code pane, closes it when open.
- **Requirements missing:** `mmdc` not found → toast "mermaid-pane: mmdc not
  found — install @mermaid-js/mermaid-cli". Under Zellij with `chafa` not
  found → toast naming `chafa`, and the PNG opens in the OS viewer instead.

## Behaviour — Zellij floating pane

```
┌─ chat (Claude Code) ─────────────────────────────────────────┐
│   ┌─ mermaid 1/2 ─────────────── ← → page · o open · q quit ─┐│
│   │                                                          ││
│   │              [ crisp rendered diagram ]                  ││
│   │                                                          ││
│   └──────────────────────────────────────────────────────────┘│
│ > _                                                          │
└──────────────────────────────────────────────────────────────┘
```

- Opened with `zellij run --floating --close-on-exit` in **the tab that holds
  the Claude Code session's pane** (`--tab-id`, found from `ZELLIJ_PANE_ID`),
  not whichever tab has focus. Sized 90% × 90%.
- It runs a small viewer script shipped in the plugin, given the PNG paths
  (and error texts) for the reply. Keys: `←`/`→` page, `o` opens the current
  PNG in the OS viewer, `q` or `Esc` closes. The image is drawn to fit the
  pane and redrawn on resize.
- A new reply with diagrams while a viewer is open replaces it (close the old
  floating pane, open the new one), so there is never more than one.
- It takes focus when it opens — that is the auto-open trade-off accepted.

## Behaviour — Claude Code pane

```
┌─ chat ───────────────────────────────┬─ Diagrams ──────────── ◀ 1/2 ▶ ─┐
│ …reply with a ```mermaid block…      │   [ rendered diagram ]           │
│ > _                                  │  open full size ↗                │
└──────────────────────────────────────┴──────────────────────────────────┘
```

- The pane opens, or updates if open. "Rendering…" until the image arrives.
- The image fits the pane width, aspect kept; ◀ ▶ page; "open full size ↗"
  opens the PNG in the OS viewer (`open` on macOS, `xdg-open` elsewhere).
- `alt`, for terminals that can't draw: "This terminal can't draw images —
  switch to text view, or open full size ↗".
- **text ⇄ image toggle:** a button in the pane switches the view. Text view
  draws the diagram as box-drawing art from `mermaid-ascii` (run with the
  login `PATH`, cached by source hash like the PNG); its error's first line
  shows in place when it can't draw that diagram. "open full size ↗" stays in
  both views. The choice is kept across sessions (`$.store`). The engine
  doesn't tell a mod whether a terminal draws images, so the person switches —
  the mod never guesses.
- `mermaid-ascii` is optional: not found → text view says "Text view needs
  mermaid-ascii — see the README" instead of the art.
- **Narrow terminal:** a pane opened unasked only seats above a width
  threshold. When it doesn't seat, a toast: "1 diagram — /mermaid to view".
  A pane the person opens seats at any width.

## Components

| Unit | In → out | Depends on |
|---|---|---|
| Extract | answer text → ordered Mermaid sources | nothing (pure) |
| Render | one source → PNG path or error text | `mmdc`; temp dir |
| State | last reply's diagrams (path or error each) + shown index | `$.state` |
| Viewer choice | environment → `zellij` or `pane` | `ZELLIJ`, `chafa` presence |
| Zellij launcher | diagrams → `zellij run …` argv; runs it, closes the previous one | `zellij`, `ZELLIJ_PANE_ID` |
| Viewer script | PNG paths / errors → interactive floating viewer | `chafa`, a POSIX shell |
| Text render | one source → box-drawing text or error text | `mermaid-ascii` (optional) |
| Pane + command | draws state; ◀ ▶, text ⇄ image, full size, `/mermaid` | state; `$.store` for the view; OS `open` |

Flow: `turn.complete` → extract → none: stop · some: render each (cached by
source hash) → state → Zellij launcher, or open/redraw the pane.

- **Finding tools:** CLIs installed under a Node version manager may not be on
  Claude Code's own `PATH`, and `mmdc` needs `node` on `PATH` to start. At
  `session.start` read `PATH` from the user's login shell
  (`$SHELL -lc 'printf %s "$PATH"'`), resolve `mmdc`, `chafa` and `zellij`
  against it, and run every child with that `PATH`. A `userConfig` option
  overrides the `mmdc` path.
- **Files:** `$.fs.read(…, { as: 'bytes' })` resolves `{ base64 }`, which is
  what `Image`'s `{ png }` takes.

## Testing

| Seam | How | Catches |
|---|---|---|
| Extract | unit test on answer text | order; non-Mermaid fences ignored; unclosed fence doesn't throw |
| Zellij launcher argv | unit test on the pure argv builder | right tab id, floating flags, paths passed in order |
| Pane | `claude plugin test`, state seeded | counter and paging, error line, alt text |
| Live, both viewers | verification run in a real session, no mocks | a reply with two diagrams, one broken: under Zellij the floating viewer opens in the session's tab, pages, shows the error, `o` opens the OS viewer; outside Zellij the pane does the same |

The renderer is not mocked: a fake `mmdc` tests only the fake. The live
Zellij run needs the user's eyes — a subagent can't see the screen.
