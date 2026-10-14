import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Snapshot } from '../types'

const focusEnded = atom({ plugin: 'tomito', key: 'focusEnded' } as const, false)
const breakWaiting = atom({ plugin: 'tomito', key: 'breakWaiting' } as const, false)
const askStart = atom({ plugin: 'tomito', key: 'askStart' } as const, false)

const POLL_MS = 3000
const SNOOZE_MS = 5 * 60_000
const DAY_CHECK_MS = 60_000
const COMMANDS = ['start', 'pause', 'resume', 'stop', 'skip'] as const

// `tell application` launches an app that isn't running; the guard keeps polling from reopening a quit Tomito.
const QUERY = [
  'if application "Tomito" is running then',
  'tell application "Tomito"',
  'set a to getCurrentActivityType',
  'set t to getRemainingTime',
  'end tell',
  'return a & "|" & t',
  'end if',
  'return ""',
]

const isFocus = (s: Snapshot) => /session/i.test(s.activity)

async function query($: EngineInterface): Promise<Snapshot | null> {
  const argv = ['osascript', ...QUERY.flatMap(line => ['-e', line])]
  const { exitCode, stdout } = await $.process.run(argv, { timeoutMs: 5000 })
  const [activity = '', remaining = ''] = stdout.trim().split('|')
  return exitCode === 0 && remaining ? { activity, remaining } : null
}

async function tell($: EngineInterface, command: string) {
  const { exitCode, stderr } = await $.process.run(
    ['osascript', '-e', `tell application "Tomito" to ${command}`],
    { timeoutMs: 5000 },
  )
  if (exitCode !== 0) throw new Error(stderr.trim() || `Tomito ${command} failed`)
}

let last: Snapshot | null = null
let isTicking = false
let polls = 0
let dayCheckedAt = -Infinity

// Polls compare 3s apart, so `isTicking` is only trustworthy from the second poll on.
const isIdleFocus = () => polls >= 2 && last !== null && isFocus(last) && !isTicking

// The store is shared by every Claude Code window, so one "Not now" quiets them all.
const isSnoozed = async ($: EngineInterface) =>
  Number((await $.store.get('snoozedUntil')) ?? 0) > (await $.clock.now())

async function resetOnNewDay($: EngineInterface, now: Snapshot | null) {
  const at = await $.clock.now()
  if (at - dayCheckedAt < DAY_CHECK_MS) return
  dayCheckedAt = at

  const today = (await $.process.run(['date', '+%F'], { timeoutMs: 5000 })).stdout.trim()
  const seen = await $.store.get('day')
  if (!today || seen === today) return
  await $.store.set('day', today)
  if (seen === undefined || now === null || isTicking) return

  // Tomito has no reset command; a fresh launch starts at a full session with none counted.
  await tell($, 'quit')
  await $.clock.sleep(2000)
  await $.process.run(['open', '-g', '-a', 'Tomito'], { timeoutMs: 10_000 })
}

async function poll($: EngineInterface) {
  const now = await query($)
  const prev = last
  isTicking =
    prev !== null && now !== null && prev.activity === now.activity && prev.remaining !== now.remaining
  last = now
  polls += 1

  if (prev && now && isFocus(prev) && !isFocus(now)) {
    await update($, focusEnded, () => true)
  }
  if (now && isFocus(now) && isTicking && (await read($, focusEnded))) {
    await update($, focusEnded, () => false)
  }
  const waiting = now !== null && !isFocus(now) && !isTicking
  if ((await read($, breakWaiting)) !== waiting) {
    await update($, breakWaiting, () => waiting)
  }
  if ((await read($, askStart)) && (!isIdleFocus() || (await isSnoozed($)))) {
    await update($, askStart, () => false)
  }
  if (polls >= 2) await resetOnNewDay($, now)
}

async function run($: EngineInterface, command: string) {
  await tell($, command)
  await update($, focusEnded, () => false)
  await update($, askStart, () => false)
  await poll($)
}

async function snooze($: EngineInterface) {
  await $.store.set('snoozedUntil', (await $.clock.now()) + SNOOZE_MS)
  await update($, askStart, () => false)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'pomo',
      description: 'Control Tomito: start, pause, resume, stop, skip (no argument shows the timer).',
      argumentHint: COMMANDS.join('|'),
    })
    await poll($).catch(() => {})
    $.clock.every(POLL_MS, () => void poll($).catch(() => {}))
    return next(e)
  })

  on('command.run', { command: 'pomo' }, async ($, e) => {
    const command = e.args.trim()
    if (command === '') {
      const s = await query($)
      return { text: s ? `Tomito: ${s.activity}, ${s.remaining} left` : 'Tomito is not running.' }
    }
    if (!(COMMANDS as readonly string[]).includes(command)) {
      return { text: `Unknown: ${command}. Use one of ${COMMANDS.join(', ')}.` }
    }
    await run($, command)
    return { text: `Tomito: ${command}` }
  })

  on('prompt.edit', async ($, e, next) => {
    const draft = e.text.slice(0, e.start) + e.inputText + e.text.slice(e.end)
    if (
      e.inputText !== '' &&
      !draft.startsWith('/') &&
      isIdleFocus() &&
      !(await read($, askStart)) &&
      !(await isSnoozed($))
    ) {
      await update($, askStart, () => true)
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)

    if (await read($, focusEnded)) {
      const buttons = (await read($, breakWaiting))
        ? [
            <Button key="break" label="Start break" variant="primary" onPress={() => run($, 'start')} />,
            <Button key="skip" label="Skip break" onPress={() => run($, 'skip')} />,
          ]
        : []
      return (
        <Box>
          <Text color="red">🍅 Focus session done, time for a break. </Text>
          {buttons}
          <Button key="dismiss" label="Dismiss" onPress={() => update($, focusEnded, () => false)} />
        </Box>
      )
    }

    if (await read($, askStart)) {
      const left = last ? ` (${last.remaining} left)` : ''
      return (
        <Box>
          <Text color="red">🍅 Start the focus timer{left}? </Text>
          <Button key="start" label="Start" variant="primary" onPress={() => run($, 'start')} />
          <Button key="snooze" label="Not now (5 min)" onPress={() => snooze($)} />
        </Box>
      )
    }

    return next(e)
  })
}
