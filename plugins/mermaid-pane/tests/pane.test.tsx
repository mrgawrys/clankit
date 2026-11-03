import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import type { Diagram } from '../types'
import { fitCells, pngSize } from '../hooks/pane'
import { textError } from '../hooks/text'

// A real 400 x 100 PNG, so the pane's aspect maths reads a real header.
const PNG_400x100 =
  'iVBORw0KGgoAAAANSUhEUgAAAZAAAABkCAIAAAAnqfEgAAABDElEQVR42u3UQREAAAzCMPybBh3bJRL6aApwRCQADAvAsADDAjAsAMMCDAvAsAAMCzAsAMMCMCzAsAAMC8CwAMMCMCwAwwIMC8CwAAwLMCwAwwIwLMCwAAwLwLAAwwIwLMCwAAwLwLAAwwIwLADDAgwLwLAADAswLADDAjAswLAADAvAsADDAjAsAMMCDAvAsAAMCzAsAMMCMCzAsAAMC8CwAMMCMCzAsAAMC8CwAMMCMCwAwwIMC8CwAAwLMCwAwwIwLMCwAAwLwLAAwwIwLADDAgwLwLAADAswLADDAjAswLAADAvAsADDAjAswLAADAvAsADDAjAsAMMCDAvAsAAMCzAsAMMCMCzgrwF3rQaekgI/DQAAAABJRU5ErkJggg=='

const PANE = {
  plugin: 'mermaid-pane',
  component: 'Pane',
  requestId: 'mermaid',
  props: {
    title: 'Diagrams',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

const TWO: Diagram[] = [{ path: '/tmp/mermaid-pane/a.png' }, { error: 'Error: Parse error on line 2:' }]

function seed(on: On, values: { diagrams?: Diagram[]; isRendering?: boolean; mode?: 'image' | 'text' }) {
  on('state.get', ($, e, next) => {
    if (e.key === 'diagrams' && values.diagrams) return { value: { value: { shape: 'diagrams-1', value: values.diagrams }, version: 1 } }
    if (e.key === 'isRendering' && values.isRendering !== undefined) {
      return { value: { value: values.isRendering, version: 1 } }
    }
    if (e.key === 'mode' && values.mode) return { value: { value: values.mode, version: 1 } }
    return next(e)
  })
}

const ART = '┌───┐     ┌───┐\n│ A ├────►│ B │\n└───┘     └───┘\n'
const WITH_TEXT: Diagram[] = [
  { path: '/tmp/mermaid-pane/a.png', text: { art: ART } },
  { path: '/tmp/mermaid-pane/a.png', text: { error: 'failed to parse graph diagram: bad edge' } },
]

function fakeHost(on: On, opened: string[][], disk: { size?: number; reads?: string[] } = {}) {
  mock.env(on, { SHELL: '/bin/sh', PATH: '/usr/bin' })
  on('fs.read', ($, e) => {
    disk.reads?.push(e.path)
    return { value: { base64: PNG_400x100 } }
  })
  on('fs.stat', ($, e) => {
    if (e.path !== '/tmp/mermaid-pane/a.png' || disk.size === undefined) throw new Error(`ENOENT: ${e.path}`)
    return { value: { kind: 'file', size: disk.size, mtimeMs: 0, isLink: false } }
  })
  on('process.run', ($, e) => {
    if (e.argv[0] === 'open') opened.push([...e.argv])
    const stdout = e.argv[0]?.endsWith('uname') ? 'Darwin' : ''
    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
}

test('the pane says Rendering… while diagrams are on their way', async ($, on) => {
  seed(on, { diagrams: TWO, isRendering: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /Rendering…/ }))?.text).toBe('Rendering…')
  expect(await ui.find({ type: 'Image' })).toBeUndefined()
  await ui.unmount()
})

test('the pane pages through the diagrams, the broken one showing its error line', async ($, on) => {
  seed(on, { diagrams: TWO })
  fakeHost(on, [], { size: 300 })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /1\/2/ })).toBeDefined()
  expect(await ui.find({ type: 'Image' })).toBeDefined()

  await ui.press({ key: 'next' })
  expect(await ui.find({ type: 'Text', text: /2\/2/ })).toBeDefined()
  expect((await ui.find({ type: 'Text', text: /Parse error/ }))?.text).toBe('Error: Parse error on line 2:')
  expect(await ui.find({ type: 'Image' })).toBeUndefined()

  await ui.press({ key: 'next' })
  expect(await ui.find({ type: 'Text', text: /1\/2/ })).toBeDefined()
  await ui.press({ key: 'prev' })
  expect(await ui.find({ type: 'Text', text: /2\/2/ })).toBeDefined()
  await ui.unmount()
})

