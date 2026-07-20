# my-prs skill — design

**Date:** 2026-07-20
**Plugin:** clankit-dev
**Status:** approved

## Purpose

A user-invocable skill (`/my-prs`) that fetches all of the user's open GitHub
PRs with their status, so the user and Clanker can decide together what to
work on next.

## Files

```
plugins/clankit-dev/skills/my-prs/
├── SKILL.md              # trigger + presentation instructions
└── scripts/fetch-prs.sh  # one GraphQL call, JSON out
```

## The script — `scripts/fetch-prs.sh`

- Single `gh api graphql` search query: `is:pr is:open author:@me
  archived:false`, first 50
  PRs. Always fetches **all** authored PRs — scoping is presentational, never
  an API concern.
- Per PR it returns: repository (`nameWithOwner`), number, title, URL,
  `isDraft`, `mergeable`, `reviewDecision`, CI rollup state of the head
  commit (`statusCheckRollup.state`), count of unresolved review threads
  (`reviewThreads` filtered on `isResolved`), and `updatedAt`.
- It also returns recent discussion so Clanker can judge mergeability
  itself: the last 5 top-level PR comments (author, body, createdAt) and the
  latest review per reviewer (`latestReviews`: author, state, body).
- Output shaped with `gh`'s built-in `--jq` — no external `jq` dependency.
- If `gh` is not authenticated, fail with a clear one-line message telling
  the user to run `gh auth login`.
- Uses whatever `gh` identity resolves in the cwd, so any per-directory
  account configuration is inherited for free.

## Caching

Fetches are cached so a second session (any agent, any repo) within a short
window reuses the data instead of refetching:

- Cache file: `${XDG_CACHE_HOME:-$HOME/.cache}/my-prs/prs.json` — user-level,
  shared across sessions and repos.
- TTL 15 minutes: if the cache file is younger, the script prints it and
  exits without touching the network. `--refresh` forces a live fetch.
- The JSON gains a `fetchedAt` timestamp (top-level, ISO 8601 UTC) so the
  consumer can report data age.
- Writes are atomic (temp file + `mv`) so a failed fetch never corrupts the
  cache; on fetch failure the old cache file is left intact.
- SKILL.md guidance: state the data age when serving cached results, and
  run `--refresh` before acting on a specific PR or when the user asks for
  fresh status.

## The SKILL.md flow

1. Run the script.
2. **Scope decision (presentational):** if the cwd is a code repo with a
   GitHub remote **and** it has matching PRs, show that repo's PRs first,
   then a one-line summary of the rest ("+ N more in other repos"). Otherwise
   (no repo, no remote, or no matching PRs — e.g. a notes or organizational
   repo) show everything.
3. **Table:** PR, repo, CI, review state (drafts shown as "draft", with
   the decision appended if one exists), unresolved threads, conflicts,
   last updated.
4. **Grouping + recommendation:**
   - **Blocked on you** — failing CI, changes requested, merge conflicts, or
     approved-with-unresolved-threads ("approved, but 3 unresolved
     comments").
   - **Waiting on others** — awaiting review, CI pending.
   - **Ready to merge** — approved + CI green + no conflicts + 0 unresolved
     threads.
   - End with a short "start here" recommendation.
5. **Mergeability judgment:** flags alone don't decide "ready to merge".
   Before placing a PR in that group, Clanker reads the fetched recent
   comments and review bodies and checks nothing actionable is still open
   ("approved, but please fix X" → blocked on you, with a note saying what's
   left). Unresolved-thread count covers inline comments; the comment/review
   bodies cover actionable prose.

## Out of scope

- PRs where the user's review is requested (may become a later flag/skill).
- Full comment history — only the last 5 top-level comments and latest
  reviews are fetched; Clanker digs deeper with `gh pr view` only when those
  are ambiguous.

## Rollout

- Update the README skill table and `clankit-dev` `plugin.json` description.
- Refresh the installed plugin so `/my-prs` is available immediately.
