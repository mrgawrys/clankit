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