test('the image fills the pane width with its aspect kept, and carries the alt text', async ($, on) => {
  seed(on, { diagrams: TWO })
  fakeHost(on, [], { size: 300 })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })

  const image = await ui.find({ type: 'Image' })
  // 400 x 100 px across 40 columns: 10 px a column, so 100 px is 10 cell-widths, 5 rows tall.
  expect(image?.props).toMatchObject({
    columns: 40,
    rows: 5,
    alt: "This terminal can't draw images — switch to text view, or open full size ↗",
    source: { png: PNG_400x100 },
  })
  await ui.unmount()
})

test('a PNG past the inline cap is drawn from its file, its header read once across repaints', async ($, on) => {
  const reads: string[] = []
  seed(on, { diagrams: TWO })
  fakeHost(on, [], { size: 3 * 1024 * 1024, reads })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })

  await ui.press({ key: 'next' })
  await ui.press({ key: 'next' })

  expect((await ui.find({ type: 'Image' }))?.props).toMatchObject({
    columns: 40,
    rows: 5,
    source: { file: '/tmp/mermaid-pane/a.png', format: 'png' },
  })
  expect(reads).toEqual(['/tmp/mermaid-pane/a.png'])
  await ui.unmount()
})

test('a PNG the OS cleaned out of the temp directory says so instead of drawing', async ($, on) => {
  seed(on, { diagrams: TWO })
  fakeHost(on, [])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })

  expect(await ui.find({ type: 'Image' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /gone from the temp directory/ })).toBeDefined()
  await ui.unmount()
})

test('open full size hands the PNG to the OS viewer', async ($, on) => {
  const opened: string[][] = []
  seed(on, { diagrams: TWO })
  fakeHost(on, opened, { size: 300 })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })

  await ui.press({ key: 'open' })
  expect(opened).toEqual([['open', '/tmp/mermaid-pane/a.png']])
  await ui.unmount()
})

test('a surface without Image still offers the full-size view', async ($, on) => {
  seed(on, { diagrams: TWO })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Button', key: 'open' })).toBeDefined()
  await ui.unmount()
})

test('text view draws the art a line at a time, cut at the edge, with full size still offered', async ($, on) => {
  seed(on, { diagrams: WITH_TEXT, mode: 'text' })
  fakeHost(on, [], { size: 300 })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })

  const lines = await ui.findAll({ type: 'Text', text: /[┌│└]/ })
  expect(lines.map(l => l.text)).toEqual(['┌───┐     ┌───┐', '│ A ├────►│ B │', '└───┘     └───┘'])
  expect(lines.map(l => l.props)).toEqual(lines.map(() => expect.objectContaining({ wrap: 'truncate-end' })))
  expect(await ui.find({ type: 'Image' })).toBeUndefined()
  expect(await ui.find({ type: 'Button', key: 'open' })).toBeDefined()
  expect((await ui.find({ type: 'Button', key: 'mode' }))?.props).toMatchObject({ label: 'image view' })
  await ui.unmount()
})

