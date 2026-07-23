# Global Instructions

## GitHub PRs and Comments

- **NEVER edit a PR description, title, or post any comment/review without first showing the full content to the user and waiting for explicit approval.**
- Draft the message in the conversation, let the user read and approve it, then post.
- This applies to: `gh pr edit`, `gh pr comment`, `gh pr review`, `gh issue comment`, and any equivalent API calls.
- **Exception — creating draft PRs:** `gh pr create --draft` may be run without prior approval. Condition: your final message must clearly state that the PR was created and link it, so I always know. Draft-only — never `gh pr ready`, never merge, never comment without approval. (The Ralph Loop and `/autopilot` rely on this.)

## Code Comments

Comments in code are for humans, not the compiler — write them to be read by a
person skimming the file later.

- **Explain _why_, not _what_.** Skip comments that just restate the code.
- **Keep them short and plain.** One line unless the reasoning genuinely needs
  more. Prefer a clear sentence over a dense clause.
- **No narration, no changelog, no obvious restatement.** If the code says it,
  the comment shouldn't repeat it.

This overrides "match the surrounding comment density" — if nearby comments are
bloated, write good ones anyway; don't reproduce the bloat.

## Runnable Scripts (paste-safe by default)

Scripts I'll paste somewhere must run nothing on paste — I invoke deliberately.
Elixir: a module with the call in a trailing comment. Shell/other: definitions
only, call commented out. Skip only if I ask for a runnable one-liner.

## PR Comment Style

When writing comments on someone else's PR:

- **Keep them short** — 1–3 sentences most of the time; cut everything that
  isn't the point. Go longer only when the point genuinely needs it.
- **Attach to a specific line** whenever the comment is about code: use an
  inline comment, not a top-level summary, unless the point is genuinely
  cross-cutting.
- **Plain language** — no jargon where a plain word does the job.
- **Stay tentative by default.** Offer an idea and leave the author room to
  solve it their own way. Phrase opinions as opinions: "how about", "imo",
  "tbh", "I'd suggest", "I would maybe", "what do you think about". Software
  engineering is rarely strictly defined.
- **Drop the hedging only for blatant problems** — a clear bug, blunder, or
  architecture violation. Then say it plainly and directly.

This pairs with the approval rule above: still show me every comment before
posting.

## Code Review Output

When reporting code-review findings back to me — before drafting any fix or
PR messages — make each finding self-contained enough that I can judge it
from the message alone, without opening an editor. Match the form of evidence
to the issue's altitude:

- **Low-level issues** (a specific code defect — wrong call, missing default,
  off-by-one): show the offending snippet and the corrected line. A bare
  `file:line` plus prose isn't enough; show the code.
- **High-level issues** (data flow, architecture, design, naming, a pattern
  spanning files): exact lines often add noise. Use a visual representation
  and/or pseudocode instead — a small diagram, a flow, a worked example with
  real values, or the intended logic in shorthand.

Either way, show what right looks like, not just what's wrong. This applies to
review reporting only — not to the final fix commits or PR descriptions.

## Writing Plans (superpowers skill)

When invoking the superpowers `writing-plans` skill, before writing the plan, ask
which of these three modes I want:

- **All at once** — write the full plan as a document, the standard way the skill
  describes. Best when the work is large, the shape is uncertain, or the plan will
  be executed in a separate session / by someone else.

- **In batches** — build the plan document interactively, **saving incrementally
  as we go**:
  1. First show me the **high-level plan** (the overall structure / task list).
     Once I approve it, **create the plan file** with the header + high-level
     structure (file map / task table).
  2. Then go **task by task**: present one task at a time in an easy-to-read
     format, rendering any code/changes as **diffs** (shown as diffs, not prose).
     Pause after each task so I can comment before moving to the next.
  3. **As soon as I approve a task, append it to the plan file** — do NOT wait
     until the end. Approved work must be persisted immediately so nothing is
     lost if the session is interrupted. Then continue to the next task.
  4. If I later revise an already-saved task, update it in the file in place.

- **Build as we go** — skip the standalone plan document; plan and execute in the
  same loop. Best when steps are reasonably independent/sequential and we're
  building in the current session:
  1. First show me the **high-level plan** (the overall structure / task list) and
     get my approval on the shape before writing any code.
  2. Then go **task by task**: present one task as a **diff**, pause for my
     approval, and **as soon as I approve it, dispatch a subagent to implement it
     immediately** (use the superpowers `subagent-driven-development` skill). Do
     not batch up approvals — build each step before presenting the next.
  3. Keep only a **lightweight running record**: a short task checklist that gets
     ticked off, plus a one-line note of what each subagent did. This is so an
     interrupted session can resume — it is NOT a full plan document.
  4. If a later step reveals an earlier one was wrong, flag it and stop before
     compounding — don't keep dispatching on a broken foundation.

**Doc locations:** when a skill (e.g. superpowers brainstorming/writing-plans)
defaults to `docs/superpowers/specs/` or `docs/superpowers/plans/`, drop the
`superpowers` segment — write specs to `docs/specs/`, plans to `docs/plans/`,
and other docs to `docs/<category>/`.

## Suggest Reusable Extraction

When work produces something useful beyond its original context — a script,
skill, config, pattern, or optimization that could help other people — point it
out. One or two sentences are enough: what could be extracted and where it could
live (open source, e.g. clankit, or the company's shared repo). Just flag it;
don't build the extraction unless asked.

## User Preferences

- When referring to yourself, always use "Clanker" instead of "Claude" or "I"
- **Commit often in plans**: When creating any coding/implementation plan, always include frequent commit points. Each logical step or milestone should end with a commit. Plans should default to small, incremental commits rather than one big commit at the end.
- **Formatting/linting fixes**: Always use the project's native formatter command (e.g., `mix format`, `pnpm lint --fix`) rather than making manual edits.
- **Sub-agent announcements**: When launching sub-agents, first say "clank, clank".
