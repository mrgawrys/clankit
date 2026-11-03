import type { EngineInterface, RenderElement, RenderInput } from 'claude-code'

import type { Diagram, PaneMode, TextRender } from '../types'

export const ALT = "This terminal can't draw images — switch to text view, or open full size ↗"
export const NO_ASCII = 'Text view needs mermaid-ascii — see the README'
export const GONE = 'The rendered PNG is gone from the temp directory — ask for the diagram again.'
const MAX_INLINE_BYTES = 2 * 1024 * 1024
// A terminal cell is about twice as tall as it is wide.
const CELL_ASPECT = 2
const sizes = new Map<string, { width: number; height: number } | undefined>()

export type PaneView = {
  list: readonly Diagram[]
  shown: number
  isRendering: boolean
  mode: PaneMode
  onPage: (step: number) => Promise<unknown>
  onOpen: (path: string) => Promise<unknown>
  onToggle: () => Promise<unknown>
}

export function pngSize(base64: string): { width: number; height: number } | undefined {
  const head = atob(base64.slice(0, 32))
  if (head.length < 24 || head.slice(1, 4) !== 'PNG') return undefined
  const u32 = (at: number) =>
    ((head.charCodeAt(at) << 24) |
      (head.charCodeAt(at + 1) << 16) |
      (head.charCodeAt(at + 2) << 8) |
      head.charCodeAt(at + 3)) >>>
    0
  return { width: u32(16), height: u32(20) }
}

export function fitCells(
  size: { width: number; height: number },
  room: { columns: number; rows: number },
): { columns: number; rows: number } {
  const clamp = (n: number, max: number) => Math.max(1, Math.min(255, max, Math.round(n)))
  let columns = clamp(room.columns, room.columns)
  let rows = clamp((columns * size.height) / size.width / CELL_ASPECT, Infinity)
  if (rows > room.rows) {
    rows = clamp(room.rows, room.rows)
    columns = clamp((rows * size.width * CELL_ASPECT) / size.height, room.columns)
  }
  return { columns, rows }
}

// A PNG's path is its source's hash, so the size read once holds.
async function headerSize($: EngineInterface, path: string) {
  if (!sizes.has(path)) sizes.set(path, pngSize((await $.fs.read(path, { as: 'bytes' })).base64))
  return sizes.get(path)
}

export async function drawPane(
  $: EngineInterface,
  e: RenderInput<'Pane'>,
  view: PaneView,
): Promise<RenderElement> {
  const { Box, Button, Text } = $.ui.resolve(e)
  const { list, shown, mode } = view

  if (view.isRendering) return <Text dimColor>Rendering…</Text>
  if (list.length === 0) return <Text dimColor>No diagrams yet.</Text>

  const pager = (
    <Box flexDirection="row">
      <Button key="prev" label="◀" plain onPress={() => view.onPage(-1)} />
      <Text> {shown + 1}/{list.length} </Text>
      <Button key="next" label="▶" plain onPress={() => view.onPage(1)} />
      <Text> · </Text>
      <Button key="mode" label={mode === 'text' ? 'image view' : 'text view'} plain onPress={view.onToggle} />
    </Box>
  )
  const diagram = list[shown]
  const full =
    diagram && 'path' in diagram ? (
      <Button key="open" label="open full size ↗" plain onPress={() => view.onOpen(diagram.path)} />
    ) : undefined
  const column = (body?: RenderElement, tail?: RenderElement) => (
    <Box flexDirection="column">
      {pager}
      {body}
      {tail}
    </Box>
  )
  const errorLine = (text: string) => <Text color="red">{text}</Text>
  // One Text a line, each cut at the pane's edge: wrapped box-drawing art is unreadable.
  const art = (text: TextRender | undefined) => {
    if (!text) return <Text dimColor>{NO_ASCII}</Text>
    if ('error' in text) return errorLine(text.error)
    return (
      <Box flexDirection="column">
        {text.art.replace(/\n+$/, '').split('\n').map(line => (
          <Text mono wrap="truncate-end">
            {line === '' ? ' ' : line}
          </Text>
        ))}
      </Box>
    )
  }

  if (!diagram) return column(errorLine('Diagram missing.'))
  if ('error' in diagram) return column(errorLine(diagram.error))
  if (mode !== 'text' && e.surface !== 'terminal') return column(full)

  const stat = await $.fs.stat(diagram.path).catch(() => undefined)
  if (stat?.kind !== 'file') return column(errorLine(GONE))
  if (mode === 'text') return column(art(diagram.text), full)
  if (e.surface !== 'terminal') return column(full)

  const { Image } = $.ui.resolve(e)
  let source: { png: string } | { file: string; format: 'png' }
  let size: { width: number; height: number } | undefined
  if (stat.size <= MAX_INLINE_BYTES) {
    const { base64 } = await $.fs.read(diagram.path, { as: 'bytes' })
    source = { png: base64 }
    size = pngSize(base64)
  } else {
    source = { file: diagram.path, format: 'png' }
    size = await headerSize($, diagram.path)
  }
  const room = { columns: e.props.bodyColumns, rows: Math.max(1, e.props.scroll.bodyRows - 3) }
  const cells = fitCells(size ?? { width: 4, height: 3 }, room)

  return column(
    <Image key="diagram" source={source} columns={cells.columns} rows={cells.rows} alt={ALT} />,
    full,
  )
}