test('text view pages too, showing the text renderer\'s error in place of art it could not draw', async ($, on) => {
  seed(on, { diagrams: WITH_TEXT, mode: 'text' })
  fakeHost(on, [], { size: 300 })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })

  await ui.press({ key: 'next' })
  expect(await ui.find({ type: 'Text', text: /2\/2/ })).toBeDefined()
  expect((await ui.find({ type: 'Text', text: /failed to parse/ }))?.props).toMatchObject({ color: 'red' })
  expect(await ui.find({ type: 'Button', key: 'open' })).toBeDefined()

  await ui.press({ key: 'prev' })
  expect(await ui.find({ type: 'Text', text: /│ A ├/ })).toBeDefined()
  await ui.unmount()
})

test('text view shows the mmdc error, never the art, for a diagram mmdc rejected', async ($, on) => {
  seed(on, {
    diagrams: [{ error: 'Error: Parse error on line 2:', text: { art: ART } }],
    mode: 'text',
  })
  fakeHost(on, [], { size: 300 })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })

  expect((await ui.find({ type: 'Text', text: /Parse error/ }))?.props).toMatchObject({ color: 'red' })
  expect(await ui.find({ type: 'Text', text: /│ A ├/ })).toBeUndefined()
  await ui.unmount()
})

test('text view says the PNG is gone and offers no full size when it is', async ($, on) => {
  seed(on, { diagrams: WITH_TEXT, mode: 'text' })
  fakeHost(on, [])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /PNG is gone/ })).toBeDefined()
  expect(await ui.find({ type: 'Button', key: 'open' })).toBeUndefined()
  await ui.unmount()
})

test('text view without mermaid-ascii points at the README', async ($, on) => {
  seed(on, { diagrams: TWO, mode: 'text' })
  fakeHost(on, [], { size: 300 })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })

  expect((await ui.find({ type: 'Text', text: /mermaid-ascii/ }))?.text).toBe(
    'Text view needs mermaid-ascii — see the README',
  )
  expect(await ui.find({ type: 'Button', key: 'open' })).toBeDefined()
  await ui.unmount()
})

test('the toggle switches image to text and back, keeping the choice in the store', async ($, on) => {
  const stored: Record<string, unknown> = {}
  seed(on, { diagrams: WITH_TEXT })
  fakeHost(on, [], { size: 300 })
  on('store.set', ($, e) => {
    stored[e.key] = e.value
    return { value: undefined }
  })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Image' })).toBeDefined()

  await ui.press({ key: 'mode' })
  expect(await ui.find({ type: 'Image' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /│ A ├/ })).toBeDefined()
  expect(stored.mode).toBe('text')

  await ui.press({ key: 'mode' })
  expect(await ui.find({ type: 'Image' })).toBeDefined()
  expect(stored.mode).toBe('image')
  await ui.unmount()
})

test("mermaid-ascii's fatal log line comes down to its message", () => {
  expect(
    textError('time="2026-11-03T10:00:00+01:00" level=fatal msg="failed to parse graph diagram: \\"x\\" unknown"\n'),
  ).toBe('failed to parse graph diagram: "x" unknown')
  expect(textError('level=fatal msg=boom')).toBe('boom')
  expect(textError('\npanic: Unknown direction\n\ngoroutine 1')).toBe('panic: Unknown direction')
  expect(textError('')).toBe('mermaid-ascii failed with no message')
})

test('PNG header and cell fitting', async () => {
  expect(pngSize(PNG_400x100)).toEqual({ width: 400, height: 100 })
  expect(pngSize('bm90IGEgcG5nIGF0IGFsbCwgbm90IGF0IGFsbA==')).toBeUndefined()
  // A tall diagram is bounded by the rows, and narrowed to keep its aspect.
  expect(fitCells({ width: 200, height: 800 }, { columns: 60, rows: 20 })).toEqual({ columns: 10, rows: 20 })
  // Never past the 255 cells an Image takes.
  expect(fitCells({ width: 4000, height: 100 }, { columns: 300, rows: 50 })).toEqual({ columns: 255, rows: 3 })
})
