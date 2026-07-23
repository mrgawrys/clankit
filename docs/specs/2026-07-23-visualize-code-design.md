# visualize-code — Design

**Status:** Implemented (built directly from this spec, no separate plan)
**Date:** 2026-07-23
**Home:** `plugins/clankit-dev/skills/visualize-code/`

## What it is

A skill that turns "help me understand this PR / plan / subsystem" into an
interactive map in the browser: modules as boxes, their interfaces and
dependencies as typed arrows, at the altitude John Ousterhout's *A Philosophy
of Software Design* argues code should be understood — interfaces over
internals, dependencies made visible.

Terminal ASCII diagrams fail for this; even simple ones get hard to follow.
The output here is a single local HTML file opened in the user's browser.
Nothing is hosted; code never leaves the machine.

## Goals and non-goals

**Goals**

- One picture that answers the user's actual question about structure: what
  modules exist, what each exports, who calls whom, where the async and data
  boundaries are.
- Work on PRs, plan documents, and named subsystems, in any language —
  extraction is semantic (Claude reads and understands), not static analysis.
- Curated first, complete underneath: the initial frame shows what matters;
  the rest is one click away; any cut scope is disclosed on the page.
- Cheap to re-run: the renderer is written once; each invocation produces only
  a compact JSON model.

**Non-goals (v1)**

- Diff/impact coloring. The map draws the neighborhood, not the delta. Small
  `NEW` chips on added functions are the only change markers.
- Flow/sequence view ("what happens in what order"). Planned as v2; the data
  format must not block it.
- Raw source display. The deepest level is signature + plain-English summary.
- Mechanical completeness. This is a whiteboard sketch by a senior dev, not a
  generated call graph.

## Skill shape

```
visualize-code/
├── SKILL.md              # triggers, workflow, curation rules
├── references/
│   ├── model-schema.md   # the JSON contract (below), with budget guidance
│   └── extraction.md     # what to hunt for when reading code/plans
└── assets/
    └── renderer.html     # self-contained viewer template (vanilla JS, no CDN)
```

**Triggers:** "visualize / map / draw the structure of X", "help me understand
how X is organized", "show me this PR/plan as a diagram".

**Workflow per invocation:**

1. **Scope.** Identify the subject and size it. Under ~15 modules: extract
   everything in scope, curate via `initialFrame`. Over: cut to what answers
   the question and record the cut in `meta.curation`.
2. **Extract.** Produce the JSON model. Small scope: inline. Large scope:
   dispatch one read-only subagent whose sole deliverable is the model, so the
   main conversation never ingests the file dumps.
3. **Render.** Copy `renderer.html` to a temp/scratch location and write the
   model beside it as a `visualize-code-model.js` sidecar (`window.VISUALIZE_CODE_MODEL =
   {...}`, loaded via `<script src>` — works from `file://`, no injection
   step). Open in the browser; re-runs rewrite the sidecar + refresh.
4. **Hand off.** One line in the terminal: what was mapped, what was left out.

## The JSON model (stable contract)

Extraction and renderer evolve independently against this schema. Versioned
from day one.

```jsonc
{
  "version": 1,
  "meta": {
    "title": "...", "subtitle": "repo · source",
    "question": "the user question this map answers",
    "generated": "2026-07-23", "source": "PR #123 | docs/plans/x.md | commit",
    "curation": { "note": "...", "omitted": ["..."], "reason": "..." }
  },
  "groups":  [ { "id": "web", "label": "Web layer" } ],
  "modules": [ {
    "id": "create_shipment", "group": "actions", "kind": "action",
    "name": "Actions.CreateShipment", "summary": "one sentence",
    "functions": [ { "id": "run_2", "name": "run/2", "sig": "run(order, opts)",
                     "summary": "1-2 sentences", "new": true } ]
  } ],
  "edges": [ { "from": "create_shipment.run_2", "to": "manifest.preview_1",
               "type": "calls", "label": "shown on hover" } ],
  "initialFrame": { "expanded": ["manifest", "create_shipment"], "focus": null }
}
```

Load-bearing choices:

- **Layout is semantic.** Group order is layer order (top row → bottom row).
  The renderer only stacks and routes; the layers carry architectural meaning.
  No graph-layout engine.
- **Three edge types, fixed:** `calls` (blue, solid), `fires` (orange, dashed —
  async, jobs, events), `data` (aqua, dotted — reads, writes, persists). Line
  style pairs with color so color never carries meaning alone. Nuance goes in
  the edge `label`.
- **Endpoints are `module` or `module.function`.** One convention serves
  collapsed boxes, expanded boxes, and focus views.
- **`initialFrame` encodes curation as data**, not renderer logic.
- **Budget guidance** (in `model-schema.md`): ≤ ~15 modules, ≤ ~5 functions
  shown per module, one-line summaries.

## Renderer: hybrid navigation

Validated with three side-by-side prototypes on a real backend design plan
(prototypes and that model live outside this public repo). The hybrid won:

- **Canvas (default):** all modules in their layers. Clicking a module header
  expands it in place; arrows re-attach to the exact functions. Context stays
  visible.
- **Focus (per module, `⤢` button):** the module alone — functions in the
  center, callers as clickable stubs left, callees right. Chaining stub clicks
  walks the graph like a call chain.
- **Ways back** (all preserve canvas expansion state): browser Back (focus
  jumps are history entries, `#focus=<id>` deep links), a prominent
  `← Canvas` button, and Esc. (Background click was dropped — too easy to hit
  accidentally. Query-string deep links became hash links: `pushState` query
  rewrites throw SecurityError on `file://`.)
- **Ground floor:** clicking any function shows signature, summary, called-by,
  and calls in a side panel.
- Light/dark follow the OS. Edge labels appear on hover. The footer shows the
  curation disclosure and generation date/source.

## Extraction guidance (the Ousterhout lens)

For `references/extraction.md`:

- Modules at the meaningful grain — a context, an action, a schema — not one
  node per file. Group by architectural layer.
- Interfaces over internals: public functions, injected services, implemented
  behaviours. Private helpers only when the question is about them.
- Label the interesting edges: layer-crossing calls, one-seam-many-callers,
  async boundaries, lock/transaction points. Leave boring edges unlabeled.
- Summaries say why a thing exists, not what the code literally does.
- Plans: extract the proposed structure; mark additions `new: true`.

## Testing

- The skill ships a sanitized example model as a fixture. Render it and
  screenshot it headless (Playwright CLI) on renderer changes; eyeball for
  collisions and overflow.
- Extraction is judged the honest way: run the skill on a real plan or PR and
  read the JSON against the source.

## Deferred (tracked in the implementation plan)

- Edge-routing polish at higher module densities; text truncation tuning.
- Flow/sequence view (v2): a `flows` array of ordered steps referencing
  existing endpoints, rendered as a switchable mode.
- Optional static-analysis assist to pre-seed the edge list where cheap tools
  exist; semantic extraction remains the foundation.
