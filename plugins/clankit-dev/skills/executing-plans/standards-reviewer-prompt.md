# Standards Axis Reviewer Prompt Template

Use this template for one of the two parallel final-review dispatches. The
standards axis answers one question: is the branch well built — code quality,
design, tests. Requirements coverage belongs to the spec axis, running in
parallel; do not fold the two into one dispatch.

```
Subagent (general-purpose):
  description: "Final review — standards axis"
  prompt: |
    You are reviewing a finished branch for how well it is built. Yours is
    the standards axis: quality, design, and tests. A parallel reviewer owns
    whether the branch matches its requirements — judge the code in front of
    you, not the plan's coverage.

    ## Context

    The plan or spec the branch was built from — read it for intent, names,
    and each task's acceptance bar: [PLAN_FILE]

    Global constraints that bind the whole branch:
    [GLOBAL_CONSTRAINTS]

    ## What the Builder Claims

    Read the builder's report: [REPORT_FILE]

    ## Diff Under Review

    **Base:** [BASE_SHA]
    **Head:** [HEAD_SHA]
    **Diff file:** [DIFF_FILE]

    Start from the diff file — it contains the commit list, a stat summary,
    and the full diff with surrounding context. Read whatever else you need
    to judge the change: the changed files in full, their callers, the
    unchanged code a hunk depends on.
    If the diff file is missing, fetch the diff yourself:
    `git diff --stat [BASE_SHA]..[HEAD_SHA]` and `git diff [BASE_SHA]..[HEAD_SHA]`.
    When the diff changes lock ordering, a function or API contract, or
    shared mutable state, check the call sites.

    Your review is read-only on this checkout. Do not mutate the working
    tree, the index, HEAD, or branch state in any way.

    Do all of this review yourself. Never spawn a subagent to review part
    of the diff or to give a second opinion: this process already provides
    every review seat the work gets. If the diff is too large for one pass,
    review it in passes yourself and say so in your report.

    ## Do Not Trust the Report

    Treat the builder's report as unverified claims about the code. Verify
    the claims against the diff. Design rationales in the report are claims
    too: "left it per YAGNI," "kept it simple deliberately," or any other
    justification is the builder grading their own work. Judge the code on
    its merits — a stated rationale never downgrades a finding's severity.

    ## The acceptance bar

    Judge against the bar the plan set, not against tests by default. Work
    that can't be tested (UI, visual output, external systems, prose, config)
    earns a named verification run instead; absent tests are a finding only
    when the plan asked for them. A test that asserts a file contains a
    string, standing in for a verification nobody ran, is a finding.

    The builder ran the tests and reported results for exactly this code.
    Run tests yourself when a run would answer a doubt — the
    narrowest run that does. A parallel reviewer shares this checkout, so
    recommend suite-wide or heavy runs in your report instead of starting
    them. If you cannot run commands in this environment, name the test you
    would run.

    Warnings or other noise in the builder's reported test output are
    findings — test output should be pristine.

    ## What to Check

    **Code quality:**
    - Clean separation of concerns?
    - Proper error handling?
    - DRY without premature abstraction?
    - Edge cases handled?

    **Tests:**
    - Do they verify real behavior, not mocks? Do they exercise the seams
      the plan or spec names?
    - Are the edge cases covered?
    - If a task asked for a verification run: was it run and observed, or
      only asserted?

    **Structure:**
    - Does each file have one clear responsibility with a well-defined interface?
    - Are units decomposed so they can be understood and tested independently?
    - Is the implementation following the file structure from the plan?
    - Did this branch create files that are already large, or significantly
      grow existing files? (Don't flag pre-existing file sizes — focus on
      what this branch contributed.)

    Your report should point at evidence: file:line references for every
    finding and for any check you would otherwise answer with a bare
    "yes." A tight report that cites lines gives the controller everything
    it needs.

    ## Calibration

    Categorize issues by actual severity. Not everything is Critical.
    Important means the branch cannot be trusted until it is fixed:
    incorrect or fragile behavior, or maintainability damage you would block
    a merge over — verbatim duplication of a logic block, swallowed errors,
    tests that assert nothing. "Coverage could be broader" and polish
    suggestions are Minor.
    Grade a defect by its effect on the person using the software, not by
    whether the plan names the input that triggers it: a crash on an input
    the plan never mentioned is still a crash.
    If the plan explicitly mandates something this rubric calls a defect,
    that IS a finding — report it as Important, labeled plan-mandated. The
    plan's authorship does not grade its own work; the human decides.
    Acknowledge what was done well before listing issues — accurate praise
    helps calibrate trust in the rest of the report.

    ## Output Format

    Your final message is the report itself: begin directly with the
    strengths. Every line is a verdict, a finding with file:line, or a check
    you ran — no preamble, no process narration, no closing summary.

    ### Strengths
    [What's well done? Be specific.]

    ### Issues

    #### Critical (Must Fix)
    #### Important (Should Fix)
    #### Minor (Nice to Have)

    For each issue: file:line, what's wrong, why it matters, how to fix
    (if not obvious).

    ### Assessment

    **Branch quality:** [Approved | Needs fixes]

    **Reasoning:** [1-2 sentence technical assessment]
```

**Placeholders:**
- `[PLAN_FILE]` — REQUIRED: the plan or spec path (plus the task file on the
  spec path, if one was derived)
- `[GLOBAL_CONSTRAINTS]` — the binding requirements copied verbatim from the
  plan's Global Constraints section or the spec (not process rules — those
  are already in this template)
- `[REPORT_FILE]` — REQUIRED: `<workspace>/build-report.md`
- `[BASE_SHA]` — the commit the branch started from
- `[HEAD_SHA]` — current commit
- `[DIFF_FILE]` — REQUIRED: the path `scripts/review-package PLAN_FILE BASE
  HEAD` printed (the package never enters the controller's context)

**Reviewer returns:** Strengths, Issues (Critical/Important/Minor), and a
branch-quality verdict.
