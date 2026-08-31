---
name: create-pr
description: Use when creating or opening a pull request, or when a PR needs visuals — screenshots of a new feature, a before/after comparison, an annotated callout, a diagram or generated panel that gives reviewers context they would otherwise reverse-engineer. Composes the body, decides which visuals the diff earns, uploads images to GitHub's attachment CDN with nothing committed to the branch, and opens a draft PR. Triggers on "create a PR", "open a PR", "add a screenshot to the PR", "show before and after".
user_invocable: true
---

# Create a PR

The default way to open a pull request. Compose the body, decide whether the
diff earns visuals, gather them behind one approval gate, and open a **draft**
PR — with no image committed to the branch and nothing to clean up after merge.

## How the image hosting works

`scripts/gh-upload.sh` POSTs to `uploads.github.com/user-attachments/assets`
with `gh auth token`, returning the same `github.com/user-attachments/assets/<uuid>`
URL the web UI's drag-and-drop produces. Assets are bound to the repository,
not the uploader, so access follows the repo's permissions.

The endpoint is **undocumented**, and that script is the single place that
calls it: it verifies every URL with an authenticated GET before returning it,
and fails loudly. If it starts failing, GitHub changed something — hand the
user the PNG paths to drag-and-drop in the browser and say so; do not
improvise a workaround. Never commit the images; never push them to a side
branch.

## Step 1 — Read the diff, pick the visuals

Read the diff first, then choose. Most PRs need exactly one of these:

| The change is | Show | Notes |
| --- | --- | --- |
| A visual change to existing UI | **Before / after**, two-column table | Before comes from the base branch — see Step 3. No cheap "before"? Ship the after states as a tour |
| A new screen, flow or feature | **A short tour** — 1–4 shots of the states that matter, captioned | Not every state. Empty, filled and error usually suffice |
| An interaction, animation or multi-step flow | **An animated GIF** | Keep under ~6 s and 10 MB; GIFs animate inline |
| Architecture, data flow, state machine | **A mermaid diagram** — Step 4 | Node-and-edge structure; no image, no upload |
| Real but invisible in the diff — multi-file refactor, new data flow | **A generated panel** — Step 4 | Headline, before→after, counts, the file to watch |
| A **measurable** change — timings, memory, bundle size, query counts | **A panel with the numbers**, plus a table in the body | Applies to config and build PRs too |
| A specific element among many | **An annotated screenshot** — Step 5 | Arrow or box on the thing |
| Nothing a reviewer would otherwise have to reconstruct | **Nothing** | Say so in one line; do not invent a visual |

A PR can carry two kinds (a before/after *and* a diagram). It should not carry
six screenshots — pick the ones a reviewer actually needs.

**"It's only config" is not the test.** The test is:

> Does this PR make a claim a reviewer cannot check by reading the diff?

