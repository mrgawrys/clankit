# code-map model schema (version 1)

The JSON contract between extraction and the renderer. Extraction produces
this; `assets/renderer.html` consumes it. Neither knows anything else about
the other.

## Shape

```jsonc
{
  "version": 1,
  "meta": {
    "title": "Shipments",                           // required — page heading
    "subtitle": "acme-app · PR #123",               // repo · source, shown under title
    "question": "How does a shipment get created?", // the user question this map answers
    "generated": "2026-07-23",                      // date the map was extracted
    "source": "PR #123",                            // PR # | plan path | commit | subsystem name
    "curation": {                                   // omit entirely if nothing was cut
      "note": "Mapped the shipment-creation path only",
      "omitted": ["admin UI", "returns flow"],
      "reason": "not on the path the question asks about"
    }
  },

  "groups": [                                       // ARRAY ORDER IS LAYOUT ORDER
    { "id": "web", "label": "Web layer" }           // first group = top row
  ],

  "modules": [
    {
      "id": "create_shipment",                      // unique, [a-z0-9_]+
      "group": "web",                               // must match a group id
      "kind": "action",                             // free-form chip: context|action|schema|worker|...
      "name": "Actions.CreateShipment",             // display name
      "summary": "one sentence: why it exists",
      "functions": [
        {
          "id": "run_2",                            // unique within the module
          "name": "run/2",                          // short display name
          "sig": "run(order, opts)",                // signature as written in code
          "summary": "1-2 sentences",
          "new": true                               // optional — renders a NEW chip (plans/PR additions)
        }
      ]
    }
  ],

  "edges": [
    {
      "from": "create_shipment.run_2",              // endpoint: "module" or "module.function"
      "to": "manifest.preview_1",
      "type": "calls",                              // calls | fires | data — nothing else
      "label": "inside the shipment transaction"    // optional — shown on hover; omit for boring edges
    }
  ],

  "initialFrame": {
    "expanded": ["manifest", "create_shipment"],    // module ids expanded on first paint
    "focus": null                                   // or a module id to open in focus view
  }
}
```

## Rules

- **Group order is layer order.** The renderer stacks groups top→bottom in
  array order and does no other layout. Put callers above callees: web at the
  top, data/persistence at the bottom. The layers carry the architectural
  meaning — choose the order deliberately.
- **Three edge types, fixed.** `calls` (blue, solid — synchronous calls),
  `fires` (orange, dashed — async: jobs, events, messages, PubSub), `data`
  (aqua, dotted — reads, writes, persists, caches). Line style pairs with
  color so color never carries meaning alone. Any nuance beyond the type goes
  in the edge `label`.
- **Endpoints are `module` or `module.function`.** Use `module.function` when
  you know the exact function on either end; the renderer attaches the arrow
  to the function row when the module is expanded and falls back to the module
  box when collapsed. Use bare `module` for diffuse dependencies.
- **`initialFrame` encodes curation as data.** The first paint should answer
  `meta.question` by itself: expand the 2–4 modules on the critical path,
  leave the rest collapsed. Don't expand everything.
- **Disclose every cut.** If scope was trimmed, `meta.curation` is mandatory —
  the renderer prints it in the footer so the map never silently pretends to
  be complete.

## Budget

The map is a curated sketch, not an inventory. Stay within:

- **≤ ~15 modules.** More means the scope is wrong — cut and disclose.
- **≤ ~5 functions per module** shown; pick the interface, not the file
  listing. Private helpers only when the question is about them.
- **One-line summaries** for modules; 1–2 sentences for functions.
- **Label only interesting edges** (see `extraction.md`); an all-labeled map
  reads as noise.

## Validity

- Every `module.group` matches a `groups[].id`; every edge endpoint resolves
  to an existing module (and function, if qualified). The renderer skips
  dangling edges with a console warning rather than crashing — but a skipped
  edge is a lie of omission, so get them right.
- Ids: lowercase `[a-z0-9_]+`. Function ids unique per module; module ids
  unique globally.
