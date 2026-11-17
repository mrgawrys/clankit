# Builder Prompt Template

Use this template when dispatching the implementer that builds the whole plan
(or, on an oversized plan, one chunk of it — adjust the task range and point
at the prior chunks' reports).

```
Subagent (general-purpose):
  description: "Build [plan name]"
  prompt: |
    You are implementing an approved plan end to end.

    ## Requirements

    Read this first — it is your requirements, with the exact values to use
    verbatim: [PLAN_FILE]

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

    - Work the tasks in plan order; from a spec, break the work into tasks
      yourself. Commit each working step.
    - Test at the seams the plan or spec names: tests where the work admits
      them, a named verification run where it doesn't. Focused tests while
      iterating; the full suite once at the end, passing before your final
      report.
    - Something unexpected or unclear: ask rather than guess.
    - No subagents except the advisor. Independent reviewers are dispatched
      after you report, so one you spawn counts for nothing.

    ## Hard decisions

    When a task needs an architectural decision with several valid
    approaches the plan doesn't settle, or you are unsure your approach is
    correct, ask the advisor: invoke the `advisor` skill for the rules, then
    follow its builder section — dispatch the advisor agent, wait for the
    ruling, record it in your report, carry on.

    If the call fails, or the question was the user's to answer, return
    BLOCKED or NEEDS_CONTEXT: commit the working steps you completed, then
    say what you are stuck on and what you tried. A build that stops cleanly
    at a task boundary is a good outcome; guessed work is not.

    ## Report Format

    Write your full report to [REPORT_FILE]:
    - What you implemented, task by task (or what you attempted, if blocked)
    - What you tested and test results, including the full-suite run at the end
    - Files changed
    - Any issues or concerns
    - `## Advisor rulings` — one line per advisor call: question, ruling,
      confidence. Omit the section if you made none.

    Then report back with ONLY (under 15 lines — the detail lives in the
    report file):
    - **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
    - Commits created (short SHA + subject)
    - One-line test summary: results ("full suite 214/214 passing, output
      pristine") or the verification you ran and what you observed
    - Your concerns, if any
    - How many advisor rulings the report records, if any
    - The report file path

    If BLOCKED or NEEDS_CONTEXT, put the specifics in the final message
    itself — the controller acts on it directly.

    Use DONE_WITH_CONCERNS if you completed the work but have doubts about correctness.
    Use BLOCKED if you cannot complete the build. Use NEEDS_CONTEXT if you need
    information that wasn't provided. Never silently produce work you're unsure about.
```

**Placeholders:**
- `[PLAN_FILE]` — REQUIRED: the plan or spec path — the requirements, exact
  values verbatim
- `[GLOBAL_CONSTRAINTS]` — the binding requirements copied verbatim from the
  plan's Global Constraints section or the spec
- `[REPORT_FILE]` — REQUIRED: `<workspace>/build-report.md`
