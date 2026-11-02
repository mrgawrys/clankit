import type { EngineInterface } from 'claude-code'

import type { Tools } from './tools'

export type Viewer = 'zellij' | 'pane' | 'os'

export function chooseViewer(isInZellij: boolean, tools: Pick<Tools, 'chafa'>): Viewer {
  if (!isInZellij) return 'pane'
  return tools.chafa ? 'zellij' : 'os'
}

export async function openInOs($: EngineInterface, tools: Tools, paths: readonly string[]) {
  // xdg-open takes one file; macOS `open` takes many.
  const batches = tools.opener.endsWith('xdg-open') ? paths.map(p => [p]) : [paths]
  for (const batch of batches) {
    if (batch.length === 0) continue
    await $.process.run([tools.opener, ...batch], { env: { PATH: tools.path }, timeoutMs: 10_000 })
  }
}
