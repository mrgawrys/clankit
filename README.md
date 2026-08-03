# clankit

**Clanker + kit.** Clanker is what I call Claude Code around here; this is the
kit it carries — my portable setup: a personal plugin marketplace plus the
global `~/.claude` config needed to bootstrap a fresh machine.

Two layers:

- **`plugins/`** — a personal Claude Code plugin marketplace with two plugins:
  `clankit-dev` (dev/work skills, hooks, and the session bootstrap that routes
  between them) and `clankit-life` (personal-life skills), installable
  independently per machine.
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

The skills aren't a pile of independent tools; most of them are stations on one
route. `clankit-dev/bootstrap.md` is injected into every session by a
`SessionStart` hook, and it does the routing: triage the ask, design it before
building it, write the spec, then ask how the work should be built and reviewed.

**The flow**

| Skill | Purpose |
|-------|---------|
| `brainstorming` | Required before building anything with more than one reasonable shape. One question at a time, then a design for approval |
| `writing-plans` | Turns an approved design into right-sized tasks that survive a context boundary — a fresh session, a subagent, another person |
| `executing-plans` | Builds from a plan or an approved spec; a fresh subagent per task with a review-and-fix loop between them |
| `vibe` | The other end of the dial: build it now, no plan, no gates — here or handed to one subagent |
| `autopilot` | The whole route unsupervised, in a git worktree → draft PR |

**Craft**

| Skill | Purpose |
|-------|---------|
| `systematic-debugging` | For any bug or test failure, before proposing a fix |
| `verification-before-completion` | Evidence before assertions — run the command before claiming it passes |
| `writing-good-tests` | Six rules for tests that can actually fail |
| `receiving-code-review` | Verify review feedback on its merits instead of implementing it on reflex |
| `writing-skills` | Creating, editing, and verifying skills |
| `writing-clearly-and-concisely` | Strunk-style prose rules for anything humans read — adapted from [obra/the-elements-of-style](https://github.com/obra/the-elements-of-style) (public domain) |

**Tools**

| Skill | Purpose |
|-------|---------|
| `my-prs` | All open PRs you authored with real status (CI, reviews, conflicts, recent comments) → what-to-tackle-first recommendation |
| `visualize-code` | Modules and their dependencies as an interactive diagram — a PR, a plan, or a named subsystem |
| `screenshot` | Capture web pages via Playwright MCP, interactively driven |
| `dispatching-parallel-agents` | Two or more independent tasks with no shared state |

The plugin also ships Bash observability hooks (slow-call reporting, a watchdog
for calls that hang, context-usage reporting). Their dependencies and tunables
are in [`plugins/clankit-dev/README.md`](plugins/clankit-dev/README.md).

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
