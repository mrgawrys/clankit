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
  system: string
  timeline: string[]
  holds: Record<string, Promise<void>>
  zellijRunError: string
  texts: Record<string, string>
  stored: Record<string, unknown>
}

// Stands for the engine and the machine. Nothing here answers for mmdc: a test that
// would reach the renderer has no business here, so a call to it fails the test.
function fakeHost(on: On, over: Partial<Host> = {}): Host {
  const host: Host = { env: {}, files: [], toasts: [], runs: [], paths: [], opens: [], closes: [], panes: [], waiting: [], system: 'Darwin', timeline: [], holds: {}, zellijRunError: '', texts: {}, stored: {}, ...over }
  mock.env(on, { SHELL: '/bin/sh', PATH: '/usr/bin', ...host.env })
  on('store.get', ($, e) => ({ value: host.stored[e.key] }))
  on('store.set', ($, e) => {
    host.stored[e.key] = e.value
    return { value: undefined }
  })
  on('fs.read', ($, e) => {
    const text = host.texts[e.path]
    if (text === undefined) throw new Error(`ENOENT: ${e.path}`)
    return { value: text }
  })
  on('fs.exists', async ($, e) => {
    await host.holds[e.path]
    return { value: host.files.includes(e.path) }
  })
  on('state.set', ($, e, next) => {
    host.timeline.push(`set ${e.key} ${JSON.stringify(e.value)}`)
    return next(e)
  })
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
    // A login profile that prints a banner must not leak into PATH.
    if (argv[0] === '/bin/sh') stdout = 'Welcome back\n\n__mermaid_pane_path__/opt/tools/bin'
    if (argv[0]?.endsWith('uname')) stdout = host.system
    if (argv[1] === 'action' && argv[2] === 'list-panes') {
      stdout = JSON.stringify([{ id: 4, is_plugin: false, tab_id: 1 }, { id: 4, is_plugin: true, tab_id: 0 }])
    }
    if (argv[1] === 'run') stdout = 'terminal_9\n'
    const exitCode = argv[1] === 'run' && host.zellijRunError ? 1 : 0
    return { value: { exitCode, stdout, stderr: exitCode ? host.zellijRunError : '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('ui.toast', ($, e) => {
    host.toasts.push(e.text)
    host.timeline.push(`toast ${e.text}`)
    return { value: undefined }
  })
  on('ui.open', ($, e) => {
    host.opens.push(e.id)
    host.timeline.push(`open ${e.id}`)
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

async function cachedAs(source: string, ext: 'png' | 'txt'): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source))
  return `/t/mermaid-pane/${[...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')}.${ext}`
}

const pngOf = (source: string) => cachedAs(source, 'png')

