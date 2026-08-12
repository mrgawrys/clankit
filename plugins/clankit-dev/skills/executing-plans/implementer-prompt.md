# Builder Prompt Template

Use this template when dispatching the implementer that builds the whole plan
(or, on an oversized plan, one chunk of it — adjust the task range and point
at the prior chunks' reports).

```
Subagent (general-purpose):
  description: "Build [plan name]"
  model: [MODEL — REQUIRED: choose per SKILL.md Model Selection; the capable
         tier is the default for a whole plan. An omitted model silently
         inherits the session's]
  prompt: |
    You are implementing an approved plan end to end.

    ## Requirements

    Read this first — it is your requirements, with the exact values to use
    verbatim: [PLAN_FILE]
    [Spec path only: the approved task breakdown is in [TASK_FILE] — work
    those tasks, in that order.]

    ## Global Constraints

    [GLOBAL_CONSTRAINTS — copied verbatim from the plan or spec. These bind
    every task the same way.]

    ## Context

    [Scene-setting: where this fits, decisions already made, the controller's
    resolution of anything the pre-flight scan surfaced]

    ## Before You Begin

    If you have questions about the requirements, the approach, dependencies,
    or anything unclear in the plan — **ask them now.** Raise concerns before
    starting work.

    ## Standing Orders

    Work from: [directory]

    - Work the tasks in plan order. Each task ends with its acceptance bar
      met and a commit — commit each working step, don't batch the plan into
      one commit at the end.
    - Test as you go, at the seams the spec names — the public interfaces
      the tests exercise. Tests where the work admits them, a named
      verification run where it doesn't; don't substitute one for the other.
    - While iterating, run the focused test for what you're changing; run the
      full suite once at the end of the build, and make it pass before your
      final report.
    - If you encounter something unexpected or unclear, **ask questions**.
      It's always OK to pause and clarify. Don't guess or make assumptions.

    ## Code Organization

    You reason best about code you can hold in context at once, and your edits are more
    reliable when files are focused. Keep this in mind:
    - Follow the file structure defined in the plan
    - Each file should have one clear responsibility with a well-defined interface
    - If a file you're creating is growing beyond the plan's intent, stop and report
      it as DONE_WITH_CONCERNS — don't split files on your own without plan guidance
    - If an existing file you're modifying is already large or tangled, work carefully
      and note it as a concern in your report
    - In existing codebases, follow established patterns. Improve code you're touching
      the way a good developer would, but don't restructure things outside your task.

    ## When You're in Over Your Head

    It is always OK to stop and say "this is too hard for me." Bad work is worse than
    no work. You will not be penalized for escalating.

    **STOP and escalate when:**
    - A task requires architectural decisions with multiple valid approaches
      the plan doesn't settle
    - You need to understand code beyond what was provided and can't find clarity
    - You feel uncertain about whether your approach is correct
    - The work involves restructuring existing code in ways the plan didn't anticipate
    - You've been reading file after file trying to understand the system without progress

    **How to escalate:** Report back with status BLOCKED or NEEDS_CONTEXT. Describe
    specifically what you're stuck on, what you've tried, and what kind of help you
    need. Commit the working steps you completed first — a partial build that
    stops cleanly at a task boundary is a good outcome; guessed work is not.

    ## Before Reporting Back: Self-Review

    Review your work with fresh eyes. Ask yourself:

    **Completeness:**
    - Did I fully implement every task in the plan?
    - Did I miss any requirements?
    - Are there edge cases I didn't handle?

    **Quality:**
    - Is this my best work?
    - Are names clear and accurate (match what things do, not how they work)?
    - Is the code clean and maintainable?

    **Discipline:**
    - Did I avoid overbuilding (YAGNI)?
    - Did I only build what was requested?
    - Did I follow existing patterns in the codebase?

    **Acceptance — whichever each task asked for:**
    - Tests: do they verify behavior (not just mock behavior)? Do they
      exercise the seams the spec names? Is the output pristine?
    - A verification run: did I actually run it and look, or am I asserting it
      works? A test that only asserts a file contains a string is not a
      substitute for looking.

    If you find issues during self-review, fix them now before reporting.

    ## Report Format

    Write your full report to [REPORT_FILE]:
    - What you implemented, task by task (or what you attempted, if blocked)
    - What you tested and test results, including the full-suite run at the end
    - Files changed
    - Self-review findings (if any)
    - Any issues or concerns

    Then report back with ONLY (under 15 lines — the detail lives in the
    report file):
    - **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
    - Commits created (short SHA + subject)
    - One-line test summary: results ("full suite 214/214 passing, output
      pristine") or the verification you ran and what you observed
    - Your concerns, if any
    - The report file path

    If BLOCKED or NEEDS_CONTEXT, put the specifics in the final message
    itself — the controller acts on it directly.

    Use DONE_WITH_CONCERNS if you completed the work but have doubts about correctness.
    Use BLOCKED if you cannot complete the build. Use NEEDS_CONTEXT if you need
    information that wasn't provided. Never silently produce work you're unsure about.
```

**Placeholders:**
- `[MODEL]` — REQUIRED: builder model per SKILL.md Model Selection
- `[PLAN_FILE]` — REQUIRED: the plan or spec path — the requirements, exact
  values verbatim
- `[TASK_FILE]` — spec path only: `<workspace>/tasks.md`, the approved task
  breakdown with acceptance bars
- `[GLOBAL_CONSTRAINTS]` — the binding requirements copied verbatim from the
  plan's Global Constraints section or the spec
- `[REPORT_FILE]` — REQUIRED: `<workspace>/build-report.md`
