# Mock Interview Skill Implementation Plan

> **To execute this plan:** use the `executing-plans` skill. It reviews the plan,
> then asks how you want it built — review at the end (delegated: one subagent
> builds it all, an independent review at the end), or review each task
> (inline: a diff per task for you to approve).

**Goal:** Build the `mock-interview` skill in `clankit-life` (interview simulation:
coding / architecture / Q&A rounds + assessment), its `problem-setter` agent, remove
glossary reviews from `learn`, and wire the user's private notes repo to it.

**Architecture:** A portable prose skill, sibling to `learn`: a small dispatcher
SKILL.md that lazy-loads one session protocol file per session, a `problem-setter`
subagent as an information airlock (solutions and pressure lists live on disk, never
in the interviewer's context or chat), and two markdown state tables. Spec:
`docs/specs/2026-08-13-mock-interview-skill-design.md`.

**Tech Stack:** Markdown skill/agent files; `tsx` + `node:assert` for running
generated test suites.

## Global Constraints

- All skill/agent content is generic and portable — nothing user-specific, no
  notes-repo paths; user-specific wiring goes only in that repo's own CLAUDE.md
  (Task 8).
- Two-repo plan: Tasks 1–7 and 9 act in this repo, Task 8 in the user's private
  notes repo. Commit in the repo the task touches.
- Skill files follow `learn`'s conventions: frontmatter `name` + `description`,
  Defaults & Overrides table, plain-markdown user-editable state tables.
- The two postures rule everywhere: solve phase = terse interviewer (no hints, no
  encouragement, no solution reveal, ever — even when asked); post-mortem = teacher
  using `learn`'s Phase 3 rhythm. `grading.md` is loaded only at post-mortem.
- Outcome grades, exactly: `clean` (correct, in time, edge cases unprompted) ·
  `slow` (correct, over time) · `hinted` (needed a nudge) · `failed`. Problems are
  single-use — no re-serve queue exists.
- Confidence levels, exactly: `unknown / weak / shaky / solid`.
- State dir default is `.learn/` (shared with `learn`); state files are
  `interview-map.md` and `interview-log.md`.

---

### Task 1: Remove glossary reviews from `learn`

**Units:** `plugins/clankit-life/skills/learn/SKILL.md` — edited in place.

**Interacts:** nothing new; the meanings-review flow and `select-due.mjs` stay
untouched.

**Constraints:**
- Remove: the Phase 0 intro's "two recall types" framing (only meanings review
  remains), Phase 0b menu option 2 ("Glossary review") with renumbering, the whole
  "Glossary Review (reverse recall...)" section, `glossary-queue.md` from the
  Defaults & Overrides table and the Structure section.
- Phase 3 capture keeps **both** buckets, but the forgotten-term bucket's
  destination changes: terms still get added to `<notes root>/Glossary.md`
  (reference lookup only); no queue row, no scheduling fields, nothing quizzes them.
  Rewrite the Phase 3 bucket text and Phase 4 step 6 accordingly.
- Phase 4 summary (step 7) still mentions captured term count — reword "meanings vs
  glossary terms" to reflect that terms are reference-only now.

**Done when:** `grep -ri "glossary-queue\|glossary review" plugins/clankit-life/skills/learn/`
returns nothing; a read-through of Phase 0 → 0b → 4 shows a coherent flow with no
dangling menu numbers or references. Commit.

### Task 2: `mock-interview` SKILL.md — dispatcher

**Units:** `plugins/clankit-life/skills/mock-interview/SKILL.md` — argument parsing,
opening flow, the two postures, state schemas, lazy-loading rules.

**Interacts:** loads exactly one of `sessions/*.md` per session; reads/writes the
two state files; never loads `curriculum.md` (that belongs to the problem-setter
and the assessment) and loads `grading.md` only when a session file says to.