const PANE = {
  plugin: 'mermaid-pane',
  component: 'Pane',
  requestId: 'mermaid',
  surface: 'terminal',
  props: {
    title: 'Diagrams',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

async function settle() {
  for (let i = 0; i < 200; i++) await Promise.resolve()
}

function seed(on: On, list: Diagram[], more: Record<string, string> = {}) {
  on('state.get', ($, e, next) => {
    if (e.key === 'diagrams') return { value: { value: { shape: 'diagrams-1', value: list }, version: 1 } }
    const value = more[e.key]
    return value === undefined ? next(e) : { value: { value, version: 1 } }
  })
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
  expect(host.runs[0]?.slice(0, 2)).toEqual(['/bin/sh', '-lc'])
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

test('the OS viewer is `open` on macOS even with xdg-open installed', async ($, on) => {
  const host = fakeHost(on, {
    env: { ZELLIJ: '0' },
    files: ['/opt/tools/bin/zellij', '/opt/tools/bin/xdg-open', '/opt/tools/bin/open'],
  })
  seed(on, [{ path: '/t/a.png' }, { path: '/t/b.png' }])
  await $.session.start(START)

  await $.command.run(MERMAID)

  expect(host.runs).toContainEqual(['/opt/tools/bin/open', '/t/a.png', '/t/b.png'])
})

// Some Linux distributions ship an unrelated `open` (openvt).
test('the OS viewer is xdg-open elsewhere, one file at a time, even with an `open` installed', async ($, on) => {
  const host = fakeHost(on, {
    env: { ZELLIJ: '0' },
    files: ['/opt/tools/bin/zellij', '/opt/tools/bin/open', '/opt/tools/bin/xdg-open'],
    system: 'Linux',
  })
  seed(on, [{ path: '/t/a.png' }, { path: '/t/b.png' }])
  await $.session.start(START)

  await $.command.run(MERMAID)

  const opened = host.runs.filter(argv => argv[0]?.endsWith('open'))
  expect(opened).toEqual([['/opt/tools/bin/xdg-open', '/t/a.png'], ['/opt/tools/bin/xdg-open', '/t/b.png']])
})

// A PNG already on disk for the source is the render cache, so these reach no mmdc.
test('a reply opens the pane as Rendering…, toasts when it cannot seat, then lands its diagrams', async ($, on) => {
  const png = await pngOf('graph TD; A-->B')
  const host = fakeHost(on, { env: { TMPDIR: '/t/' }, files: ['/opt/tools/bin/mmdc', png] })
  const clock = mock.clock(on)
  await $.session.start(START)

  await $.turn.complete(TURN)
  await clock.advance(1)
  await settle()

  expect(host.timeline).toEqual([
    'set mode "image"',
    'set isRendering true',
    'open mermaid',
    'toast 1 diagram — /mermaid to view',
    `set diagrams ${JSON.stringify({ shape: 'diagrams-1', value: [{ path: png }] })}`,
    'set index 0',
    'set isRendering false',
  ])
})

test('a slower earlier reply never overwrites the diagrams of the one after it', async ($, on) => {
  const first = await pngOf('graph TD; A-->B')
  const second = await pngOf('graph LR; C-->D')
  let release = () => {}
  const host = fakeHost(on, {
    env: { TMPDIR: '/t' },
    files: ['/opt/tools/bin/mmdc', first, second],
    holds: { [first]: new Promise<void>(resolve => (release = resolve)) },
  })
  const clock = mock.clock(on)
  await $.session.start(START)

  await $.turn.complete(TURN)
  await $.turn.complete({ ...TURN, turnId: 't2', answer: '```mermaid\ngraph LR; C-->D\n```' })
  await clock.advance(1)
  await settle()
  release()
  await settle()

  const landed = host.timeline.filter(line => line.startsWith('set diagrams'))
  expect(landed).toEqual([`set diagrams ${JSON.stringify({ shape: 'diagrams-1', value: [{ path: second }] })}`])
  expect(host.toasts).toEqual(['1 diagram — /mermaid to view', '1 diagram — /mermaid to view'])
  expect(host.timeline.at(-1)).toBe('set isRendering false')
})

test('the missing-chafa toast shows once a session, not on every reply', async ($, on) => {
  const png = await pngOf('graph TD; A-->B')
  const host = fakeHost(on, {
    env: { ZELLIJ: '0', TMPDIR: '/t' },
    files: ['/opt/tools/bin/mmdc', '/opt/tools/bin/zellij', png],
  })
  const clock = mock.clock(on)
  await $.session.start(START)

  await $.turn.complete(TURN)
  await $.turn.complete({ ...TURN, turnId: 't2' })
  await clock.advance(1)
  await settle()

  expect(host.toasts).toEqual([
    'mermaid-pane: chafa not found — install chafa to view diagrams inside Zellij; opening them in the OS viewer',
  ])
  expect(host.runs.filter(argv => argv[0] === 'open')).toEqual([['open', png], ['open', png]])
})

test('under Zellij with zellij off the login PATH, the diagrams open in the OS viewer and a toast says why', async ($, on) => {
  const host = fakeHost(on, { env: { ZELLIJ: '0' }, files: ['/opt/tools/bin/chafa'] })
  seed(on, [{ path: '/t/a.png' }])
  await $.session.start(START)

  await $.command.run(MERMAID)

  expect(host.toasts).toEqual(['mermaid-pane: zellij not found on the login PATH — opening diagrams in the OS viewer'])
  expect(host.runs).toContainEqual(['open', '/t/a.png'])
})

test('a zellij run that fails says so in a toast', async ($, on) => {
  const host = fakeHost(on, {
    env: { ZELLIJ: '0', ZELLIJ_PANE_ID: '4' },
    files: ['/opt/tools/bin/chafa', '/opt/tools/bin/zellij'],
    zellijRunError: 'no session\n',
  })
  seed(on, [{ path: '/t/a.png' }])
  await $.session.start(START)

  await $.command.run(MERMAID)

  expect(host.toasts).toEqual(['mermaid-pane: zellij run failed: no session'])
})

test('a viewer pane id from another Zellij session is never closed', async ($, on) => {
  const host = fakeHost(on, {
    env: { ZELLIJ: '0', ZELLIJ_PANE_ID: '4', ZELLIJ_SESSION_NAME: 'now' },
    files: ['/opt/tools/bin/chafa', '/opt/tools/bin/zellij'],
  })
  seed(on, [{ path: '/t/a.png' }], { zellijPane: 'terminal_2', zellijSession: 'earlier' })
  await $.session.start(START)

  await $.command.run(MERMAID)

  expect(host.runs.filter(argv => argv[2] === 'close-pane')).toEqual([])
  expect(host.runs.filter(argv => argv[1] === 'run')).toHaveLength(1)
})

test('a render that breaks off says so, rather than leaving the last reply on show unremarked', async ($, on) => {
  // No PNG on disk, and nothing answers fs.write: writing the source rejects mid-loop.
  const host = fakeHost(on, { env: { TMPDIR: '/t' }, files: ['/opt/tools/bin/mmdc'] })
  const clock = mock.clock(on)
  await $.session.start(START)

  await $.turn.complete(TURN)
  await clock.advance(1)
  await settle()

  expect(host.toasts.at(-1)).toMatch(/^mermaid-pane: .*fs\.write/)
  expect(host.timeline.filter(line => line.startsWith('set diagrams'))).toEqual([])
  expect(host.timeline).toContain('set isRendering false')
})

test('a reply under the pane carries each diagram\'s text render beside its PNG', async ($, on) => {
  const png = await pngOf('graph TD; A-->B')
  const txt = await cachedAs('graph TD; A-->B', 'txt')
  const host = fakeHost(on, {
    env: { TMPDIR: '/t' },
    files: ['/opt/tools/bin/mmdc', '/opt/tools/bin/mermaid-ascii', png, txt],
    texts: { [txt]: '┌───┐\n│ A │\n└───┘\n' },
  })
  const clock = mock.clock(on)
  await $.session.start(START)

  await $.turn.complete(TURN)
  await clock.advance(1)
  await settle()

  const landed = host.timeline.filter(line => line.startsWith('set diagrams'))
  const value = [{ path: png, text: { art: '┌───┐\n│ A │\n└───┘\n' } }]
  expect(landed).toEqual([`set diagrams ${JSON.stringify({ shape: 'diagrams-1', value })}`])
})

test('text view chosen in an earlier session is the view a new session opens in', async ($, on) => {
  const host = fakeHost(on, { stored: { mode: 'text' }, files: ['/t/a.png'] })
  seed(on, [{ path: '/t/a.png', text: { art: '│ A │' } }])
  await $.session.start(START)

  const ui = await $.ui.mount(PANE)
  expect(await ui.find({ type: 'Text', text: '│ A │' })).toBeDefined()

  await ui.press({ key: 'mode' })
  expect(host.stored.mode).toBe('image')
  await ui.unmount()
  expect(host.toasts).toEqual([])
})
