# Curriculum

The units this skill tracks. Every entry here gets a row in `interview-map.md`,
and generators draw problems from these entries.

`sessions/assessment.md` is the only file that reads this one in full. Every
other read is narrow: the `problem-setter` agent works from the unit's fields,
`sessions/coding.md` and `sessions/architecture.md` read the selected unit's
entry and nothing else, and `sessions/qa.md` reads the Q&A topic areas section. **Never load the whole file
into a solve phase** — a curriculum sitting in the interviewer's context is a
list of hints waiting to leak.

The list is deliberately practical: architecture weighted highest, practical
coding second, algorithms slimmed to what a product-engineering interview
actually asks. It stops at Tier 2 by design — there is **no Tier 3**. Dynamic
programming, backtracking, number theory, and bit manipulation are out of scope;
do not generate problems for them and do not add them to the map.

---

## Patterns

`kind: pattern` in the map. Each carries four fields:

- **Trigger signal** — what in a problem statement should make the user reach
  for it. This is what recognition warm-ups and assessment questions probe.
- **Invariant** — the thing that must stay true for the pattern to be correct.
  A user who cannot state it does not own the pattern.
- **Complexity** — expected time/space when applied correctly.
- **Canonical problem** — the shape generated problems vary from. Vary it;
  never serve it verbatim twice.

### Tier 1

**Two pointers**
- *Trigger signal:* a sorted array (or one that can be sorted) plus a pair/triple condition, or partitioning a sequence in place.
- *Invariant:* everything outside the two pointers is already resolved — the answer, if it exists, lies strictly between them.
- *Complexity:* O(n) time after sort, O(1) extra space.
- *Canonical problem:* find a pair summing to a target in a sorted array; in-place removal/dedup.

**Sliding window (fixed and variable)**
- *Trigger signal:* "contiguous subarray/substring" plus a constraint on the window's contents — longest, shortest, or exactly-k.
- *Invariant:* the window always satisfies the constraint after shrinking; every element enters and leaves at most once.
- *Complexity:* O(n) time, O(k) space for the window's bookkeeping.
- *Canonical problem:* longest substring without repeating characters (variable); max sum of k consecutive elements (fixed).

**Hash map counting and index lookup**
- *Trigger signal:* frequency, "seen before", grouping by a derived key, or a complement lookup in one pass.
- *Invariant:* the map holds a correct summary of everything processed so far, and only that.
- *Complexity:* O(n) time, O(n) space; O(1) amortised per lookup.
- *Canonical problem:* two-sum on an unsorted array; group anagrams; first non-repeating character.

**String scanning with an explicit cursor**
- *Trigger signal:* parsing by hand — delimiters, escapes, quoted sections, number/word extraction — where regex or `split` would lose information.
- *Invariant:* the cursor only moves forward, and at every loop iteration it points at the start of the next unconsumed token.
- *Complexity:* O(n) time, O(1) extra beyond the output.
- *Canonical problem:* parse a template of literals and `%key%` placeholders; tokenize an expression.

**Stack**
- *Trigger signal:* nesting, matching pairs, undo/backtrack semantics, or "most recent unresolved thing".
- *Invariant:* the stack holds exactly the currently-open items, innermost on top.
- *Complexity:* O(n) time, O(n) space.
- *Canonical problem:* balanced brackets; evaluate RPN; simplify a path.

**Monotonic stack**
- *Trigger signal:* "next greater/smaller element", spans, or a rectangle/area bounded by neighbours.
- *Invariant:* the stack stays strictly increasing (or decreasing); popping an element is the moment its answer is known.
- *Complexity:* O(n) time amortised — each element pushed and popped once — O(n) space.
- *Canonical problem:* next greater element; daily temperatures; largest rectangle in a histogram.

**Binary search on a sorted array**
- *Trigger signal:* sorted input plus a lookup, and a linear scan is too slow for the stated bounds.
- *Invariant:* the target, if present, is always inside `[lo, hi]`; the range shrinks every iteration.
- *Complexity:* O(log n) time, O(1) space.
- *Canonical problem:* find a value; find an insertion point; search a rotated sorted array.

**Binary search on the answer (predicate form)**
- *Trigger signal:* "minimum X such that…" / "maximum X such that…" where checking a candidate X is easy but constructing the best X is not.
- *Invariant:* the predicate is monotonic over the answer space — false…false, true…true — so the boundary is findable.
- *Complexity:* O(n log(range)) time — a feasibility check per probe.
- *Canonical problem:* minimum capacity to ship packages in D days; split an array to minimise the largest sum.

