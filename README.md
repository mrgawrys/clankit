# clankit

**Clanker + kit.** Clanker is what I call Claude Code around here; this is the
kit it carries — my portable setup: a personal plugin marketplace plus the
global `~/.claude` config needed to bootstrap a fresh machine.

Two layers:

- **`plugins/`** — a personal Claude Code plugin marketplace with two plugins:
  `clankit-dev` (dev/work skills) and `clankit-life` (personal-life skills),
  installable independently per machine.
- **`home/`** — the dotfiles layer: global `CLAUDE.md` and a `settings.json`
  bootstrap template. Installed by `install.sh` as symlinks, so this repo stays
  the source of truth.

## New machine

```sh
git clone https://github.com/mrgawrys/clankit
clankit/install.sh
```

Then inside Claude Code:

```
/plugin marketplace add path/to/clankit
/plugin install clankit-dev@clankit
/plugin install clankit-life@clankit   # optional — personal-life skills
```

## What's in the plugins

### clankit-dev — dev/work skills

| Skill | Purpose |
|-------|---------|
| `autopilot` | Small feature end-to-end in a git worktree → draft PR, unsupervised |
| `my-prs` | All open PRs you authored with real status (CI, reviews, conflicts, recent comments) → what-to-tackle-first recommendation |
| `screenshot` | Capture web pages via Playwright MCP, interactively driven |
| `writing-clearly-and-concisely` | Strunk-style prose rules for anything humans read — adapted from [obra/the-elements-of-style](https://github.com/obra/the-elements-of-style) (public domain) |

### clankit-life — personal-life skills

| Skill | Purpose |
|-------|---------|
| `learn` | Adaptive learning companion with spaced repetition; notes + review queues under `.learn/` by default, paths overridable via project CLAUDE.md |
| `writing-companion` | Listening-first journaling companion; surfaces connected notes using whatever search tools the project declares |

## Two accounts on one machine

`install.sh` respects `CLAUDE_CONFIG_DIR`, so the kit can bootstrap a second,
independent config store with its own login:

```sh
mkdir -p ~/.claude-personal
CLAUDE_CONFIG_DIR=$HOME/.claude-personal ./install.sh
CLAUDE_CONFIG_DIR=$HOME/.claude-personal claude plugin marketplace add path/to/clankit
CLAUDE_CONFIG_DIR=$HOME/.claude-personal claude plugin install clankit-dev@clankit
CLAUDE_CONFIG_DIR=$HOME/.claude-personal claude plugin install clankit-life@clankit
```

Copy `home/claude-accounts.fish` to `~/.config/fish/conf.d/` to switch stores
automatically by directory — edit `personal_roots` in the file to match the
machine's layout. Then `claude` + `/login` once in each store.

## Notes

- **`settings.json` is copy-once, not symlinked** — live settings accrue
  machine-specific state (granted permissions, hook wiring from installed
  tools). Fold anything worth keeping back into the template by hand.
- The bundled `elements-of-style.md` is public domain (Strunk, 1918, via
  Project Gutenberg), adapted from
  [obra/the-elements-of-style](https://github.com/obra/the-elements-of-style).
