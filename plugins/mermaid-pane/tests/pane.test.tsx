import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import type { Diagram } from '../types'
import { fitCells, pngSize } from '../hooks/pane'

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

function seed(on: On, values: { diagrams?: Diagram[]; isRendering?: boolean }) {
  on('state.get', ($, e, next) => {
    if (e.key === 'diagrams' && values.diagrams) return { value: { value: { shape: 'diagrams-1', value: values.diagrams }, version: 1 } }
    if (e.key === 'isRendering' && values.isRendering !== undefined) {
      return { value: { value: values.isRendering, version: 1 } }
    }
    return next(e)
  })
}

function fakeHost(on: On, opened: string[][]) {
  mock.env(on, { SHELL: '/bin/sh', PATH: '/usr/bin' })
  on('fs.read', () => ({ value: { base64: PNG_400x100 } }))
  on('fs.stat', () => {
    throw new Error('ENOENT')
  })
  on('process.run', ($, e) => {
    if (e.argv[0] === 'open') opened.push([...e.argv])
    const stdout = e.argv[0] === '/bin/sh' ? '/usr/bin' : ''
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
  fakeHost(on, [])
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
  fakeHost(on, [])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })

  const image = await ui.find({ type: 'Image' })
  // 400 x 100 px across 40 columns: 10 px a column, so 100 px is 10 cell-widths, 5 rows tall.
  expect(image?.props).toMatchObject({
    columns: 40,
    rows: 5,
    alt: "This terminal can't draw images — open full size ↗",
    source: { png: PNG_400x100 },
  })
  await ui.unmount()
})

test('open full size hands the PNG to the OS viewer', async ($, on) => {
  const opened: string[][] = []
  seed(on, { diagrams: TWO })
  fakeHost(on, opened)
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

test('PNG header and cell fitting', async () => {
  expect(pngSize(PNG_400x100)).toEqual({ width: 400, height: 100 })
  expect(pngSize('bm90IGEgcG5nIGF0IGFsbCwgbm90IGF0IGFsbA==')).toBeUndefined()
  // A tall diagram is bounded by the rows, and narrowed to keep its aspect.
  expect(fitCells({ width: 200, height: 800 }, { columns: 60, rows: 20 })).toEqual({ columns: 10, rows: 20 })
  // Never past the 255 cells an Image takes.
  expect(fitCells({ width: 4000, height: 100 }, { columns: 300, rows: 50 })).toEqual({ columns: 255, rows: 3 })
})