**Leftmost/rightmost boundary variants**
- *Trigger signal:* duplicates in the input plus "first occurrence", "last occurrence", or a count via two boundaries.
- *Invariant:* the comparison decides which side keeps the equal case; the loop's exit condition must match the half-open convention chosen.
- *Complexity:* O(log n) time, O(1) space.
- *Canonical problem:* first and last position of a value in a sorted array; count occurrences.

**Sorting with custom comparators**
- *Trigger signal:* an ordering that isn't natural — multi-key, derived key, or an ordering defined by a pairwise rule.
- *Invariant:* the comparator is a strict weak ordering — consistent, transitive, antisymmetric. An inconsistent comparator produces garbage, not just a wrong order.
- *Complexity:* O(n log n) time, O(n) or O(log n) space depending on the sort.
- *Canonical problem:* sort by multiple fields with mixed direction; arrange numbers to form the largest concatenation.

**Intervals (merge, insert, overlap)**
- *Trigger signal:* pairs of start/end values — bookings, ranges, time windows — and a question about overlap, coverage, or collision.
- *Invariant:* sort by start; the running merged interval extends while the next start is `<=` the current end.
- *Complexity:* O(n log n) time dominated by the sort, O(n) space for the output.
- *Canonical problem:* merge overlapping intervals; insert an interval; can all meetings be attended.

**Prefix sums and difference arrays**
- *Trigger signal:* repeated range queries over static data (prefix sums), or many range updates followed by one read (difference array).
- *Invariant:* `prefix[i]` is the total of everything strictly before `i`, so a range is one subtraction; a difference array holds deltas that sum back to the values.
- *Complexity:* O(n) build, O(1) per query.
- *Canonical problem:* subarray sum equals k; range sum queries; count concurrent bookings.

### Tier 2

**Heap / priority queue (top-k, merge-k, scheduling)**
- *Trigger signal:* "k largest/smallest", merging sorted streams, or repeatedly needing the current extreme as data changes.
- *Invariant:* the heap holds exactly the k candidates that could still be the answer, with the one to evict at the root.
- *Complexity:* O(n log k) for top-k; O(n log n) for merge-k over n total elements.
- *Canonical problem:* k largest elements; merge k sorted lists; task scheduler with cooldown.

**Linked list mechanics (reverse, cycle detection, merge)**
- *Trigger signal:* pointer manipulation without index access, in-place restructuring, or O(1) space required over a sequence.
- *Invariant:* at every step you hold the nodes you still need — typically `prev`, `curr`, `next` — and no reachable node is orphaned before it is relinked.
- *Complexity:* O(n) time, O(1) space.
- *Canonical problem:* reverse a list (whole or a sublist); detect a cycle and find its entry; merge two sorted lists.

**Trees (recursive DFS, iterative DFS, BFS by level, path sums, LCA, BST invariants)**
- *Trigger signal:* hierarchical data, "at each node", per-level questions, or an ordering property to exploit.
- *Invariant:* the recursion returns exactly what the parent needs to compute its own answer; for BSTs, the left/right bound narrows on the way down and is never re-checked from a single node's value alone.
- *Complexity:* O(n) time for a full traversal; O(h) space recursive, O(w) for BFS by level.
- *Canonical problem:* level-order with per-level grouping; path sum to a target; lowest common ancestor; validate a BST.

**Graph traversal on grids and adjacency lists**
- *Trigger signal:* cells with neighbours, or entities with edges, and a reachability/exploration question.
- *Invariant:* a node is marked visited when enqueued or entered, never later — marking late is the classic source of repeated work and infinite loops.
- *Complexity:* O(V + E) time, O(V) space; a grid is O(rows × cols).
- *Canonical problem:* flood fill; number of islands; can you reach B from A.

**Connected components**
- *Trigger signal:* "how many groups", "are these two in the same group", clustering by relation.
- *Invariant:* every node belongs to exactly one component; a traversal started from an unvisited node consumes its whole component.
- *Complexity:* O(V + E) time over all components combined.
- *Canonical problem:* count islands; count friend circles; group accounts by shared email.

**Topological sort**
- *Trigger signal:* dependencies, prerequisites, build order, "is this ordering possible".
- *Invariant:* a node is emitted only once every prerequisite has been emitted; if fewer than V nodes come out, a cycle exists.
- *Complexity:* O(V + E) time, O(V) space.
- *Canonical problem:* course schedule (feasibility and order); task/build ordering.

