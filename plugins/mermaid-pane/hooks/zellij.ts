import type { EngineInterface } from 'claude-code'

import type { Diagram } from '../types'
import type { Tools } from './tools'

type ZellijTools = Tools & { zellij: string; chafa: string }

export function tabIdOf(listPanesJson: string, paneId: string): number | undefined {
  let panes: unknown
  try {
    panes = JSON.parse(listPanesJson)
  } catch {
    return undefined
  }
  if (!Array.isArray(panes)) return undefined
  const own = panes.find(
    (p: { id?: unknown; is_plugin?: unknown }) => String(p?.id) === paneId && p?.is_plugin !== true,
  ) as { tab_id?: unknown } | undefined
  return typeof own?.tab_id === 'number' ? own.tab_id : undefined
}

export function viewerArgs(diagrams: readonly Diagram[]): string[] {
  return diagrams.map(d => ('path' in d ? `png:${d.path}` : `error:${d.error}`))
}

export function viewerArgv(o: {
  zellij: string
  tabId: number | undefined
  script: string
  chafa: string
  opener: string
  diagrams: readonly Diagram[]
}): string[] {
  return [
    o.zellij, 'run', '--floating', '--close-on-exit',
    '--width', '90%', '--height', '90%',
    ...(o.tabId === undefined ? [] : ['--tab-id', String(o.tabId)]),
    '--name', 'mermaid',
    '--', '/bin/sh', o.script, o.chafa, o.opener, ...viewerArgs(o.diagrams),
  ]
}

async function zellij($: EngineInterface, tools: ZellijTools, args: string[]) {
  return $.process.run([tools.zellij, ...args], { env: { PATH: tools.path }, timeoutMs: 10_000 })
}

async function sessionTabId($: EngineInterface, tools: ZellijTools): Promise<number | undefined> {
  const paneId = await $.env.get('ZELLIJ_PANE_ID')
  if (!paneId) return undefined
  const listed = await zellij($, tools, ['action', 'list-panes', '--json', '--tab'])
  return listed.exitCode === 0 ? tabIdOf(listed.stdout, paneId) : undefined
}

// Returns the new floating pane's id, which closes it next time.
export async function launchViewer(
  $: EngineInterface,
  tools: ZellijTools,
  diagrams: readonly Diagram[],
  previousPane: string | undefined,
): Promise<string | undefined> {
  if (previousPane) await zellij($, tools, ['action', 'close-pane', '--pane-id', previousPane]).catch(() => {})
  const argv = viewerArgv({
    zellij: tools.zellij,
    tabId: await sessionTabId($, tools),
    script: `${$.plugin.root}/viewer/mermaid-view.sh`,
    chafa: tools.chafa,
    opener: tools.opener,
    diagrams,
  })
  const run = await $.process.run(argv, { env: { PATH: tools.path }, timeoutMs: 10_000 })
  if (run.exitCode !== 0) throw new Error(`zellij run failed: ${run.stderr.trim()}`)
  return run.stdout.trim() || undefined
}
