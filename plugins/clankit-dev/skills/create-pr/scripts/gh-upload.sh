#!/usr/bin/env bash
# Upload image(s)/video(s) to GitHub's attachment CDN, print "<name>\t<url>" per file.
#
#   gh-upload.sh shot.png demo.gif             # repo auto-detected via `gh repo view`
#   gh-upload.sh owner/repo shot.png           # or name it explicitly
#
# Uses the undocumented uploads.github.com endpoint with nothing but `gh auth token`.
# Assets are bound to the repository, not the uploader: on a private repo an
# unauthenticated GET -> 404, so access follows the repo's permissions. Every URL
# is re-fetched with credentials before being printed, so a URL that reaches you
# is a URL that resolves. If this endpoint ever 404s/410s, GitHub has changed it —
# fall back to drag-and-drop in the browser and say so out loud.
set -euo pipefail

# First arg is a repo only if it looks like owner/repo and is not a file on disk.
repo=""
if [ $# -gt 0 ] && [[ $1 =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] && [ ! -f "$1" ]; then
  repo=$1; shift
fi
[ $# -gt 0 ] || { echo "usage: gh-upload.sh [owner/repo] file..." >&2; exit 2; }
[ -n "$repo" ] || repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner) \
  || { echo "no repo given and none detected here" >&2; exit 2; }

token=$(gh auth token)
repo_id=$(gh api "/repos/$repo" --jq .id)

for f in "$@"; do
  [ -f "$f" ] || { echo "missing file: $f" >&2; exit 1; }
  name=$(basename "$f")
  case "${name##*.}" in
    png)      ct=image/png ;;
    gif)      ct=image/gif ;;
    jpg|jpeg) ct=image/jpeg ;;
    webp)     ct=image/webp ;;
    mp4)      ct=video/mp4 ;;
    mov)      ct=video/quicktime ;;
    *) echo "unsupported extension: $name" >&2; exit 1 ;;
  esac

  # Conservative guardrail. Fail here rather than half-way through composing a body.
  size=$(wc -c <"$f")
  if [ "$size" -gt 10485760 ]; then
    echo "too large ($((size / 1048576)) MB, cap 10 MB): $name" >&2; exit 1
  fi

  url=$(curl -sS --fail-with-body -X POST \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: $ct" \
    --data-binary @"$f" \
    "https://uploads.github.com/user-attachments/assets?name=${name}&content_type=${ct//\//%2F}&repository_id=${repo_id}" \
    | jq -r '.url // empty')
  [ -n "$url" ] || { echo "upload returned no URL: $name" >&2; exit 1; }

  code=$(curl -sSL -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $token" "$url")
  [ "$code" = 200 ] || { echo "verify failed (HTTP $code): $name -> $url" >&2; exit 1; }

  printf '%s\t%s\n' "$name" "$url"
done
