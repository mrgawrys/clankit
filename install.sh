#!/usr/bin/env bash
# Bootstrap this machine's ~/.claude from the clankit repo.
# Symlinks keep the repo as source of truth: edit anywhere, commit here.
set -euo pipefail

KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Respects CLAUDE_CONFIG_DIR, so the kit can bootstrap alternate config stores
# (e.g. a personal ~/.claude-personal next to a work ~/.claude).
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
mkdir -p "$CLAUDE_DIR"
echo "installing into $CLAUDE_DIR"

link() {
  local src="$1" dest="$2"
  if [ -e "$dest" ] && [ ! -L "$dest" ]; then
    mv "$dest" "$dest.bak"
    echo "backed up  $dest -> $dest.bak"
  fi
  ln -sfn "$src" "$dest"
  echo "linked     $dest -> $src"
}

link "$KIT_DIR/home/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md"

# settings.json is a bootstrap template, not a symlink — live settings accrue
# machine-specific state (granted permissions, hooks added by installed tools).
if [ ! -f "$CLAUDE_DIR/settings.json" ]; then
  cp "$KIT_DIR/home/settings.json" "$CLAUDE_DIR/settings.json"
  echo "installed  settings.json (from template)"
else
  echo "kept       settings.json (already exists; template at home/settings.json)"
fi

cat <<EOF

Done. Next, inside Claude Code:
  /plugin marketplace add $KIT_DIR
  /plugin install mrgawrys@clankit
EOF