**BFS shortest path (unweighted)**
- *Trigger signal:* fewest steps/moves/hops, with every edge costing the same.
- *Invariant:* BFS visits nodes in nondecreasing distance order, so the first time a node is reached is via a shortest path.
- *Complexity:* O(V + E) time, O(V) space.
- *Canonical problem:* shortest path in a maze grid; word ladder; minimum moves on a board.

**Union-find**
- *Trigger signal:* incremental merging with connectivity queries interleaved, or cycle detection while adding edges.
- *Invariant:* every element points toward its set's representative; union always joins two roots, never two arbitrary members.
- *Complexity:* near O(1) amortised per operation with path compression and union by rank.
- *Canonical problem:* redundant connection; number of provinces with incremental merges; accounts merge.

---

## Practical themes

`kind: theme` in the map. The `%key%` family — the kind of coding a product
engineer actually does under interview conditions. Weighted second-highest after
architecture; a coding round should reach for these at least as often as for the
pattern list.

Each theme lists example follow-up constraints. The coding round serves the base
problem first, then applies **one** of these mid-round to see whether the design
absorbs it or has to be rewritten. That is the point of the theme bucket:
first-draft code that only ever handled the happy path shows itself here.

**String parsing and interpolation**
- *Shape:* substitute `%key%` placeholders from a lookup, respecting literals around them.
- *Follow-up constraints:* escaping a literal delimiter (`%%` means a literal `%`); missing keys (throw, leave as-is, or substitute empty — the choice must be stated); nested or recursive values (a substitution whose result itself contains a placeholder); reporting the character position of the first error; recovering to list *all* errors instead of failing on the first.

**Tokenizers**
- *Shape:* split input into typed tokens — identifiers, numbers, strings, operators, whitespace — with positions attached.
- *Follow-up constraints:* quoted sections containing the delimiter; escapes inside quotes; streaming input arriving in arbitrary chunks so a token straddles a boundary; reporting first-error position; error recovery that skips the bad token and keeps tokenizing.

**Small data transforms**
- *Shape:* reshape a collection — group, pivot, join two lists on a key, flatten or nest, aggregate.
- *Follow-up constraints:* duplicate keys on the join side; missing keys; nested/recursive structure of arbitrary depth; a streaming source too large to hold in memory; reporting which input rows were dropped and why.

**Date and interval munging**
- *Shape:* work with instants and ranges — overlap, coverage, business hours, recurring slots, durations.
- *Follow-up constraints:* half-open vs closed interval conventions and where the boundary lands; time zones and DST gaps; open-ended ranges (no end); a streaming feed of updates; collecting every conflicting pair rather than reporting the first.

**Mini state machines**
- *Shape:* consume input one unit at a time with explicit states — a small protocol reader, a quoted-CSV parser, a retry/backoff lifecycle.
- *Follow-up constraints:* an escape state that suspends the normal transitions; input that ends mid-state (unterminated quote, truncated record); streaming input across chunks with state carried between them; reporting the position where the machine got stuck; recovering to a known state and continuing to collect later errors.

---

## Architecture domains

`kind: arch-domain` in the map. The product-engineering territory an
architecture round is set in — weighted highest of the four buckets. Each domain
is a unit the map tracks and the architecture round selects from; the generated
scenario dresses it in a product, and the pressure list comes from the recurring
hard questions below.

A scenario usually touches more than one domain. The one selected is the unit
that gets graded; the others are context.

**Multi-tenant SaaS and permissions**
- *Covers:* tenant isolation, the data model that enforces it, roles and
  resource-level permissions, sharing across tenant boundaries, admin/support
  impersonation.
- *Recurring hard questions:* where isolation is enforced (row, schema, or
  database) and what a bug at that layer costs; how a permission check stays
  cheap on a list endpoint; what happens when one tenant is 90% of the load;
  how a permission model survives the first customer who wants a custom role.

**Event ingestion and webhooks**
- *Covers:* accepting events from outside systems, delivery to consumers,
  retries, ordering, and the storage behind them.
- *Recurring hard questions:* at-least-once delivery and what makes the consumer
  idempotent; a sender that retries a burst you already processed; ordering
  guarantees you actually need versus the ones you claim; backpressure when a
  downstream consumer is slow; the dead-letter path and who looks at it.

**Sync and offline**
- *Covers:* clients that read and write while disconnected, reconciliation on
  reconnect, and what the user sees in between.
- *Recurring hard questions:* conflict resolution and who wins (and how you tell
  the user); what the sync protocol sends — deltas, versions, or the whole
  document; clock skew and why timestamps are a poor arbiter; a client that
  reconnects after a month; how optimistic UI rolls back.

