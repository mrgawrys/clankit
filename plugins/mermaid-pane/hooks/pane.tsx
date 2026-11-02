import type { EngineInterface, RenderElement, RenderInput } from 'claude-code'

import type { Diagram } from '../types'

export const ALT = "This terminal can't draw images — open full size ↗"
export const GONE = 'The rendered PNG is gone from the temp directory — ask for the diagram again.'
const MAX_INLINE_BYTES = 2 * 1024 * 1024
// A terminal cell is about twice as tall as it is wide.
const CELL_ASPECT = 2
const sizes = new Map<string, { width: number; height: number } | undefined>()

export type PaneView = {
  list: readonly Diagram[]
  shown: number
  isRendering: boolean
  onPage: (step: number) => Promise<unknown>
  onOpen: (path: string) => Promise<unknown>
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
  const { list, shown } = view

  if (view.isRendering) return <Text dimColor>Rendering…</Text>
  if (list.length === 0) return <Text dimColor>No diagrams yet.</Text>

  const pager = (
    <Box flexDirection="row">
      <Button key="prev" label="◀" plain onPress={() => view.onPage(-1)} />
      <Text> {shown + 1}/{list.length} </Text>
      <Button key="next" label="▶" plain onPress={() => view.onPage(1)} />
    </Box>
  )

  const errorLine = (text: string) => (
    <Box flexDirection="column">
      {pager}
      <Text color="red">{text}</Text>
    </Box>
  )
  const diagram = list[shown]
  if (!diagram || 'error' in diagram) return errorLine(diagram?.error ?? 'Diagram missing.')

  const full = <Button key="open" label="open full size ↗" plain onPress={() => view.onOpen(diagram.path)} />
  if (e.surface !== 'terminal') {
    return (
      <Box flexDirection="column">
        {pager}
        {full}
      </Box>
    )
  }

  const stat = await $.fs.stat(diagram.path).catch(() => undefined)
  if (stat?.kind !== 'file') return errorLine(GONE)

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

  return (
    <Box flexDirection="column">
      {pager}
      <Image key="diagram" source={source} columns={cells.columns} rows={cells.rows} alt={ALT} />
      {full}
    </Box>
  )
}
