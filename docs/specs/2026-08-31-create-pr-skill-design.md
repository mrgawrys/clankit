# create-pr skill — Design

> **To act on this design:** pick a mode — *vibe* (inline, no machinery),
> *review each task* (per-task diffs), *review at the end* (one subagent
> builds, one review at the end), or *plan first* (`writing-plans`, then how it gets built).
> Ask the user which; don't pick for them.

## What this is

A new `clankit-dev:create-pr` skill: the default way to open a pull request.
It composes the PR body, decides whether the diff earns visuals (screenshots,
before/after tables, mermaid diagrams, rendered infographic panels), gathers
them behind an approval gate, uploads images to GitHub's attachment CDN with
nothing committed to the branch, and opens a draft PR.

Adapted from a privately shared skill. The visual-selection judgement, the
upload script, and the HTML-panel renderer port nearly verbatim; the
Storybook auto-capture pipeline and all source-environment specifics are
dropped.

## Layout

```
plugins/clankit-dev/skills/create-pr/
  SKILL.md
  scripts/gh-upload.sh        # upload to GitHub's attachment CDN
  scripts/render-html.sh      # HTML → retina PNG via repo's Playwright
  templates/infographic.html  # starting point for generated panels
```

## Behavior

Triggers: "create a PR", "open a PR", `/create-pr`, and as the PR step of
other flows. The flow:

1. **Read the diff.** Pick visuals from the decision table (below). The
   governing test: *does this PR make a claim a reviewer cannot check by
   reading the diff?* A quantitative claim ("faster", "smaller") earns a
   table in the body and a panel with the threshold drawn on it. A
   structural claim earns a mermaid diagram. A diff that speaks for itself
   earns nothing — say so in one line; never invent a visual.
2. **Present a short plan** (~5 lines): what the final description will
   contain, where each image comes from, how many uploads. Screenshot
   sourcing — captured by the agent (via the `screenshot` skill) or pasted
   by the user — is part of this plan, not a separate question. **Wait for
   approval before gathering anything.**
3. **Gather.** Capture screenshots interactively; write mermaid inline;
   build panels by editing `templates/infographic.html` and rendering with
   `render-html.sh`. Panel rules: real numbers from the actual diff, one
   idea per panel, draw and label the threshold when there is one, name the
   measurement method in the subtitle.
4. **Inspect every image before upload** — read the PNG back, check numbers
   and for real or personal data. Uploads are irreversible (no delete API).
   Then upload with `gh-upload.sh`.
5. **Compose the body**: what & why in a few sentences, hero image above
   the fold, before/after as a two-column table of width-constrained
   `<img>` tags, supporting shots in `<details>`, a caption on every image.
   Write the body to a file, never a long `--body` string.
6. **Attach.** New PR → `gh pr create --draft`, base branch auto-detected.
   Existing PR → show the user the full body and wait for approval before
   `gh pr edit`; once review has started, prefer a comment (it notifies
   reviewers, a body edit does not).
7. **Report**: what was captured, generated, uploaded, skipped — and the
   PR link.

### Decision table (ported)

| The change is | Show |
| --- | --- |
| A visual change to existing UI | Before/after, two-column table |
| A new screen, flow or feature | A short tour — 1–4 captioned shots |
| An interaction or multi-step flow | An animated GIF (≤ ~6 s, ≤ 10 MB) |
| Architecture, data flow, state machine | A mermaid diagram (no upload) |
| Real but invisible in the diff | A generated panel |
| A measurable change (timings, sizes, counts) | A panel with the numbers, plus a table in the body |
| A specific element among many | An annotated screenshot |
| Nothing a reviewer would have to reconstruct | Nothing — say so in one line |

## Scripts

**`gh-upload.sh`** — generalized from the source: takes the repo as an
optional argument, defaulting to `gh repo view` detection; nothing
hardcoded. Contract kept: the undocumented
`uploads.github.com/user-attachments/assets` endpoint is called in exactly
this one script; every returned URL is re-fetched with credentials before
being printed; 10 MB cap; loud failure. On failure the skill falls back to
handing the user PNG paths to drag-and-drop, and says so — never
improvises another host.

**`render-html.sh`** — unchanged: renders an HTML file at
`deviceScaleFactor: 2` (the Playwright CLI has no flag for it), clipped to
the body box so short content gets no dead margin. Runs from the repo root
so `playwright` resolves from the repo's `node_modules`.

**`templates/infographic.html`** — unchanged: light background and border
on purpose (a raster image cannot follow GitHub's theme).

## Autopilot wiring

One added line in autopilot's draft-PR step pointing at this skill.
Autopilot runs unattended, so the plan gate cannot fire there; the rule is:
gateless, conservative — mermaid and panels freely, screenshots only when
they can be captured non-interactively, and the inspect-before-upload rule
still holds. The draft-PR exemption already covers the attach step.

## Dropped from the source skill

- Storybook auto-capture (throwaway-config boot, reverse-import-graph story
  selection, story shooter) — may return later as a follow-up.
- All source-environment specifics: repo defaults, dev-server and internal
  host sections, domain-specific data rules (the generic "no real or
  personal data in screenshots" rule stays).

## Verification

Prose + shell scripts, no test suite. Named verification run:

- `shellcheck` on both scripts.
- `gh-upload.sh` against a real repo: upload a scratch PNG, confirm the
  printed URL resolves authenticated.
- `render-html.sh` on the template in a repo with Playwright installed;
  read the PNG back.
- Dry-run the skill end to end on a real branch of some repository, up to
  and including a draft PR.
