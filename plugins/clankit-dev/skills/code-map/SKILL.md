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

Copy `assets/renderer.html` from this skill's base directory, inject the model
over the `__CODE_MAP_MODEL__` placeholder, and open the result. Write the model
to a scratch file (e.g. `model.json`), then:

```bash
# substitute <skill-dir> with this skill's base directory
python3 - "<skill-dir>/assets/renderer.html" model.json map.html <<'EOF'
import json, sys, pathlib
tpl, model_path, out = sys.argv[1:4]
model = pathlib.Path(model_path).read_text()
json.loads(model)  # fail fast on invalid JSON
model = model.replace("</", "<\\/")  # keep </script> in strings inert
html = pathlib.Path(tpl).read_text().replace("__CODE_MAP_MODEL__", model, 1)
pathlib.Path(out).write_text(html)
EOF
```

Then open `map.html` in the browser (`open` on macOS, `xdg-open` on Linux).
Put both files in a temp/scratch location, not the user's project — unless the
user asks to keep the map.

### 4. Hand off

One line in the terminal: what was mapped and what was left out. Point out the
navigation basics once (click a module to expand, `⤢` to focus, click a
function for details) — the page carries the rest.

## Testing the renderer

Only when changing `assets/renderer.html` itself: render the bundled fixture
(`assets/fixture-model.json`) with the command above, screenshot it headless,
and eyeball for collisions and overflow. Extraction quality is judged by
running the skill on a real plan or PR and reading the JSON against the source.
