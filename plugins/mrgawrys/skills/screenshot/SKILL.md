---
name: screenshot
description: Use when the user asks for a screenshot, screen capture, or "show me" of any web page — a Storybook story, a running dev server, or any local/remote URL. Also use to visually verify how a UI change renders. Drives a real browser interactively via Playwright MCP; you walk the page and capture only when the state is right.
user_invocable: true
---

# Screenshot

Drive a real browser **interactively** and capture when the page is in the state you
want. You navigate, look at the page, act, look again, and screenshot only when ready —
no pre-scripted action pipeline, no guessed waits.

The engine is **Playwright MCP** (a persistent browser session exposed as `browser_*`
tools). If it isn't available, this skill bootstraps it or falls back to a CLI — see
*Getting a runner* below.

## The loop

1. `browser_navigate` to the URL.
2. `browser_snapshot` — read the accessibility tree to see what's actually on the page
   (cheaper and more reliable than screenshotting to "look").
3. Act: `browser_click`, `browser_type`, `browser_fill_form`, `browser_press_key`, etc.
4. `browser_wait_for` on **real content** (a text string or element that only appears once
   the state is ready) — never sleep-and-hope.
5. Repeat 2–4 until the page shows what you want.
6. `browser_take_screenshot` — pass a `filename`. Use `fullPage: true` for the whole
   scrollable page; omit it for the viewport; pass an element `ref` (from a snapshot) for
   one component.
7. **Read the PNG** so you can describe/verify it — never stop at "captured it". The tool
   result tells you where it saved the file; read it from that path.

The capture lands in the server's default output dir (a temp scratch area) and the tool
result reports the path — see *Output location* below.

## Getting a runner

If the `browser_*` tools are already available, just use them. Otherwise resolve a runner
**top-down**, and on first-time setup **ask the user first**:

> This needs a one-time setup. How would you like to do it?
> 1. **Install Playwright MCP, scoped to this repo only** (recommended) — I add it to the
>    project's `.mcp.json`; it loads only when you work in this repo.
> 2. **Use the CLI fallback** — no MCP, adds zero tools to your context.
> 3. **Skip for now.**

- **Never install the MCP globally.** A global MCP loads its tools into *every* session's
  context, and Claude Code can't lazily enable an MCP. Project scope confines the weight
  to the one repo that needs it. Install to `.mcp.json` at the repo root only.
- **Project `.mcp.json` server** (option 1):
  ```json
  {
    "mcpServers": {
      "playwright": {
        "command": "npx",
        "args": ["-y", "@playwright/mcp@latest",
                 "--browser", "chrome", "--headless"]
      }
    }
  }
  ```
  Confirm flags with `npx -y @playwright/mcp@latest --help` before writing them — don't
  guess. **Don't set `--output-dir`** — let captures fall to the server's default temp
  scratch dir (the tool result reports the exact path, so files are always findable, and
  the dir self-prunes). Pinning an output dir would litter a fixed folder with throwaway
  shots; instead decide per capture whether it's a keeper (see *Output location*). The MCP
  loads on the **next** session, not the current one.
- **Headless by default.** You drive via `browser_*` tools and read the a11y snapshot, not
  by watching the window, so a visible browser is just overhead — add `--headless` to the
  args. It's set at server launch and can't be toggled per capture; drop it and restart the
  session on the rare occasion you actually need to watch the browser.
- **CLI fallback** (option 2, or when the MCP can't be installed): drive Playwright via
  whichever package runner exists, in this order — `npx` → `pnpm dlx` → `bunx`. This is
  plain shell, so it adds nothing to context; it's the light path for long sessions.
- **Nothing runnable?** Report exactly what's missing (`node`/`npx`?) and how to install
  it. Don't silently fail.

## Output location

Captures are **throwaway by default** — they land in the server's temp scratch dir and the
tool result gives you the path. That's the right home for a shot you only need to *look at*
(verifying a UI change, reading state). Don't pin `--output-dir`; don't relocate a shot
nobody asked to keep.

Only when the task calls for a **keeper** — "save this to the project folder", "attach it
to the PR", "put it in the deck" — do you move it out: read it from the temp path, then
`mv`/`cp` it to the destination the task implies. The `filename` param only names the file
*within* the scratch dir; the destination is always a deliberate post-capture move.

(CLI fallback mode: you pass the output path per capture, so the same rule applies — temp
unless the task wants it kept.)

## Selector / timing gotchas

- Prefer a `ref` from `browser_snapshot`, or exact `role`/text, over loose substring
  matches (which can match hidden nodes and hang).
- Data panels paint after the shell — `browser_wait_for` a real content string, don't
  screenshot the empty frame.
- For an element shot, snapshot first to get the element's `ref`, then pass it to
  `browser_take_screenshot`.

For authenticated product apps that sit behind login/2FA, this generic skill isn't enough
on its own — use the environment-specific overlay skill that handles login and reuses a
persistent browser profile.
