---
name: code-map
description: Use when the user wants to visualize, map, or diagram the structure of code — "map this PR", "draw the structure of X", "help me understand how X is organized", "show me this plan as a diagram" — for a PR, a plan document, or a named subsystem in any language. Renders an interactive module/dependency map as a single local HTML file in the browser.
user_invocable: true
---

# code-map

Turn "help me understand this PR / plan / subsystem" into an interactive map in
the browser: modules as boxes, interfaces and dependencies as typed arrows —
interfaces over internals, dependencies made visible. The output is one
self-contained HTML file; nothing is hosted, code never leaves the machine.

This is a whiteboard sketch by a senior dev, not a generated call graph.
Curated first, complete underneath: the initial frame shows what matters, the
rest is one click away, and any cut scope is disclosed on the page.

## Workflow

### 1. Scope

Identify the subject (PR, plan doc, subsystem) and the question the map should
answer. Size it:

- **Under ~15 modules in scope:** extract everything, curate what's initially
  visible via `initialFrame`.
- **Over:** cut to what answers the question and record what was cut in
  `meta.curation` — the renderer displays it in the footer.

### 2. Extract

Produce a JSON model conforming to `references/model-schema.md`. Read
`references/extraction.md` for what to hunt for — module grain, which edges
deserve labels, how to write summaries.

- **Small scope:** read the code/plan and write the model inline.
- **Large scope:** dispatch one read-only subagent whose sole deliverable is
  the model JSON, so the main conversation never ingests the file dumps. Give
  it the schema and extraction references and the user's question.

### 3. Render

Two files side by side in a scratch dir: a copy of the renderer, and the model
as a `code-map-model.js` sidecar — the model JSON prefixed with
`window.CODE_MAP_MODEL = `. The renderer loads the sidecar via `<script src>`,
which works from `file://` with no server and no injection step.

```bash
# substitute <skill-dir> with this skill's base directory
cp "<skill-dir>/assets/renderer.html" "$DIR/map.html"
printf 'window.CODE_MAP_MODEL = ' > "$DIR/code-map-model.js"
cat model.json >> "$DIR/code-map-model.js"
open "$DIR/map.html"          # xdg-open on Linux
```

(Or write `code-map-model.js` directly with the file-write tool — any valid
JSON is a valid JS expression.) On re-runs, rewrite only the sidecar and tell
the user to refresh the tab. Use a temp/scratch location, not the user's
project — unless the user asks to keep the map; then give them both files.

### 4. Hand off

One line in the terminal: what was mapped and what was left out. Point out the
navigation basics once (click a module to expand, `⤢` to focus, click a
function for details) — the page carries the rest.

## Testing the renderer

Only when changing `assets/renderer.html` itself: render the bundled fixture
(`assets/fixture-model.json` as the sidecar, via the commands above),
screenshot it headless, and eyeball for collisions and overflow. Extraction quality is judged by
running the skill on a real plan or PR and reading the JSON against the source.