A **quantitative** claim ("faster", "fewer requests", "smaller") always does.
Numbers in prose are easy to skim past; the same numbers in a table are
checkable, and in a chart against a threshold they are obvious. If you catch
yourself writing "went from X to Y" in a sentence, that belongs in a table —
and if there is a threshold X crossed and Y does not, in a panel with the
threshold drawn on it. A **structural** claim ("these four modules now resolve
differently") is a mermaid diagram, which costs nothing.

Skip visuals when the diff genuinely speaks for itself — a dependency bump, a
renamed flag. Never invent one to look thorough; a panel restating a one-line
change is padding.

## Step 2 — Present the plan, get approval

Before gathering anything, present a short plan — about five lines: what the
final description will contain, where each image comes from (captured by you,
or pasted by the user), and how many uploads. Screenshot sourcing is part of
this plan, not a separate question.

**Wait for approval.** This is a question, not an announcement with a window
to object. Once approved, do not re-ask per image.

## Step 3 — Capture

Capture screenshots interactively with the `screenshot` skill (Playwright
MCP): navigate, wait for real content, shoot when the state is right. Shoot
from a clean session — a page you have been typing test data into carries
that data into the PR.

**The "before" state — do not touch the working tree.** Shoot the base branch
from a separate worktree, or a deployed environment that runs it, or ask the
user for a before shot. Never `git stash` and never check out the base branch
in the working tree for a screenshot. Cheaper still: if you know you are about
to change UI, shoot the *before* first, then edit.

**Screenshots must not contain real people or private data.** Use seed/demo
data or an obviously fake account. Before uploading, look at the image and
check for real names, emails, salaries, or a recognisable customer's
branding. Redact with `magick ... -fill black -draw "rectangle x1,y1 x2,y2"`
or describe it in words. If unsure whether something is real, ask before
uploading — an upload cannot be undone; there is no delete API.

For an animated GIF, capture frames then
`magick -delay 60 -loop 0 f*.png demo.gif`.

## Step 4 — Generated visuals

Two tools. Pick by shape, not convenience.

**A graph of nodes and edges → mermaid.** GitHub renders ```mermaid fenced
blocks natively in a PR body: no upload, editable in place, diffs as text.

**A designed panel → generate an image.** Anything with text hierarchy,
numbers, a before→after composite, or a callout. Mermaid cannot lay these
out; do not contort a flowchart into doing it.

```bash
cp <skill-dir>/templates/infographic.html /tmp/panel.html
# edit the HTML — real numbers from the diff, real file paths, real risk
<skill-dir>/scripts/render-html.sh /tmp/panel.html /tmp/panel.png 1200 200
```

The renderer shoots at `deviceScaleFactor: 2` and clips to the body box, so
text stays crisp and there is no dead margin. It must run inside a repo whose
`node_modules` has `playwright`. The height is a minimum; content decides the
rest.

What makes a panel worth a reviewer's attention:

- **Real content only.** Counts from the actual diff, actual file paths, the
  actual risk. A panel of placeholder text is worse than no panel.
- **One idea.** A headline, the before→after, at most three numbers. If it
  needs a legend, it is doing too much.
- **Keep the light background and border** from the template — a raster image
  cannot follow GitHub's theme, and the border stops it bleeding into dark
  mode.
- **Draw the threshold, if there is one** — a timeout, a budget, a p95 target
  — as a labelled dashed line, so the bars read as before/after against the
  limit that mattered.
- **Name the measurement method** in the subtitle, in one clause. A number
  with no method is decoration.
- **Caption it** in the body and keep the prose it summarises — the panel is
  an entry point, not a replacement.

Custom CSS is fine; bars are two nested divs and a percentage width. Do not
draw panels with ImageMagick — its typography is far worse. ImageMagick is
for annotating (Step 5) and assembling GIF frames.

**Look at the PNG before uploading.** The renderer will happily produce
clipped text or a mis-scaled bar, and the upload cannot be undone. Read the
image back, check the numbers, then upload.

## Step 5 — Annotate, then upload

Annotation, when a shot needs a pointer:

```bash
magick shot.png -stroke '#dc2626' -strokewidth 4 -fill none \
  -draw "roundrectangle 120,180 520,260 8,8" shot-annotated.png
```

Upload — one call, any number of files; the repo is auto-detected:

```bash
<skill-dir>/scripts/gh-upload.sh /tmp/shots/before.png /tmp/shots/after.png
# before.png<TAB>https://github.com/user-attachments/assets/...
```

If it exits non-zero, stop. Never put an unverified URL in a PR body.

## Step 6 — Compose the body

What & why in a few sentences — the prose still carries the PR; images
support it. Constrain widths; a raw screenshot renders enormous:

```markdown
| Before | After |
| --- | --- |
| <img src="$BEFORE" width="380"> | <img src="$AFTER" width="380"> |
```

`<details><summary>…</summary>` is the right home for supporting shots so the
description stays scannable. **Caption every image** with what the reviewer
should notice — an uncaptioned screenshot is decoration.

For a full showcase, this order reads well — skip any section you have no
material for, never pad: what changed (with the hero image **above the
fold**), before/after table, a mermaid of how it fits together, other states
in `<details>`. Six screenshots of the same component is not a showcase, it
is noise.

Write the body to a file; long `--body` strings get mangled by the shell.

## Step 7 — Attach

- **New PR** → `gh pr create --draft --body-file /tmp/pr-body.md`, base
  branch auto-detected from the repo, never assumed.
- **Existing PR** → show the user the full body and wait for approval before
  `gh pr edit`. Once review has started, prefer a **comment** — it notifies
  reviewers, where a silent body edit does not.

## Report

Tell the user what you captured, generated, uploaded, and skipped — and paste
the PR URL. If you skipped visuals because the change has no visible effect,
say that in one line rather than padding the description.

## Unattended runs

When invoked from an autonomous flow (e.g. `autopilot`) with no human to
answer the Step 2 gate: skip the gate, act conservatively. Mermaid and panels
freely; screenshots only when capturable non-interactively; the
inspect-before-upload rule holds in full.
