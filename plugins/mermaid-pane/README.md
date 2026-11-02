# mermaid-pane

Claude Code's terminal shows a ```` ```mermaid ```` block as source. This mod
renders the Mermaid blocks in Claude's replies to PNG and shows them as images
as soon as the reply ends.

| Where you run Claude Code | What opens |
|---|---|
| Inside Zellij | A floating pane, 90% × 90%, in the tab that holds the session. `←` / `→` page, `o` opens the PNG in the OS viewer, `q` or `Esc` closes. |
| Anywhere else | A **Diagrams** pane beside the chat. `◀` / `▶` page, **open full size ↗** opens the PNG in the OS viewer. |

Several diagrams in one reply are shown one at a time with an `n/m` counter. A
diagram that fails to render shows the first line of the renderer's error in
its place. `/mermaid` shows the last reply's diagrams again; in the pane it
closes the pane when it is open.

Only the reply's final text is read: a diagram written before a tool call, in a
file, or by a subagent is not shown.

## Requirements

- [`mmdc`](https://github.com/mermaid-js/mermaid-cli), the Mermaid CLI:
  `npm install -g @mermaid-js/mermaid-cli`
- Inside Zellij, [`chafa`](https://hpjansson.org/chafa/) draws the image
  (`brew install chafa`, or your distribution's package). Without it the
  diagrams open in the OS viewer instead.
- Outside Zellij, a terminal Claude Code draws images in: kitty, Ghostty,
  iTerm2, or tmux with passthrough. Elsewhere the pane says it can't draw and
  offers the full-size view.

Tools are looked up on your login shell's `PATH`, so a CLI installed under a
Node version manager is found even when Claude Code's own `PATH` lacks it. If
`mmdc` still isn't found, set its absolute path in `/config` under
**mermaid-pane → mmdc path**.

## Install

```
/plugin marketplace add mrgawrys/clankit
/plugin install mermaid-pane@clankit
```

A pane opened on its own needs a wide terminal; on a narrow one a toast says
`1 diagram — /mermaid to view` instead, and `/mermaid` opens it at any width.
