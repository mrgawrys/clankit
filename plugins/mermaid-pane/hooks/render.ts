import type { EngineInterface } from 'claude-code'

import type { Diagram } from '../types'
import type { Tools } from './tools'

const MMDC_TIMEOUT_MS = 60_000

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

export function firstLine(text: string, fallback = 'mmdc failed with no message'): string {
  return text.split('\n').map(l => l.trim()).find(l => l !== '') ?? fallback
}

export async function renderDir($: EngineInterface): Promise<string> {
  const tmp = (await $.env.get('TMPDIR')) ?? '/tmp'
  return `${tmp.replace(/\/$/, '')}/mermaid-pane`
}

export async function render(
  $: EngineInterface,
  tools: Tools & { mmdc: string },
  source: string,
  dir: string,
): Promise<Diagram> {
  const hash = await sha256(source)
  const png = `${dir}/${hash}.png`
  // Only the PNG on disk counts as cached: a failure is often the environment, fixed by the next try.
  if (await $.fs.exists(png)) return { path: png }

  const input = `${dir}/${hash}.mmd`
  await $.fs.write(input, source)
  const argv = [tools.mmdc, '-q', '-i', input, '-o', png, '-s', '2', '-b', 'white']
  let run
  try {
    run = await $.process.run(argv, { env: { PATH: tools.path }, timeoutMs: MMDC_TIMEOUT_MS })
  } catch (error) {
    return { error: `mmdc did not finish: ${firstLine(String(error))}` }
  }

  return run.exitCode === 0 && (await $.fs.exists(png))
    ? { path: png }
    : { error: firstLine(run.stderr || run.stdout) }
}
