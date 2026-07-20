# my-prs Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A user-invocable `my-prs` skill in clankit-dev that fetches all of the user's open GitHub PRs with real status in one call and recommends what to work on first.

**Architecture:** A bundled shell script makes a single `gh api graphql` search call (`is:pr is:open author:@me`) and shapes the result to JSON with `gh`'s built-in `--jq`. The SKILL.md tells Clanker how to scope presentation to the current repo, render a status table, and judge true mergeability from fetched comments/reviews rather than flags alone.

**Tech Stack:** bash, GitHub CLI (`gh`) with GraphQL API, Claude Code plugin skill format.

**Spec:** `docs/specs/2026-07-20-my-prs-skill-design.md`

## Global Constraints

- This repo is public. All content — code, docs, commit messages — must stay agnostic to the author's personal setup (see root `CLAUDE.md`). Never reference specific home directories, accounts, employers, or coworkers.
- No dependencies beyond `gh` itself — use `gh`'s embedded `--jq`, never a standalone `jq` binary.
- Skill layout convention: `plugins/clankit-dev/skills/<name>/SKILL.md` with frontmatter keys `name`, `description` (written as "Use when…" trigger guidance), `user_invocable: true`.
- The script always fetches **all** authored PRs; scoping is presentational only (SKILL.md logic), never an API parameter.
- Commit after every task.

---

### Task 1: `fetch-prs.sh` script

**Files:**
- Create: `plugins/clankit-dev/skills/my-prs/scripts/fetch-prs.sh`

**Interfaces:**
- Consumes: nothing (only requires an authenticated `gh`).
- Produces: on stdout, a JSON object `{issueCount, prs}` where `issueCount` (int) is the total number of matching PRs on GitHub (used to detect truncation past the 50-PR page) and `prs` is an array of PR objects with keys `repo` (string, `owner/name`), `number` (int), `title`, `url`, `isDraft` (bool), `mergeable` (`MERGEABLE`|`CONFLICTING`|`UNKNOWN`), `reviewDecision` (`APPROVED`|`CHANGES_REQUESTED`|`REVIEW_REQUIRED`|null), `ci` (`SUCCESS`|`FAILURE`|`ERROR`|`PENDING`|`EXPECTED`|`NONE`), `unresolvedThreads` (int), `updatedAt` (ISO 8601), `comments` (array of `{author, body, createdAt}`, last 5, bodies truncated to 400 chars), `reviews` (array of `{author, state, body}`, latest review per reviewer, bodies truncated to 400 chars). Exit 1 with a one-line stderr message when `gh` is unauthenticated. Task 2's SKILL.md documents exactly these keys.

- [ ] **Step 1: Write the script**

Create `plugins/clankit-dev/skills/my-prs/scripts/fetch-prs.sh`:

```bash
#!/usr/bin/env bash
# Fetch all open PRs authored by the current gh user, with status and
# recent discussion, as one JSON array on stdout.
#
# One GraphQL search call — no per-PR requests. Uses gh's embedded --jq,
# so the only dependency is an authenticated gh.
set -euo pipefail

if ! gh auth status >/dev/null 2>&1; then
  echo "error: gh is not authenticated — run 'gh auth login'" >&2
  exit 1
fi

QUERY='
query {
  search(query: "is:pr is:open author:@me archived:false", type: ISSUE, first: 50) {
    issueCount
    nodes {
      ... on PullRequest {
        repository { nameWithOwner }
        number
        title
        url
        isDraft
        mergeable
        reviewDecision
        updatedAt
        commits(last: 1) {
          nodes { commit { statusCheckRollup { state } } }
        }
        reviewThreads(first: 50) { nodes { isResolved } }
        comments(last: 5) {
          nodes { author { login } body createdAt }
        }
        latestReviews(first: 10) {
          nodes { author { login } state body }
        }
      }
    }
  }
}'

# Bodies truncated to 400 chars: enough to judge "is something still
# actionable?" without flooding the context on chatty PRs.
# issueCount lets the consumer detect truncation past the 50-PR page.
# select(.url) and the // [] guards make a stray non-PR search node
# degrade to "skipped" instead of failing the whole fetch (null[] is a
# hard error in jq).
gh api graphql -f query="$QUERY" --jq '
  {
    issueCount: .data.search.issueCount,
    prs: (.data.search.nodes | map(select(.url != null) | {
      repo: .repository.nameWithOwner,
      number,
      title,
      url,
      isDraft,
      mergeable,
      reviewDecision,
      updatedAt,
      ci: (.commits.nodes[0].commit.statusCheckRollup.state // "NONE"),
      unresolvedThreads: ([(.reviewThreads.nodes // [])[] | select(.isResolved | not)] | length),
      comments: [(.comments.nodes // [])[] | {
        author: (.author.login // "ghost"),
        body: .body[:400],
        createdAt
      }],
      reviews: [(.latestReviews.nodes // [])[] | {
        author: (.author.login // "ghost"),
        state,
        body: .body[:400]
      }]
    }))
  }'
```

