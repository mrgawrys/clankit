# one-at-a-time — Design

> **To act on this design:** pick a mode — *vibe* (inline, no machinery),
> *review each task* (per-task diffs), *review at the end* (one subagent
> builds, one review at the end), or *plan first* (`writing-plans`, then how it gets built).
> Ask the user which; don't pick for them.

## Problem

When a session piles up — estimates owed, ceremony steps, things owed by
others, stale docs — the assistant tends to report all of it in one message.
The user reads a wall of requests and doesn't know where to look. The
feedback that produced this skill, verbatim:

> "Lets do one small message at a time. You are drowning me in requests. One
> small issue at a time. Simple language, then proceed."

## What it is

A `clankit-life` skill, `one-at-a-time`, that rewires the assistant's replies
for the rest of the session: one topic per reply, plain language, exactly
one ask, and the next topic only after the user answers.

It is a discipline on output, not a system. No queue file, no state — the
pile lives in the conversation and the assistant re-picks the next item each
turn.

## Trigger

- `/one-at-a-time`, or
- the user explicitly asking to work one thing at a time.

Never on a hunch. Feeling-words alone ("I don't know where to look", "too
much") do not trigger it; the user has to ask for the mode.

## Duration

From invocation to the end of the session, or until the user says
"normal" / "stop" / "back to normal".

## Opening reply

One line naming the mode and the default, then item 1 immediately:

> One thing at a time from here on. Most pressing first — say **easy first**
> if you'd rather build momentum, **normal** to switch back.
>
> *(item 1)*

No acknowledgement paragraph, no summary of the pile, no explanation of how
the mode works beyond that line.

## Ordering

The assistant decides silently; the order is never shown.

- **Default — most pressing first.** Blocks something, has a deadline, or
  someone is waiting on the user.
- **Easy first** (on request). Smallest, fastest to close.

Switching is not a question. The opening line states the default; the user
can say "easy first" or "urgent first" at any time. Acknowledge in a few
words and serve the next item under the new order.

## The item message

- **One topic.** As much context as that topic needs and no more. Context
  already given in the conversation is referred to, not repeated. Length
  follows the topic — there is no sentence budget — but a second topic never
  rides along. No "also…", no insight boxes, no sub-point bullets.
- **Plain words.** Short sentences, no jargon.
- **Exactly one ask.** A decision, a yes/no, or "nothing from you — I'll do
  it, ok?". A code block or a path is fine when the topic needs it.

## Advancing

- Any reply to the ask closes the item — a decision, "do it", "skip",
  "later". The next message is the next item.
- If the answer means work, do the work, report it in one line, and carry
  the next item in the same message. Never a standalone "done, what next?".
- A question about the current item keeps the current item. The pile
  advances only on an answer.
- New things that arrive mid-pile (a failing test, a pasted message) join
  the pile and are ranked like everything else. They are not announced.
- When the pile is empty: one line — "That's everything. Back to normal
  replies?" — and normal mode resumes on any reply.

## What it is not

- **Not a summarizer.** Never opens with a recap of the situation, never
  closes with "what's left". The user opted out of seeing the pile.
- **Not a task list.** No numbering across messages, no "3 of 7", no
  checkboxes.
- **Not a change in substance.** Everything that would have been said still
  gets said, one topic per turn. The assistant does not drop items to make
  the pile look smaller; "skip" and "later" are the user's words.

## Worked example

The message that prompted this skill covered: two commits made, a sign-off
deadline, 25 empty estimate cells, a mid-week check-in, items owed by three
other people, two stale docs, and an offer to take the estimating pass.
Under this skill the reply is:

> Committed both (0c8507c, 3435b11).
>
> One thing at a time from here on. Most pressing first — say **easy first**
> if you'd rather build momentum, **normal** to switch back.
>
> Assumption #6 is the only thing still blocking Tuesday's sign-off, and all
> 25 estimate cells in the worklist are empty. I can fill the A1–A14 and
> L1–L3 rows from the spikes and the probe; the Custom rows need you or
> Marcin. Want me to do the AI rows now?

Everything else waits for later turns.

## Files

- `plugins/clankit-life/skills/one-at-a-time/SKILL.md` — the rulebook.
- `plugins/clankit-life/.claude-plugin/plugin.json` — add the skill to the
  description.

## Verification

Prose skill — no tests. Read the finished SKILL.md back against the worked
example: a session given the original wall-of-text situation should produce
that single-item reply.