**Signatures:**
- Frontmatter: `name: mock-interview`; description triggers on practicing/mock
  technical interviews (phrase it as the action, e.g. "Use when the user wants to
  practice technical interviews — simulates coding, architecture, and Q&A rounds,
  grades harshly, tracks per-pattern confidence. Invoked as /mock-interview
  [code|arch|qa|assess].").
- Args: none → propose-and-ask; `code` → `sessions/coding.md`; `arch` →
  `sessions/architecture.md`; `qa` → `sessions/qa.md`; `assess` →
  `sessions/assessment.md`.
- Defaults & Overrides table rows: **State dir** default `.learn/` (holds
  `interview-map.md`, `interview-log.md`); **Learn integration** default `.learn/`
  state dir + `.learn/notes/` notes root, with a note that projects overriding
  `learn`'s locations should override these identically.
- `interview-map.md` schema: `| unit | kind | confidence | last-seen | note |`
  where `kind` ∈ `pattern | theme | qa-area` and `confidence` ∈
  `unknown | weak | shaky | solid`.
- `interview-log.md` schema:
  `| date | round | unit | problem | outcome | time | what went wrong |`.

**Constraints:**
- Opening flow: no `interview-map.md` → run `sessions/assessment.md`. Otherwise,
  with no arg: read map + log, propose the most valuable next session (weakest +
  stalest units first, with a one-line why), and **ask** — the user always picks;
  never schedule, never nag about cadence (there is none).
- The postures section carries the non-negotiables: interviewer volunteers nothing,
  answers only explicit questions tersely, never reveals solutions (especially when
  asked), lets the user fail completely; the user talking/thinking aloud gets terse
  acknowledgments only, no reaction that leaks whether their path is right.
- State-update rules live here once (sessions reference them): after every session,
  update the unit's row in the map and append one log row.

**Done when:** read-back — the file parses as a coherent dispatcher, every referenced
path matches the names in this plan, and it contains no session-protocol detail
(that lives in `sessions/`). Commit.

### Task 3: `curriculum.md` and `grading.md`

**Units:** `plugins/clankit-life/skills/mock-interview/curriculum.md` — the units
the map tracks and generators draw from; `.../grading.md` — how sessions get graded.

**Interacts:** `curriculum.md` is read by the problem-setter agent and the
assessment session; `grading.md` by post-mortems only.

**Constraints — curriculum, three sections:**
- *Patterns* — each with the four fields **trigger signal / invariant / complexity /
  canonical problem**. Exactly this slimmed list — Tier 1: two pointers · sliding
  window (fixed and variable) · hash map counting and index lookup · string scanning
  with an explicit cursor · stack · monotonic stack · binary search on a sorted
  array · binary search on the answer (predicate form) · leftmost/rightmost boundary
  variants · sorting with custom comparators · intervals (merge, insert, overlap) ·
  prefix sums and difference arrays. Tier 2: heap/priority queue (top-k, merge-k,
  scheduling) · linked list mechanics (reverse, cycle detection, merge) · trees
  (recursive DFS, iterative DFS, BFS by level, path sums, LCA, BST invariants) ·
  graph traversal on grids and adjacency lists · connected components · topological
  sort · BFS shortest path (unweighted) · union-find. **No Tier 3** (no DP, no
  backtracking, no number theory, no bit manipulation).
- *Practical themes* — the `%key%` family: string parsing/interpolation, tokenizers,
  small data transforms, date/interval munging, mini state machines — each with
  example follow-up constraints (escaping a literal delimiter, missing keys, nested/
  recursive values, streaming input, reporting first-error position, recovering to
  list all errors).
- *Q&A topic areas* — JS/TS runtime (event loop, async, closures, types), HTTP &
  networking, databases (indexing, transactions, query shape), auth & security,
  frontend (rendering, state, performance), debugging & production war stories,
  testing — each with 3–4 sample question stems.
- *Cross-cutting, applied in every coding session:* complexity incl. amortised ·
  inferring intended complexity from input bounds · recursion→iteration and stack
  depth · the edge-case checklist (empty, single element, all duplicates, already
  sorted, maximum size, negatives, unicode/multi-byte).

**Constraints — grading:**
- Dimensions: correctness · edge cases identified **before** being told · complexity
  stated correctly · readability and naming · how the design absorbed the follow-up
  constraint · assumptions stated up front · verbalisation quality (narrated
  approach before coding, flagged assumptions aloud, thought aloud at decision
  points vs went dark).
- The four outcome grades (see Global Constraints) with one line each on how the
  grade maps to a confidence update in the map.
- Anti-pattern instructions, addressed to the grader: no generous grading; no
  praise openers; if a session was bad, say so and say why; correctness comes from
  executed tests, never from reading the code; never reveal the solution early;
  don't favor comfortable patterns; the user produces, the skill evaluates —
  exposition belongs in the post-mortem only; never accept skipping the
  clarifying-questions phase.

**Done when:** read-back against the spec's curriculum and grading sections — every
listed pattern/theme/area present with its fields, no Tier 3 leakage. Commit.

### Task 4: `problem-setter` agent

**Units:** `plugins/clankit-life/agents/problem-setter.md` — the off-screen
generator/verifier (first `agents/` entry in this plugin; Claude Code auto-discovers
`agents/*.md`, no manifest change).

**Interacts:** dispatched by `sessions/coding.md` and `sessions/architecture.md`
via the Agent tool with a working directory (the session scratchpad) in its prompt;
it writes files there and returns filtered text only.

**Signatures:**
- Frontmatter: `name: problem-setter`; description says it generates and verifies
  interview problems off-screen and must never include solution code in its reply;
  `tools: Read, Write, Bash`.
- Coding-round input (in prompt): pattern or theme + its curriculum fields,
  difficulty, working dir, and any prior-session context to avoid repeats.
  Files written: `problem.md`, `reference.ts`, `tests.ts`. `tests.ts` imports the
  target as `./solution.ts` and uses `node:assert` — no framework.
- Verification loop: `cp reference.ts solution.ts && npx tsx tests.ts`; iterate
  until green; then delete `solution.ts`.
- Coding-round return, **only**: the problem statement (deliberately
  underspecified), the clarification key (intended answers to each underspecified
  decision), and `reference verified, N tests`.
- Architecture-round input: scenario domain hints (product-engineering bias:
  multi-tenant SaaS, permissions, event ingestion, sync, background jobs) +
  interviewer persona to generate. Files written: `scenario.md`,
  `pressure-list.md` (5–6 things the design must survive). Return, **only**: the
  vague opening prompt, the persona (who the interviewer is), and the realistic
  product constraints the interviewer may reveal when asked. The pressure list is
  never returned — the session reads the file only at post-mortem.
- Follow-up-constraint mode (coding): given the working dir and the new constraint,
  update `reference.ts`, extend `tests.ts`, re-verify, return only the constraint
  statement + `reference verified, N tests`.

**Constraints:** the reply must never contain reference code, test expectations, or
pressure-list items — state this in the agent definition as its prime rule.

**Done when:** dry run — dispatch the agent for one Tier 1 pattern into a temp dir;
its reply contains no code; `cp reference.ts solution.ts && npx tsx tests.ts`
passes by hand. Commit.

### Task 5: `sessions/coding.md`

**Units:** the coding-round protocol (~45 min + post-mortem).

**Interacts:** dispatches `problem-setter` (Task 4 signatures); loads `grading.md`
at post-mortem; updates both state files per SKILL.md's rules; appends meanings
cards to `learn`'s `review-queue.md` (schema is defined in the `learn` skill —
reference it, don't restate it).

**Constraints — the protocol, in order:**
1. Optional 5-min recognition warm-up: 2–3 one-paragraph problem statements, user
   names the pattern + trigger signal, no solving; results feed the map.
2. Unit selection from the map (weakest/stalest), bucket = pattern or practical
   theme; dispatch problem-setter; present only the problem statement.
3. Clarifying phase: user must ask questions and state assumptions/edge cases;
   interviewer answers tersely from the clarification key. Refuse to skip this
   phase. The tests probe the underspecified decisions whether or not the user
   asked.
4. Pre-code gate: user states approach, data structure, invariant, and time/space
   complexity aloud. A wrong complexity claim is recorded for grading even if tests
   later pass.
5. Timer: record wall-clock start via `date`; honest, not enforced — elapsed feeds
   the `slow` grade. User solves **outside the session** (own editor, no LSP/AI,
   doesn't run it); user may keep talking; interviewer gives terse acknowledgments
   only.
6. Submission: pasted code **or** a file path — either; write/copy it to
   `solution.ts` in the working dir, run `npx tsx tests.ts`, report **pass/fail per
   test and nothing else** — no diagnosis, no fixes.
7. One follow-up constraint via problem-setter's follow-up mode, ~10 min, same
   submission/test treatment. Repeat once more only if time allows.
8. Post-mortem: load `grading.md`, grade bluntly first, then switch to `learn`
   Phase 3 teaching rhythm; capture concept gaps as meanings cards; update map +
   log (grade, elapsed time, what specifically went wrong); if the gap is
   foundational, recommend a `/learn <topic>` session.

**Done when:** read-back — protocol matches spec order, every problem-setter
interaction uses Task 4's exact file names and return contract, posture rules never
contradicted. Commit.

### Task 6: `sessions/architecture.md` and `sessions/qa.md`

**Units:** the architecture-round protocol (~60 min + post-mortem) and the Q&A-round
protocol (~30–45 min + post-mortem).

**Interacts:** architecture dispatches `problem-setter` (architecture mode, Task 4);
Q&A reads `learn`'s hub MOC, topic notes, and progress log via the learn-integration
locations from SKILL.md's Defaults & Overrides; both load `grading.md` at
post-mortem and update map + log; Q&A appends meanings cards to `learn`'s
`review-queue.md`.

**Constraints — architecture:**
- One interviewer persona for the whole session (from the problem-setter's return);
  persona shapes the pressure: a founder pushes build-vs-buy and speed, a staff
  engineer migrations and operational cost.
- Interviewer states the vague prompt and lets the user drive: scoping, clarifying
  questions, data model, service boundaries, API shape, failure modes, what to
  defer. Answers only what's asked, from the returned product constraints; probes
  progressively harder as the design firms up — continuous peer probing, no
  role-switch act.
- Post-mortem only: read `pressure-list.md` from the working dir; coverage of the
  list is a grading input alongside `grading.md`'s dimensions.

**Constraints — Q&A:**
- Verbal only, no code. Selection reads `learn`'s state both ways: probe studied
  topics under interview pressure (no scaffolds), **and** interview-common areas
  the hub MOC shows unassessed — an interviewer won't skip auth because the user
  hasn't studied it. Draw question stems from `curriculum.md`'s Q&A section, ask
  in an interviewer's register (grade and move on; no teaching mid-round).
- Feedback direction: gaps become meanings cards; the log row notes topics that
  flunked under interview conditions and names the `/learn <topic>` follow-up.

**Done when:** read-back — architecture never sees the pressure list before
post-mortem; Q&A never teaches mid-round; both write state per SKILL.md's rules.
Commit.

### Task 7: `sessions/assessment.md`

**Units:** the first-session protocol (~45 min, no coding) that seeds
`interview-map.md`.

**Interacts:** reads `curriculum.md` (the one session file that does) and `learn`'s
hub MOC; writes the initial `interview-map.md` and one log row.

**Constraints:**
- Short recognition and reasoning questions across patterns, themes, and Q&A areas
  ("when does a monotonic stack apply", "why is binary search on the answer valid
  here") — batched a few per message, not one-per-turn.
- Seeded by the hub MOC: don't re-prove topics `learn` already grades solid; map
  those with a note crediting the source.
- Output: every curriculum unit gets a map row with a confidence level and note,
  plus a proposed session order in the closing summary that front-loads weak units.
- Auto-runs when no map exists; re-run only on explicit `/mock-interview assess`
  (it overwrites the map — say so before overwriting).

**Done when:** read-back — a fresh run would produce a complete map (every
curriculum unit present) without coding and without teaching. Commit.

### Task 8: Notes-repo wiring

**Units:** the notes repo's `CLAUDE.md` — new override entry;
`.clanker/learning/glossary-queue.md` — deleted.

**Interacts:** the override entry mirrors the existing "### learn" block's style
under "## Skill Overrides".

**Constraints:**
- Add `### mock-interview (clankit-life:mock-interview)` with: state dir
  `.clanker/learning/`, learn integration pointing at the existing learn overrides
  (notes root `Learning/`, state dir `.clanker/learning/`).
- `git rm .clanker/learning/glossary-queue.md`. Do not touch `Learning/Glossary.md`
  or the learn overrides' Glossary line (capture into it continues).
- The notes repo may have unrelated uncommitted changes — stage only these two
  paths.

**Done when:** the notes-repo commit contains exactly the CLAUDE.md edit and
the deletion.

### Task 9: End-to-end read-back and smoke run

**Units:** verification only — fixes land as a final commit in clankit if needed.

**Constraints:**
- Cross-file read-back of all seven new files + edited `learn/SKILL.md`: every
  path, file name, command arg, schema column, grade word, and confidence word
  matches across files (the Task 2 signatures are the source of truth); no
  session file leaks another's protocol; `grading.md` referenced only at
  post-mortem points.
- Smoke run of the full coding-round mechanics without the user: dispatch
  `problem-setter` into a temp dir, confirm the reply carries no solution code,
  then simulate a submission (copy `reference.ts` to `solution.ts` yourself) and
  run `npx tsx tests.ts` — all tests pass. This verifies the runner contract, not
  the interview.

**Done when:** both checks pass; any fixes committed. Report explicitly which
checks ran and their results — never assert success without having run them.