- [ ] **Step 2: Make it executable**

Run: `chmod +x plugins/clankit-dev/skills/my-prs/scripts/fetch-prs.sh`

- [ ] **Step 3: Run it live and verify the output shape**

Run: `plugins/clankit-dev/skills/my-prs/scripts/fetch-prs.sh > /tmp/prs.json; echo "exit=$?"`
Expected: `exit=0` and `/tmp/prs.json` contains a JSON object with `issueCount` and `prs`.

Verify the shape with:

```bash
python3 -c "
import json
data = json.load(open('/tmp/prs.json'))
assert isinstance(data.get('issueCount'), int), 'missing issueCount'
prs = data['prs']
assert isinstance(prs, list), 'prs not a list'
required = {'repo','number','title','url','isDraft','mergeable','reviewDecision','ci','unresolvedThreads','updatedAt','comments','reviews'}
for pr in prs:
    missing = required - pr.keys()
    assert not missing, f'missing keys: {missing}'
print(f'OK: issueCount={data[\"issueCount\"]}, {len(prs)} PRs, all keys present')
"
```

Expected: `OK: <N> PRs, all keys present` (N ≥ 0; an empty array is a pass — the shape check still ran on a valid response).

- [ ] **Step 4: Verify the unauthenticated failure path**

Run: `GH_TOKEN=" " GH_CONFIG_DIR=/tmp/empty-gh-config plugins/clankit-dev/skills/my-prs/scripts/fetch-prs.sh; echo "exit=$?"`
Expected: stderr line `error: gh is not authenticated — run 'gh auth login'` and `exit=1`.

- [ ] **Step 5: Commit**

```bash
git add plugins/clankit-dev/skills/my-prs/scripts/fetch-prs.sh
git commit -m "clankit-dev: add my-prs fetch script (single GraphQL call)"
```

---

### Task 2: SKILL.md

**Files:**
- Create: `plugins/clankit-dev/skills/my-prs/SKILL.md`

**Interfaces:**
- Consumes: `scripts/fetch-prs.sh` from Task 1 and its exact JSON keys (`repo`, `number`, `title`, `url`, `isDraft`, `mergeable`, `reviewDecision`, `ci`, `unresolvedThreads`, `updatedAt`, `comments`, `reviews`).
- Produces: the invocable skill; nothing downstream consumes it programmatically.

- [ ] **Step 1: Write the skill file**

Create `plugins/clankit-dev/skills/my-prs/SKILL.md`:

```markdown
---
name: my-prs
description: Use when the user wants an overview of their open GitHub PRs and their status — "what PRs do I have open", "PR status", "what should we work on next" — to decide what to tackle. Fetches every open PR authored by the user (CI, review state, conflicts, unresolved threads, recent comments) in one call, then presents a status table and a what-to-do-first recommendation.
user_invocable: true
---

# My PRs

Fetch every open PR the user authored, judge each one's real state, and
recommend what to work on first. One script call gets all the data — do not
loop over PRs with `gh pr view` unless a specific PR needs deeper digging.

## 1. Fetch

Run the bundled script from this skill's base directory:

    scripts/fetch-prs.sh

It prints a JSON object: `issueCount` (total matching PRs on GitHub) and
`prs`, an array with one object per PR:

| Key | Meaning |
|-----|---------|
| `repo`, `number`, `title`, `url` | identity |
| `isDraft` | draft PR |
| `mergeable` | `MERGEABLE` / `CONFLICTING` / `UNKNOWN` |
| `reviewDecision` | `APPROVED` / `CHANGES_REQUESTED` / `REVIEW_REQUIRED` / null (no reviewers) |
| `ci` | head-commit check rollup: `SUCCESS` / `FAILURE` / `ERROR` / `PENDING` / `EXPECTED` / `NONE` |
| `unresolvedThreads` | count of unresolved inline review threads |
| `comments` | last 5 top-level comments (author, body ≤400 chars, createdAt) |
| `reviews` | latest review per reviewer (author, state, body ≤400 chars) |
| `updatedAt` | last activity |

If the script exits non-zero, show the user its stderr (usually "run
`gh auth login`") and stop.

## 2. Scope

If the cwd is inside a git repo with a GitHub remote **and** some fetched
PRs belong to that repo: present that repo's PRs in full, then summarize
the rest in one line ("+ N more in other repos — ask to see them").
Otherwise present everything, grouped by repo.

## 3. Table

One compact table, most recently updated first:

| PR | Repo | CI | Review | Threads | Conflicts | Updated |

- CI: pass / **fail** / pending / — (none)
- Review: approved / changes requested / awaiting / draft
- Conflicts: yes when `mergeable == "CONFLICTING"`; "unknown" when
  `UNKNOWN` (GitHub hasn't computed it yet — say so, don't guess)
- Updated: relative ("2d ago")

## 4. Judge and group

Flags alone don't decide readiness — read each PR's `comments` and
`reviews` bodies before grouping:

- **Blocked on you** — failing CI, changes requested, conflicts,
  unresolved threads, a draft to finish, or any comment/review that still
  asks for something actionable (the "approved, but please fix X" case).
  Say what's left, quoting the ask briefly.
- **Waiting on others** — awaiting review, or CI still pending.
- **Ready to merge** — approved, CI green or absent, no conflicts, zero
  unresolved threads, **and** nothing actionable in the recent discussion.

End with a short "start here" recommendation: usually the smallest
blocked-on-you fix, or merging what's genuinely ready.

## Notes

- Bodies are truncated to 400 chars. If a truncated comment is the
  deciding factor, fetch it in full: `gh pr view <url> --comments`.
- The script fetches at most 50 PRs and 50 review threads per PR. If
  `issueCount` is larger than the number of `prs` entries, tell the user
  the list is truncated.
```

