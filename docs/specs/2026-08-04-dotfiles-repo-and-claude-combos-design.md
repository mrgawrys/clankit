# Dotfiles repo and Claude model/effort combos — Design

> **To act on this design:** pick a mode — *vibe* (inline, no machinery),
> *review each task* (per-task diffs), *review at the end* (delegated, reviewed
> per task), or *plan first* (`writing-plans`, then how it gets built).
> Unattended end-to-end is `/autopilot`. Ask the user which; don't pick for
> them.

## Problem

The `cl` shortcut runs bare `claude`. Real use switches between model and
effort combinations depending on the job, and each switch means typing
`--model` and `--effort` by hand.

Two obstacles sit behind that:

- The shortcut lives in a fish abbreviation. The other machine runs zsh, which
  has no abbreviations.
- There is nowhere to put shell config. clankit covers `~/.claude` — the agent's
  config, not the shell's.

## Decisions

| Question | Answer |
|---|---|
| Invocation | One command per combo, not a command taking an argument |
| Naming | Literal model + effort codes, with one-letter shortcuts for the frequent ones |
| Mechanism | Fish abbreviations and zsh aliases — native to each shell, not a `$PATH` script |
| Sync | One shared data file, read at shell startup by both loaders |
| Home | A new `mrgawrys/dotfiles` repo, not clankit |

## Repo boundary

A new public repo, `mrgawrys/dotfiles`, cloned to `~/Development/dotfiles`.
`mrgawrys/config` — a 2019 Arch/i3 config, unrelated — gets archived on GitHub.

The rule that assigns any future file:

> If the **shell** reads it, it belongs in `dotfiles`.
> If **Claude Code** reads it, it belongs in `clankit`.

Mechanical, so "but it's *about* Claude" never has to be argued.

```
dotfiles/                          clankit/
  shared/combos.tsv                  home/CLAUDE.md
  fish/conf.d/                       home/settings.json
    claude-combos.fish               plugins/
    claude-accounts.fish             install.sh
  zsh/
    init.zsh
    claude-combos.zsh
    claude-accounts.zsh
  install.sh
  README.md
  CLAUDE.md
```

`dotfiles/CLAUDE.md` exists from the first commit. It is short, and it carries
the two things a future session is most likely to get wrong:

- the boundary rule above — shell reads it, or Claude Code reads it
- **link config you author, copy anything the machine writes back into**

Plus a pointer to the README for everything else, so the two never disagree.

`clankit/home/claude-accounts.fish` moves to `dotfiles/fish/conf.d/`. Today
that file is a template carrying a "copy this to conf.d by hand" comment, so
two copies exist and are kept in agreement manually. After the move it is
symlinked, and there is one copy — the same reasoning that makes clankit
symlink `CLAUDE.md`.

`settings.json` stays copied rather than linked in clankit, and that
distinction carries over: **link config you author, copy anything the machine
writes back into.**

## Naming scheme

Two code alphabets:

| model | | effort | |
|---|---|---|---|
| `f` | fable | `l` | low |
| `s` | sonnet | `m` | medium |
| `o` | opus | `h` | high |
| | | `x` | xhigh |
| | | `mx` | max |

`mx` for max resolves the clash with `m` for medium.

One rule reads any name:

> **One letter after `cl` = a shortcut. Two or more = literal model + effort.**

Length disambiguates, so `clf` (shortcut) and `clfh` (literal) coexist even
though both mean fable/high.

**15 literals**, generated as the product of the two alphabets:

```
        low     medium   high    xhigh   max
fable   clfl    clfm     clfh    clfx    clfmx
sonnet  clsl    clsm     clsh    clsx    clsmx
opus    clol    clom     cloh    clox    clomx
```

**4 shortcuts, plus bare `cl`:**

```
cl    →  claude                               (plain; config decides)
clf   →  claude --model fable  --effort high
cls   →  claude --model sonnet --effort high
clm   →  claude --model opus   --effort medium
clx   →  claude --model opus   --effort xhigh
```

The four shortcuts read as one idea: light/mid working hard, opus normal, opus
working hard.

All 20 names were checked against `$PATH` and existing abbreviations. No
collisions.

## The table

`shared/combos.tsv` — 12 data rows, tab-separated:

```tsv
# model codes
model	f	fable
model	s	sonnet
model	o	opus
# effort codes
effort	l	low
effort	m	medium
effort	h	high
effort	x	xhigh
effort	mx	max
# one-letter shortcuts → literal name
short	f	fh
short	s	sh
short	m	om
short	x	ox
```

The file encodes the *alphabet*; the loaders encode the *product*. Enumerating
all 15 rows instead would let them disagree — one row with a typo'd effort
value. A loop makes that class of error impossible, and a new model or effort
is one line yielding five or three new commands.

Shortcut rows point at literal names, not at flags, so retuning a literal
carries its shortcut with it automatically.

## Loaders

Both do the same three things: locate the table, nest two loops to define the
15 literals, then read the `short` rows. Only the defining command differs —
`abbr -a` against `alias`.

```fish
# fish/conf.d/claude-combos.fish
set -l here (path resolve (status filename))
set -l table (path dirname $here)/../../shared/combos.tsv
test -r $table; or return
# … loop → abbr -a clfh 'claude --model fable --effort high'
```

```zsh
# zsh/claude-combos.zsh
local table=${0:A:h}/../shared/combos.tsv
[[ -r $table ]] || return
# … loop → alias clfh='claude --model fable --effort high'
```

**Self-location matters** because these files are symlinked into
`~/.config/fish/conf.d/`, so the naive answer to "where am I" is the symlink,
not the repo. Fish's `path resolve` and zsh's `${0:A}` both resolve symlinks.
`readlink -f` is the trap — it only arrived on macOS recently.

