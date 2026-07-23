# Extraction guidance — the Ousterhout lens

What to hunt for when reading code or a plan to build the model. The altitude
is *A Philosophy of Software Design*: interfaces over internals, dependencies
made visible. You are drawing the picture a senior dev would sketch on a
whiteboard, not dumping a call graph.

## Modules: the meaningful grain

- One box per **architectural unit** — a context, an action, a schema, a
  worker, a service — not one box per file. Merge trivial satellites into the
  unit they serve; split a file only when it genuinely contains two units.
- **Group by layer**, and order groups caller→callee (top→bottom): web/entry
  points first, domain in the middle, persistence/infrastructure last.
- `kind` is a one-word classification chip (`context`, `action`, `schema`,
  `worker`, `channel`, `service`…). Use the codebase's own vocabulary.

## Functions: interfaces over internals

- List the **public interface**: exported/public functions, callback
  implementations, behaviour/protocol/interface implementations, injected
  service entry points.
- Skip private helpers unless the user's question is specifically about them.
- Order function lists by importance to the question, not alphabetically.

## Edges: make dependencies visible

Hunt specifically for:

- **Layer-crossing calls** — web reaching into domain, domain into data.
- **One seam, many callers** — a function several modules converge on; these
  are the load-bearing interfaces.
- **Async boundaries** — job enqueues, event emissions, message sends,
  PubSub broadcasts. Always type `fires`; these are where stack traces end
  and are the easiest structure to miss when reading.
- **Data touchpoints** — reads, writes, cache access, external stores. Type
  `data`.
- **Lock/transaction points** — note them in the edge `label` (e.g. "inside
  the run transaction", "advisory lock").

Label the interesting edges only: the layer-crossers, the convergence seams,
the async and transactional boundaries. Leave boring edges (obvious delegation
one layer down) unlabeled.

## Summaries: why, not what

A summary earns its line by saying why the thing exists or what design tension
it resolves — not by restating the code. "Serializes run creation so
concurrent submits can't double-charge" beats "creates a run".

When a module resolves a real design tension — a serialization point, a
compatibility shim, a cache with an invalidation story — put the one-line
what-tension-it-resolves in `summary` and the fuller story in `description`:
invariants, transaction/concurrency notes, what downstream code assumes. Same
"why, not what" altitude, just with room to breathe. The description replaces
the summary when the module is expanded, so write it to stand alone. Most
modules should not have one — an all-described diagram is the same noise as an
all-labeled edge set.

## Plans and PRs

- **Plans:** extract the *proposed* structure as if it existed. Mark every
  added function `"new": true`. Existing modules the plan touches go on the
  diagram too — the neighborhood, not just the delta.
- **PRs:** same — draw the neighborhood the diff lives in, with `NEW` chips on
  added functions. Do not color by diff status; the diagram shows structure,
  not change size.

## Curation

Answer `meta.question` and stop. When scope exceeds the budget in
`model-schema.md`, cut whole subtrees rather than thinning every module, and
record the cut in `meta.curation`. Set `initialFrame.expanded` to the modules
on the critical path of the answer — the first paint should be readable in
five seconds.