- [ ] **Step 2: Verify frontmatter matches the plugin convention**

Run: `head -6 plugins/clankit-dev/skills/my-prs/SKILL.md`
Expected: frontmatter with `name: my-prs`, a `description:` starting with "Use when", and `user_invocable: true` — same shape as `plugins/clankit-dev/skills/screenshot/SKILL.md`.

- [ ] **Step 3: Commit**

```bash
git add plugins/clankit-dev/skills/my-prs/SKILL.md
git commit -m "clankit-dev: add my-prs skill"
```

---

### Task 3: README table and plugin.json description

**Files:**
- Modify: `README.md` (clankit-dev skill table, ~line 36)
- Modify: `plugins/clankit-dev/.claude-plugin/plugin.json` (description)

**Interfaces:**
- Consumes: the skill name `my-prs` from Task 2.
- Produces: nothing downstream.

- [ ] **Step 1: Add the README table row**

In `README.md`, in the "clankit-dev — dev/work skills" table, add after the `autopilot` row:

```markdown
| `my-prs` | All open PRs you authored with real status (CI, reviews, conflicts, recent comments) → what-to-tackle-first recommendation |
```

- [ ] **Step 2: Update the plugin description**

In `plugins/clankit-dev/.claude-plugin/plugin.json`, replace the `description` value with:

```json
"description": "Dev/work skills: autopilot (small features end-to-end in a worktree), my-prs (open-PR status overview and what to tackle first), screenshot (Playwright-driven page capture), writing-clearly-and-concisely (Strunk prose rules)"
```

- [ ] **Step 3: Commit**

```bash
git add README.md plugins/clankit-dev/.claude-plugin/plugin.json
git commit -m "docs: list my-prs skill in README and plugin manifest"
```

---

### Task 4: Refresh the installed plugin and verify end-to-end

**Files:**
- None in-repo (updates the local plugin installation).

**Interfaces:**
- Consumes: the committed skill from Tasks 1–3.
- Produces: `/my-prs` available in new sessions.

- [ ] **Step 1: Update the installed plugin from the local marketplace**

Run (using the same `CLAUDE_CONFIG_DIR` the plugin was installed under, if any):

```bash
claude plugin update clankit-dev@clankit
```

Expected: output confirming clankit-dev was updated. If the subcommand is unavailable in the installed CLI version, use the interactive `/plugin` menu → clankit-dev → update instead.

- [ ] **Step 2: Verify the installed copy contains the skill**

Run: `find "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins" -path "*clankit-dev*" -name "SKILL.md" | grep my-prs`
Expected: one path ending in `skills/my-prs/SKILL.md`.

- [ ] **Step 3: End-to-end smoke test**

Run the installed copy of the script (the path found in Step 2, `scripts/fetch-prs.sh` next to it) and confirm it returns the same JSON shape as Task 1 Step 3.

Expected: valid `{issueCount, prs}` JSON object, exit 0.

---

## Self-Review

- **Spec coverage:** single GraphQL call ✓ (Task 1), all status fields + comments/reviews ✓ (Task 1), auth failure message ✓ (Task 1 Step 4), presentational scoping ✓ (SKILL.md §2), table ✓ (§3), judgment-based grouping with "approved but fix X" ✓ (§4), truncation escape hatch ✓ (Notes), README/plugin.json/refresh ✓ (Tasks 3–4).
- **Placeholder scan:** none — full script and SKILL.md content inlined.
- **Type consistency:** JSON keys in Task 1's jq, its Produces block, and SKILL.md's key table match one-to-one.
