# visualize-code: optional module `description` field

Date: 2026-07-23
Status: approved
Extends: `2026-07-23-visualize-code-design.md`

## Problem

Module summaries are capped at one line. That keeps the first paint compact,
but some modules hide a real design story — an invariant, a concurrency
decision, a compatibility shim — that a single line can't carry. The map has
no place for that story short of abusing edge labels or function summaries.

## Decision

Add an optional `description` field to modules: 2–4 sentences, shown only
when the module is expanded or focused. The collapsed card keeps the crafted
one-line `summary`. Depth stays one click away; the first paint is unchanged.

A separate field — not a longer, CSS-clamped summary — because the one-liner
and the paragraph are different sentences: a clamped paragraph truncates
mid-thought, while a crafted summary stands alone.

## Schema (`references/model-schema.md`)

```jsonc
{
  "id": "create_shipment",
  "summary": "serializes shipment creation",
  "description": "Serializes shipment creation so concurrent submits can't double-book the carrier. Wraps the insert and the initial manifest preview in one transaction; everything downstream assumes a shipment exists exactly once."
}
```

- `description` is optional; omitted → behavior identical to today. No
  version bump — additive optional field, version stays 1.
- Budget: ≤ ~4 sentences, and only where the one-liner genuinely can't carry
  the module. Most modules should not have one.

## Extraction (`references/extraction.md`)

Addition to the Summaries section: when a module resolves a real design
tension, put the one-line what-tension-it-resolves in `summary` and the
fuller story — invariants, transaction/concurrency notes, what downstream
code assumes — in `description`. Same "why, not what" altitude. An
all-described map is the same noise as an all-labeled edge set.

## Renderer (`assets/renderer.html`)

- **Expanded module card** (and the focus center card, which renders
  always-open): if `description` is present, it **replaces** the summary
  line. The description subsumes the one-liner; stacking both reads as a
  stutter — the pair works like a commit subject and body.
- **Collapsed cards and focus-view stubs:** one-line summary, exactly as
  today.
- Styling: same type treatment as the summary, allowed to wrap.

## Fixture

Add `description` to 2–3 modules in `assets/fixture-model.json` so renderer
testing exercises both the replaced-summary expanded state and the untouched
collapsed state.

## Out of scope

Function summaries stay at 1–2 sentences.