**A missing or unreadable table makes both loaders `return` silently.** A
half-finished clone must not print an error on every new prompt or every `cd`.
The absent commands are signal enough.

`claude-accounts.zsh` ports the fish original: `--on-variable PWD` becomes a
`chpwd` hook registered with `add-zsh-hook`, and `string match` becomes
`case $PWD in`. Same behavior, about ten lines.

## Installer

`dotfiles/install.sh` mirrors clankit's — a `link()` helper that backs up any
real file it would displace to `.bak`, then symlinks.

- **fish** — symlink each `fish/conf.d/*.fish` into `~/.config/fish/conf.d/`.
  Fish auto-sources that directory; nothing further is needed.
- **zsh** — zsh has no `conf.d`, so append exactly one grep-guarded line to
  `~/.zshrc`:

  ```zsh
  [ -f "$HOME/Development/dotfiles/zsh/init.zsh" ] && source "$HOME/Development/dotfiles/zsh/init.zsh"
  ```

  `init.zsh` sources every `zsh/*.zsh`, so that line is written once and never
  again. The guard makes re-runs idempotent.

**Two things the installer deliberately does not do:**

1. **Edit `aliases.fish`.** Removing `abbr -a cl claude` touches a file this
   repo does not own, and an installer that edits foreign config is how a
   dotfiles repo eats a setup. Done by hand instead, noted in the README.
2. **Delete `clankit/home/claude-accounts.fish`.** That is a commit in the
   other repo.

## Why not a dotfiles manager

Considered and rejected, as of August 2026. The deciding concern was **drift** —
config edited in place while the repo goes stale.

**Symlinks make drift impossible by construction.** The live file and the repo
file are one inode with two names, so editing either edits both and `git
status` sees it immediately. Only `git commit` stays manual. Any tool that
*copies* reintroduces the problem.

| Tool | Mechanism | Verdict |
|---|---|---|
| `install.sh` | symlink | **chosen** — no dependency, mirrors clankit's installer |
| GNU Stow | symlink | Layout must mirror `$HOME`; can't write the `.zshrc` line, so a script survives anyway — two mechanisms for six files |
| mise | symlink | Viable — mise is already installed — but the dotfiles feature only left experimental in July 2026, and the zsh machine would need mise too |
| lnk | symlink + git | Closest drop-in, but v0.9.1 with ~20 installs/month — too early |
| chezmoi | **copy** | Rejected. No passive reverse-sync: `autoCommit`/`autoPush` commit the *source* directory and never pull `$HOME` edits back, so `chezmoi add`/`edit` stays a forgettable step — precisely the failure being avoided |
| yadm | `$HOME` is the work tree | Drift-free, but wants to own all of `$HOME`; too much for six files, and `$HOME` in a public repo needs care |
| home-manager | nix store symlink | Overkill; macOS friction |

No tool addresses the fish/zsh split — they move files, they don't understand
shell semantics. One shared table plus a thin per-shell loader is the standard
answer and is independent of the deployment mechanism.

**The one gap symlinks leave:** a new config file created directly in
`~/.config/fish/conf.d/` and never moved into the repo. Only yadm makes that
impossible. Accepted.

## Known consequence

**These names do not work in scripts.** Fish abbreviations expand only in
interactive line editing; zsh aliases only in interactive shells. `clox` at a
prompt works, `clox` in a `.sh` file does not.

This is the accepted cost of native abbrs/aliases over a `$PATH` script — in
exchange, tab completion after `clox` works in both shells, which a wrapper
script would have broken. Scripts should spell out
`claude --model opus --effort xhigh`, which is self-documenting anyway.

## Verification

Shell config, not code: check the behavior, write no tests.

**The definitions are the contract, not the invocation.** `fish -c 'clfh
--version'` will not expand, because abbreviations are a line-editor feature
triggered by keypresses that a non-interactive shell never sees. Verifying by
execution reports a false failure. Assert instead that the names exist and
their expansion strings are exactly right; fish's own correctness in expanding
them is not ours to test.

```sh
fish -c 'source …/claude-combos.fish; abbr --show' | grep -cE '^abbr -a -- cl'   # expect 20
zsh  -c 'source …/claude-combos.zsh;  alias'       | grep -cE '^cl'              # expect 20
```

The fish pattern must anchor on the abbreviation *name*. A loose `grep ' cl'`
also matches expansions containing ` cl` — `gcl` expands to `git clone` — and
silently inflates the count.

20 = 15 literals + 4 shortcuts + bare `cl`.

Spot-check the two names that exercise the tricky parts:

- `clomx` → `claude --model opus --effort max` — the `mx` clash fix
- `cls` → `claude --model sonnet --effort high` — a shortcut resolving via a
  literal

Then one interactive launch of `clx` by the user. That is the only step
proving the flags reach a real session.

## Order of work

| # | Repo | Commit |
|---|---|---|
| 1 | dotfiles | init: README, `CLAUDE.md`, `install.sh` with `link()` + backup |
| 2 | dotfiles | `shared/combos.tsv` + fish loader |
| 3 | dotfiles | zsh loader + `init.zsh` |
| 4 | dotfiles | `claude-accounts` — moved fish file + new zsh port |
| 5 | dotfiles | `install.sh` wires both shells; run it here |
| 6 | clankit | remove `home/claude-accounts.fish`, update README |
| — | local | drop `abbr -a cl claude` from `aliases.fish` (by hand, uncommitted) |
| — | GitHub | archive `mrgawrys/config` |

## Out of scope

- Moving general shell config (`aliases.fish`, `git.fish`) into dotfiles. The
  repo is structured to accept it later; this change does not do it.
- Work-specific fish files. `dotfiles` is public, so they stay out regardless.
- A sonnet shortcut beyond `cls`, or any combo not in the 3×5 grid.
