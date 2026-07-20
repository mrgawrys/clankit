#!/usr/bin/env bash
# Fetch all open PRs authored by the current gh user, with status and
# recent discussion, as one JSON object on stdout.
#
# One GraphQL search call — no per-PR requests. Uses gh's embedded --jq,
# so the only dependency is an authenticated gh.
#
# Results are cached for 15 minutes so other sessions reuse them instead
# of refetching; --refresh forces a live fetch.
set -euo pipefail

CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/my-prs"
CACHE_FILE="$CACHE_DIR/prs.json"
TTL_SECONDS=900

if [[ "${1:-}" != "--refresh" && -f "$CACHE_FILE" ]]; then
  # GNU stat first: BSD stat rejects -c cleanly at option parsing, but the
  # reverse order leaks GNU stat's filesystem-status output to stdout and
  # crashes the TTL arithmetic on Linux.
  mtime=$(stat -c %Y "$CACHE_FILE" 2>/dev/null || stat -f %m "$CACHE_FILE")
  if (( $(date +%s) - mtime < TTL_SECONDS )); then
    cat "$CACHE_FILE"
    exit 0
  fi
fi

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

mkdir -p "$CACHE_DIR"
tmp=$(mktemp "$CACHE_DIR/prs.XXXXXX")
trap 'rm -f "$tmp"' EXIT

# Bodies truncated to 400 chars: enough to judge "is something still
# actionable?" without flooding the context on chatty PRs.
# issueCount lets the consumer detect truncation past the 50-PR page.
# select(.url) and the // [] guards make a stray non-PR search node
# degrade to "skipped" instead of failing the whole fetch (null[] is a
# hard error in jq).
gh api graphql -f query="$QUERY" --jq '
  {
    fetchedAt: (now | todate),
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
  }' > "$tmp"

mv "$tmp" "$CACHE_FILE"
trap - EXIT
cat "$CACHE_FILE"