**Background jobs and scheduling**
- *Covers:* work moved off the request path — queues, workers, recurring jobs,
  fan-out, and long-running tasks.
- *Recurring hard questions:* exactly-once versus idempotent-and-at-least-once;
  a job that fails halfway through its side effects; the poison message that
  retries forever; scheduled work in the presence of time zones and DST;
  isolating a slow job class from a latency-sensitive one; how a job is
  cancelled or superseded.

**Billing and metering**
- *Covers:* counting usage, turning it into money, plans and limits, and the
  invoicing boundary with a payment provider.
- *Recurring hard questions:* metering accuracy against event volume — sampled,
  aggregated, or exact, and what each costs; proration, plan changes, and
  refunds mid-period; enforcing a limit without a synchronous check on the hot
  path; reconciling with the provider when the two disagree; why billing data
  gets immutable records instead of updates.

**Search and denormalized reads**
- *Covers:* read paths that cannot be served by the write model — search
  indexes, materialised views, caches, and feeds.
- *Recurring hard questions:* how the denormalized copy is kept fresh and what
  staleness the product can tolerate; reindexing without downtime; permissions
  applied to search results without destroying the query's performance;
  cache invalidation triggered by a write that is several hops away;
  what breaks when the index and the source of truth disagree.

---

## Q&A topic areas

`kind: qa-area` in the map. Verbal only, no code. Each area lists sample question
stems — vary them; they set the register, they are not a script.

**JS/TS runtime (event loop, async, closures, types)**
- What is the event loop actually doing while a function is suspended at `await`?
- Why do microtasks starve timers, and when has that bitten you?
- What does a closure capture — the value or the binding — and how does that show up in a loop?
- Where does TypeScript's structural typing let something through that a nominal system would catch?

**HTTP and networking**
- Walk me through what happens between a click and the first byte rendered.
- When would you choose a 409 over a 422, and does the client care?
- What does a CORS preflight actually check, and what does it not protect you from?
- Where do you put caching for a feed that's personalised but mostly identical between users?

**Databases (indexing, transactions, query shape)**
- How does the planner decide your index isn't worth using?
- You have a composite index on `(a, b)` — which queries does it help, and which does it not?
- What does READ COMMITTED let you see that REPEATABLE READ doesn't?
- This endpoint got slow as the table grew. How do you find out why?

**Auth and security**
- Session cookie or JWT for a new product — argue both, then pick.
- Where do you store a token in a browser, and what attack does each choice expose you to?
- How do you revoke access immediately in a stateless auth scheme?
- What's the difference between authentication and authorization failures in your API surface, and why does it matter to an attacker?

**Frontend (rendering, state, performance)**
- What causes a re-render you didn't want, and how do you find it?
- Server state versus client state — where's the line, and what breaks when you blur it?
- A list of 10,000 rows is janky. Walk me through the options in order of what you'd try.
- What's actually happening during hydration, and why can it be slower than the initial render?

**Debugging and production war stories**
- Tell me about a bug that only happened in production. How did you corner it?
- What do you reach for first when latency doubles and nothing was deployed?
- Describe a time you were wrong about a root cause. What misled you?
- How do you debug something you can't reproduce locally?

**Testing**
- What do you not test, and why?
- How do you test something that depends on time?
- When is a mock the wrong tool?
- A test is flaky. What are the usual causes, in the order you'd check them?

---

## Cross-cutting

Applied in **every** coding session, on top of whichever unit was selected.
These are not map units of their own; they show up in the pre-code gate, in the
follow-up constraint, and in grading.

**Complexity, including amortised.** The user states time and space before
coding. "Amortised O(1)" must be distinguishable from "O(1) worst case" —
dynamic array growth, hash rehashing, and the monotonic stack all hinge on it.

**Inferring intended complexity from input bounds.** `n ≤ 10⁵` rules out O(n²);
`n ≤ 20` invites exponential; a stated stream size rules out holding the input.
Ask what the bounds imply before accepting an approach.

**Recursion → iteration and stack depth.** Where does the recursion bottom out,
how deep can it go on the stated bounds, and what does the iterative version
carry on an explicit stack instead?

**The edge-case checklist.** Probe these every round; the user should raise them
unprompted, and failing to is a grading input:
- empty input
- single element
- all duplicates / all identical
- already sorted (and reverse sorted)
- maximum size at the stated bound
- negative numbers and zero
- unicode and multi-byte characters — string length in code points is not length in bytes, and not length in grapheme clusters
