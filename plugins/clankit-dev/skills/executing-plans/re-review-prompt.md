# Scoped Re-Review Prompt Template

Use this template when dispatching the re-review after the final review's fix
wave. The re-reviewer verifies the findings were addressed and checks the fix
diff for new breakage. It is not a fresh review — the two-axis review already
happened, and there is no second fix wave: what this re-review leaves open,
the controller adjudicates.

**Purpose:** Verify each finding from the two axis reviews was addressed, and
that the fix itself broke nothing.

```
Subagent (general-purpose):
  description: "Re-review the fix wave"
  model: [MODEL — REQUIRED: choose per SKILL.md Model Selection; an omitted
         model silently inherits the session's most expensive one]
  prompt: |
    You are re-reviewing a fix wave. A two-axis review of a finished branch
    produced findings; a fix subagent has attempted to address them. Your
    job is to verdict each finding and inspect the fix diff — nothing else.

    ## The Requirements

    The plan or spec the branch was built from: [PLAN_FILE]

    ## The Findings Under Verification

    [FINDINGS]

    ## The Fix

    Read the fix subagent's report (appended at the end): [REPORT_FILE]

    **Fix base:** [FIX_BASE_SHA] (the head the axis reviewers saw)
    **Head:** [HEAD_SHA]
    **Diff file:** [DIFF_FILE]

    Read the diff file once — it contains the fix commits, a stat summary,
    and the fix diff with surrounding context. Do not re-run git commands.
    If the diff file is missing, fetch the diff yourself:
    `git diff --stat [FIX_BASE_SHA]..[HEAD_SHA]` and
    `git diff [FIX_BASE_SHA]..[HEAD_SHA]`.

    Your review is read-only on this checkout. Do not mutate the working
    tree, the index, HEAD, or branch state in any way.

    ## Scope

    Your scope is the findings list and the fix diff. Verdict every finding.
    Inspect the fix diff for new problems the fix itself introduced. Do NOT
    re-review code the fix did not touch: the branch already had its full
    review. If you notice an issue entirely outside the fix diff, report it
    under Out-of-Scope Observations — it is non-blocking and does not
    trigger another wave.

    ## Tests

    The fix subagent re-ran the tests covering the amended code and appended
    the results to the report file. Treat the report as unverified claims:
    confirm the fix report names the covering tests and shows their output,
    and verify the claims against the diff. Do not re-run the suite to
    confirm their report. Run a test only when reading the code raises a
    specific doubt that no existing run answers — and then a focused test,
    never a package-wide suite.

    ## Output Format

    Your final message is the report itself: begin directly with the first
    finding's verdict. Every line is a verdict, a finding with file:line,
    or a check you ran — no preamble, no process narration.

    ### Finding Verdicts

    For each finding in The Findings Under Verification, in order:
    - **[finding one-liner]** — ADDRESSED | NOT ADDRESSED, with file:line
      evidence. "Attempted" is not addressed: the specific defect must no
      longer exist.

    ### New Breakage in the Fix Diff

    Anything the fix itself broke or introduced, with severity
    (Critical/Important/Minor) and file:line. "None" if clean.

    ### Out-of-Scope Observations

    Issues you noticed entirely outside the fix diff. Non-blocking; the
    controller records these for its final report. "None" if none.

    ### Verdict

    **Fix wave:** [All findings addressed, no new Critical/Important
    breakage | Findings remain open] — list the open ones.
```

**Placeholders:**
- `[MODEL]` — REQUIRED: reviewer model per SKILL.md Model Selection; scoped
  re-reviews of small fix diffs take a cheap-to-mid tier
- `[PLAN_FILE]` — the plan or spec path the branch was built from
- `[FINDINGS]` — the Critical/Important findings and spec gaps from both axis
  reviews, copied verbatim, one per bullet
- `[REPORT_FILE]` — the fix subagent's report file
- `[FIX_BASE_SHA]` — the head the axis reviewers saw
- `[HEAD_SHA]` — current commit
- `[DIFF_FILE]` — the path `scripts/review-package PLAN_FILE FIX_BASE HEAD` printed

**Re-reviewer returns:** per-finding verdicts (ADDRESSED / NOT ADDRESSED),
new breakage in the fix diff, out-of-scope observations, and a wave verdict.
