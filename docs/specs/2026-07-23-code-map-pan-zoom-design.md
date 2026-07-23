# code-map: canvas pan and zoom

Date: 2026-07-23
Status: approved
Extends: `2026-07-23-code-map-design.md`

## Problem

The canvas offers one way to move: scrollbars. A map that outgrows the window
gives the reader no overview and no cheap way to travel across it. Dragging a
card moves that card; dragging the background does nothing. Nothing zooms.

Large maps therefore open mid-canvas, and the reader must scroll blindly to
learn the shape they were promised.

## Decision

Pan by dragging empty background. Zoom by pinch, by modifier-scroll, and by
toolbar buttons. Fit the map on first paint when it overflows.

The canvas is an unbounded plane. The stage is translated and scaled; the
browser's scrolling is not involved.

> **Revised during implementation.** The first build panned by writing
> `scrollLeft`/`scrollTop`, reusing the existing `overflow: auto`. That
> reaches a wall: `scrollLeft` cannot go below zero, so the map could not be
> pushed rightwards past its own origin. A reader who drags right on first
> sight — the natural first gesture — gets nothing. Scroll bounds are the
> wrong substrate for a canvas, so panning became a transform instead.

## Structure

```
#canvas (overflow: hidden — no scrollbars)
└─ .stage    transform: translate(x, y) scale(z); transform-origin: 0 0
   ├─ svg.edges   scales with the stage
   └─ .mod cards
```

`panX`/`panY`/`zoom` are the whole viewport state. Panning adds to the
translation and is bounded by nothing.

## Changes to existing code

| Site | Change |
|---|---|
| `rectOf` | Divide the rect delta by `zoom`. |
| Card drag | Divide pointer deltas by `zoom`. |
| `navTo` | `scrollIntoView` has no scroller left; `panIntoView` nudges the plane instead. |
| Empty-background click | Reuse the `suppressClick` flag so a pan does not deselect. |

`rectOf` derives stage coordinates by subtracting the stage's bounding rect
from an element's. Both rects report scaled pixels under a transform, so the
result must be unscaled. Skip this and every edge misdraws.

Card drag reads `clientX`/`clientY`, which are screen pixels. Unscaled deltas
make a card outrun or lag the cursor.

ELK needs no change. The re-layout path reads `offsetLeft`, and `offsetLeft`
ignores transforms.

The focus view stays at 1:1. Its grid holds one module and its neighbors, so
it always fits.

## Controls

**Pan.** A pointerdown on the stage, the edge SVG, or the canvas background
starts a pan; the cursor turns from `grab` to `grabbing`. Cards sit above the
background and keep their own drag.

**Zoom.** Trackpad pinch and Cmd/Ctrl+scroll both arrive as a `wheel` event
carrying `ctrlKey` or `metaKey`; `preventDefault` suppresses browser page
zoom. Plain scroll still pans, but now moves the plane directly, since the
canvas has no scrollbars to do it.

Zoom holds the point under the cursor:

```
newScroll = (scroll + cursorOffset) × (z₂ / z₁) − cursorOffset
```

**Toolbar.** `[−] [78%] [+] [⛶ fit]` beside `⟲ Tidy`, with Cmd+−, Cmd+=, and
Cmd+0 bound to the same actions. The readout doubles as an explanation of why
a map opened smaller than full size. Manual range: 25%–200%.

## First paint

After the first layout:

```
z = clamp(min(viewW / natW, viewH / natH), 0.55, 1)
```

A map that already fits opens at 100%, exactly as today. A map needing 78%
opens whole at 78%. A map needing 30% opens at 55% and the reader pans; below
that floor, module names stop being readable, and an unreadable overview
answers nothing.

Zoom survives Tidy and a focus round-trip. `⛶` refits against the same floor.

## Verification

Render the bundled fixture and a real extracted model. Screenshot each at
100%, at auto-fit, and after a pan.

Confirm that edges still terminate on function rows while zoomed. That is the
`rectOf` failure, and it is the one that looks plausible at a glance.
