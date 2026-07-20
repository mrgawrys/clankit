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
gh api graphql -f query="$QUERY" --jq '
  .data.search.nodes | map({
    repo: .repository.nameWithOwner,
    number,
    title,
    url,
    isDraft,
    mergeable,
    reviewDecision,
    updatedAt,
    ci: (.commits.nodes[0].commit.statusCheckRollup.state // "NONE"),
    unresolvedThreads: ([.reviewThreads.nodes[] | select(.isResolved | not)] | length),
    comments: [.comments.nodes[] | {
      author: (.author.login // "ghost"),
      body: .body[:400],
      createdAt
    }],
    reviews: [.latestReviews.nodes[] | {
      author: (.author.login // "ghost"),
      state,
      body: .body[:400]
    }]
  })'
