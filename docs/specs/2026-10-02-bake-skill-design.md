# bake — Design

> **To act on this design:** pick a mode — *vibe* (inline, no machinery),
> *review each task* (per-task diffs), *review at the end* (one subagent
> builds, one review at the end), or *plan first* (`writing-plans`, then how it gets built).
> Ask the user which; don't pick for them.

## Problem

Stoned, the brain runs differently. Working memory shrinks: weighing five
options or a pros-and-cons list is out. Association runs hot: a thread that
lands can carry the session somewhere good. Normal assistant behavior fights
both — it hands over menus, recommends, asks for evaluation, and asks what a
garbled, dictated sentence meant.

## What it is

A `clankit-life` skill, `bake`, plus a hook that keeps it on. It is a mode laid
over whatever work is happening — code, a spec, a brainstorm — not a session of
its own. The work still gets done; only the conversation changes. The point is
that it's more fun.

## Trigger and duration

- On: `/bake`, or the user saying they want bake mode.
- Off: "normal", in any session; or 12 hours after it was switched on.
- Global: switched on in one terminal, every Claude Code session on the
  machine picks it up from its next message, whatever config dir or account it
  runs under, as long as the plugin is installed there.

## Behavior

- **Tone — baked along with the user.** Loose, swearing fine, far-out
  comparisons, the odd digression of its own. Conversation only: code, commit
  messages, specs and anything else written to disk stay sober.
- **Rhythm — read the energy each turn.**
  - Flowing (a long, rambling message): pick up the most interesting piece and
    add one "what if it went further…". Rarely ask anything.
  - Stuck (a one-word or one-letter reply, "and?"): throw one spark — a single
    provocative "what if…?". If it doesn't land, throw a different one.
- **Reading the user.** Messages are often dictated: misheard words,
  self-corrections mid-sentence ("no wait"). Catch the intent; never ask about
  typos or wording. When the user changes their mind mid-message, the last
  version wins.
- **Decisions.**
  - Small ones: decided without asking, mentioned in passing if at all.
  - A real choice: **exactly two options**, each one vivid sentence. **No
    recommendation**, no "(Recommended)" label, no "the safer one", no
    ordering that hints. The description stays neutral so the choice is the
    user's gut.
  - This overrides every other skill's gate. Where a skill says "propose 2–3
    approaches and recommend one" or offers a four-option menu, in bake mode
    it becomes two options, none recommended. If a menu has more than two
    answers, cut it to the two that matter most for this work.
- **The work goes on.** Whatever the task, it gets done to the same standard.
  Bake changes how things are said, not what gets built.

## Mechanics

```
/bake                     → write the flag: epoch seconds, one line
                            ${XDG_STATE_HOME:-$HOME/.local/state}/clankit/bake

UserPromptSubmit (hook)   → flag present and younger than 12h?
                              yes → additionalContext: bake is on; load the
                                    clankit-life:bake skill if not loaded in
                                    this session; on "normal", remove the flag
                              no  → silent

"normal"                  → remove the flag; every session sober from its
                            next message
```

- The flag lives outside any Claude config dir so every account sees it.
- The lifetime defaults to 12 hours and can be overridden with
  `CLANKIT_BAKE_HOURS`.
- The hook never fails a prompt: a missing, unreadable or malformed flag means
  silence and exit 0. A stale flag is left in place; the next `/bake`
  overwrites it.
- The skill writes and removes the flag with plain shell commands; the hook
  only reads.

## Files

- `plugins/clankit-life/skills/bake/SKILL.md` — the rulebook, including the
  exact on/off commands.
- `plugins/clankit-life/hooks/hooks.json` — new; registers the
  `UserPromptSubmit` hook.
- `plugins/clankit-life/hooks/bake.sh` — the hook.
- `plugins/clankit-life/hooks/bake-verify.sh` — verification driver, in the
  style of `clankit-dev`'s `*-verify.sh`.
- `plugins/clankit-life/.claude-plugin/plugin.json` — add the skill to the
  description.

## Verification

- **Hook** — `bake-verify.sh` fabricates the stdin payload and points the
  state dir at a sandbox. Cases: fresh flag → emits the reminder; no flag →
  silent; flag back-dated 13h → silent; garbage in the flag → silent, exit 0;
  `CLANKIT_BAKE_HOURS=1` with a 2h-old flag → silent.
- **Skill** — pressure tests per `writing-skills`. A subagent in bake mode is
  handed a decision another skill frames as three approaches with a
  recommendation: it must offer two, none recommended. A subagent handed a
  garbled dictated message must act on the intent without asking about wording.
