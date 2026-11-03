import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Diagram, PaneMode } from '../types'
import { extractMermaid } from './extract'
import { drawPane } from './pane'
import { render, renderDir } from './render'
import { renderText } from './text'
import { resolveTools } from './tools'
import type { Tools } from './tools'
import { chooseViewer, openInOs } from './viewer'
import type { Viewer } from './viewer'
import { launchViewer } from './zellij'

export const MISSING_MMDC = 'mermaid-pane: mmdc not found — install @mermaid-js/mermaid-cli'
export const MISSING_CHAFA =
  'mermaid-pane: chafa not found — install chafa to view diagrams inside Zellij; opening them in the OS viewer'
export const MISSING_ZELLIJ = 'mermaid-pane: zellij not found on the login PATH — opening diagrams in the OS viewer'
const PANE = 'mermaid'
const TITLE = 'Diagrams'

const diagramCount = (n: number) => `${n} diagram${n === 1 ? '' : 's'}`
export const narrowToast = (n: number) => `${diagramCount(n)} — /mermaid to view`

const diagrams = atom({ plugin: 'mermaid-pane', key: 'diagrams' } as const, [] as Diagram[], {
  shape: 'diagrams-1',
})
const index = atom({ plugin: 'mermaid-pane', key: 'index' } as const, 0)
const isRendering = atom({ plugin: 'mermaid-pane', key: 'isRendering' } as const, false)
const mode = atom({ plugin: 'mermaid-pane', key: 'mode' } as const, 'image' as PaneMode)
const MODE_KEY = 'mode'
const zellijPane = atom({ plugin: 'mermaid-pane', key: 'zellijPane' } as const, '')
const zellijSession = atom({ plugin: 'mermaid-pane', key: 'zellijSession' } as const, '')

let mmdcOverride = ''
let tools: Promise<Tools> | undefined
let generation = 0
const warned = new Set<string>()

function getTools($: EngineInterface): Promise<Tools> {
  tools ??= resolveTools($, mmdcOverride)
  return tools
}

async function activeViewer($: EngineInterface): Promise<Viewer> {
  return chooseViewer(Boolean(await $.env.get('ZELLIJ')), await getTools($))
}

async function openFull($: EngineInterface, path: string) {
  await openInOs($, await getTools($), [path])
}

// $.store keeps the choice across sessions; the state atom is what redraws the pane.
async function loadMode($: EngineInterface) {
  const saved: PaneMode = (await $.store.get(MODE_KEY)) === 'text' ? 'text' : 'image'
  await update($, mode, () => saved)
}

async function toggleMode($: EngineInterface) {
  const next: PaneMode = (await read($, mode)) === 'text' ? 'image' : 'text'
  await update($, mode, () => next)
  await $.store.set(MODE_KEY, next)
}

function failure($: EngineInterface, error: unknown): string {
  const text = `mermaid-pane: ${error instanceof Error ? error.message : String(error)}`
  $.ui.log(text)
  $.ui.toast(text)
  return text
}

async function warnFallback($: EngineInterface) {
  const t = await getTools($)
  const missing = [...(t.chafa ? [] : [MISSING_CHAFA]), ...(t.zellij ? [] : [MISSING_ZELLIJ])]
  for (const text of missing.filter(m => !warned.has(m))) {
    warned.add(text)
    $.ui.toast(text)
  }
}

async function present($: EngineInterface, viewer: Viewer, list: readonly Diagram[]) {
  const t = await getTools($)
  if (viewer === 'os') return openInOs($, t, list.flatMap(d => ('path' in d ? [d.path] : [])))
  if (viewer !== 'zellij' || !t.zellij || !t.chafa) return
  const session = (await $.env.get('ZELLIJ_SESSION_NAME')) ?? ''
  // State can outlive the Zellij session it was written in.
  const isSameSession = (await read($, zellijSession)) === session
  const previous = (isSameSession && (await read($, zellijPane))) || undefined
  const opened = await launchViewer($, { ...t, zellij: t.zellij, chafa: t.chafa }, list, previous)
  await update($, zellijPane, () => opened ?? '')
  await update($, zellijSession, () => session)
}

async function onReply($: EngineInterface, sources: string[]) {
  const t = await getTools($)
  if (!t.mmdc) return $.ui.toast(MISSING_MMDC)
  const mmdc = t.mmdc
  const viewer = await activeViewer($)
  if (viewer === 'os') await warnFallback($)
  const mine = ++generation

  if (viewer === 'pane') {
    await update($, isRendering, () => true)
    const opened = await $.ui.open({ id: PANE, title: TITLE })
    if (!opened.isPlaced) $.ui.toast(narrowToast(sources.length))
  }

  const rendered: Diagram[] = []
  try {
    const dir = await renderDir($)
    const mermaidAscii = viewer === 'pane' ? t.mermaidAscii : undefined
    for (const source of sources) {
      const image = await render($, { ...t, mmdc }, source, dir)
      const text = mermaidAscii && 'path' in image ? await renderText($, { path: t.path, mermaidAscii }, source, dir) : undefined
      rendered.push(text ? { ...image, text } : image)
    }
    if (mine !== generation) return
    await update($, diagrams, () => rendered)
    await update($, index, () => 0)
  } finally {
    if (mine === generation) await update($, isRendering, () => false)
  }
  await present($, viewer, rendered)
}

async function onReplyLogged($: EngineInterface, sources: string[]) {
  await onReply($, sources).catch((error: unknown) => failure($, error))
}

async function runCommand($: EngineInterface) {
  const viewer = await activeViewer($)
  if (viewer === 'pane') {
    // A pane opened unasked on a narrow terminal is listed but undrawn; show it rather than close it.
    const isDrawn = (await $.ui.panes()).some(p => p.id === PANE && p.isPlaced)
    if (isDrawn) {
      await $.ui.close({ id: PANE })
      return { text: 'Closed the diagrams pane.' }
    }
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: 'Opened the diagrams pane.' }
  }
  const list = await read($, diagrams)
  if (list.length === 0) return { text: 'No diagrams in a reply yet.' }
  if (viewer === 'os') await warnFallback($)
  const failed = await present($, viewer, list).then(
    () => undefined,
    (error: unknown) => failure($, error),
  )
  return { text: failed ?? `Showing ${diagramCount(list.length)}.` }
}

export const register: Register = (on, options) => {
  mmdcOverride = typeof options.mmdcPath === 'string' ? options.mmdcPath.trim() : ''

  on('session.start', async ($, e, next) => {
    warned.clear()
    await loadMode($)
    await $.command.register({
      name: 'mermaid',
      description: "Show the last reply's Mermaid diagrams again (in the pane, closes it when open)",
    })
    await getTools($)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId !== undefined) return result
    const sources = extractMermaid(e.answer)
    if (sources.length === 0) return result
    // Rendering takes seconds; a timer keeps it out of this dispatch's budget.
    $.clock.after(0, () => void onReplyLogged($, sources))
    return result
  })

  on('command.run', { command: 'mermaid' }, async $ => runCommand($))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const list = await read($, diagrams)
    const length = list.length
    return drawPane($, e, {
      list,
      shown: Math.min(await read($, index), Math.max(0, length - 1)),
      isRendering: await read($, isRendering),
      mode: await read($, mode),
      onPage: step => update($, index, i => (((i + step) % length) + length) % length),
      onOpen: path => openFull($, path),
      onToggle: () => toggleMode($),
    })
  })
}
