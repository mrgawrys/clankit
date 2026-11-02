import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import type { Diagram } from '../types'

const START = { cwd: '/', surface: 'terminal', isInteractive: true } as const
const REPLY = 'Here:\n```mermaid\ngraph TD; A-->B\n```\n'
const MERMAID = {
  command: 'mermaid',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 160 },
} as const
const TURN = { answer: REPLY, durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as const

type Host = {
  env: Record<string, string>
  files: string[]
  toasts: string[]
  runs: string[][]
  paths: (string | undefined)[]
  opens: string[]
  closes: string[]
  panes: string[]
  waiting: string[]
}

// Stands for the engine and the machine. Nothing here answers for mmdc: a test that
// would reach the renderer has no business here, so a call to it fails the test.
function fakeHost(on: On, over: Partial<Host> = {}): Host {
  const host: Host = { env: {}, files: [], toasts: [], runs: [], paths: [], opens: [], closes: [], panes: [], waiting: [], ...over }
  mock.env(on, { SHELL: '/bin/sh', PATH: '/usr/bin', ...host.env })
  on('fs.stat', ($, e) => {
    if (!host.files.includes(e.path)) throw new Error(`ENOENT: ${e.path}`)
    return { value: { kind: 'file', size: 1, mtimeMs: 0, isLink: false } }
  })
  on('process.run', ($, e) => {
    const argv = [...e.argv]
    if (argv[0]?.endsWith('mmdc')) throw new Error('the renderer is not faked')
    host.runs.push(argv)
    host.paths.push(e.init?.env?.PATH)
    let stdout = ''
    if (argv[0] === '/bin/sh') stdout = '/opt/tools/bin'
    if (argv[1] === 'action' && argv[2] === 'list-panes') {
      stdout = JSON.stringify([{ id: 4, is_plugin: false, tab_id: 1 }, { id: 4, is_plugin: true, tab_id: 0 }])
    }
    if (argv[1] === 'run') stdout = 'terminal_9\n'
    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('ui.toast', ($, e) => {
    host.toasts.push(e.text)
    return { value: undefined }
  })
  on('ui.open', ($, e) => {
    host.opens.push(e.id)
    return { value: { isPlaced: false, reason: 'narrow' } }
  })
  on('ui.close', ($, e) => {
    host.closes.push(e.id)
    return { value: undefined }
  })
  on('ui.panes', () => ({
    value: [
      ...host.panes.map(id => ({ id, title: 'Diagrams', isShown: true, isFocused: false, isPlaced: true })),
      ...host.waiting.map(id => ({ id, title: 'Diagrams', isShown: false, isFocused: false, isPlaced: false })),
    ],
  }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('turn.complete', ($, e) => ({ text: e.answer }))
  return host
}

function seed(on: On, list: Diagram[]) {
  on('state.get', ($, e, next) =>
    e.key === 'diagrams' ? { value: { value: { shape: 'diagrams-1', value: list }, version: 1 } } : next(e),
  )
}

test('a reply with Mermaid and no mmdc says how to install it, and opens nothing', async ($, on) => {
  const host = fakeHost(on)
  const clock = mock.clock(on)
  await $.session.start(START)

  await $.turn.complete(TURN)
  await clock.advance(1)

  expect(host.toasts).toEqual(['mermaid-pane: mmdc not found — install @mermaid-js/mermaid-cli'])
  expect(host.opens).toEqual([])
})

test("a reply without Mermaid, or a subagent's reply, changes nothing", async ($, on) => {
  const host = fakeHost(on)
  const clock = mock.clock(on)
  await $.session.start(START)

  await $.turn.complete({ ...TURN, answer: 'No diagrams here.\n```ts\nconst a = 1\n```' })
  await $.turn.complete({ ...TURN, agentId: 'a1' })
  await clock.advance(1)

  expect(host.toasts).toEqual([])
  expect(host.opens).toEqual([])
})

test('/mermaid opens the pane when closed and closes it when open', async ($, on) => {
  const host = fakeHost(on)
  await $.session.start(START)

  await $.command.run(MERMAID)
  expect(host.opens).toEqual(['mermaid'])
  expect(host.closes).toEqual([])

  host.panes.push('mermaid')
  await $.command.run(MERMAID)
  expect(host.closes).toEqual(['mermaid'])
})

test('/mermaid opens a pane that waits undrawn on a narrow terminal, rather than closing it', async ($, on) => {
  const host = fakeHost(on, { waiting: ['mermaid'] })
  await $.session.start(START)

  await $.command.run(MERMAID)
  expect(host.opens).toEqual(['mermaid'])
  expect(host.closes).toEqual([])
})

// chafa and zellij sit only on the login shell's PATH (/opt/tools/bin), not on Claude Code's own (/usr/bin).
test('/mermaid under Zellij reopens the last diagrams in a floating viewer in our own tab', async ($, on) => {
  const host = fakeHost(on, {
    env: { ZELLIJ: '0', ZELLIJ_PANE_ID: '4' },
    files: ['/opt/tools/bin/chafa', '/opt/tools/bin/zellij'],
  })
  seed(on, [{ path: '/t/a.png' }, { error: 'Error: Parse error on line 2:' }])
  await $.session.start(START)

  await $.command.run(MERMAID)
  await $.command.run(MERMAID)

  const runs = host.runs.filter(argv => argv[1] === 'run')
  expect(runs).toHaveLength(2)
  expect(runs[0]).toEqual(expect.arrayContaining(['--floating', '--tab-id', '1', 'png:/t/a.png']))
  expect(runs[0]?.slice(-2)).toEqual(['png:/t/a.png', 'error:Error: Parse error on line 2:'])
  // The second open replaces the first: one viewer at a time.
  expect(host.runs).toContainEqual(['/opt/tools/bin/zellij', 'action', 'close-pane', '--pane-id', 'terminal_9'])
  expect(host.runs[0]).toEqual(['/bin/sh', '-lc', 'printf %s "$PATH"'])
  expect(new Set(host.paths.slice(1))).toEqual(new Set(['/opt/tools/bin']))
  expect(host.opens).toEqual([])
})

test('/mermaid under Zellij without chafa says so and opens the PNGs in the OS viewer', async ($, on) => {
  const host = fakeHost(on, { env: { ZELLIJ: '0', ZELLIJ_PANE_ID: '4' }, files: ['/opt/tools/bin/zellij'] })
  seed(on, [{ path: '/t/a.png' }, { error: 'boom' }, { path: '/t/c.png' }])
  await $.session.start(START)

  await $.command.run(MERMAID)

  expect(host.toasts).toEqual([
    'mermaid-pane: chafa not found — install chafa to view diagrams inside Zellij; opening them in the OS viewer',
  ])
  expect(host.runs).toContainEqual(['open', '/t/a.png', '/t/c.png'])
})
