import type { EngineInterface } from 'claude-code'

import type { Diagram } from '../types'
import type { Tools } from './tools'

const MMDC_TIMEOUT_MS = 60_000
const done = new Map<string, Diagram>()

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

export function firstLine(text: string): string {
  return text.split('\n').map(l => l.trim()).find(l => l !== '') ?? 'mmdc failed with no message'
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
  const cached = done.get(hash)
  if (cached) return cached

  const png = `${dir}/${hash}.png`
  if (await $.fs.exists(png)) {
    done.set(hash, { path: png })
    return { path: png }
  }

  const input = `${dir}/${hash}.mmd`
  await $.fs.write(input, source)
  const argv = [tools.mmdc, '-q', '-i', input, '-o', png, '-s', '2', '-b', 'white']
  let run
  try {
    run = await $.process.run(argv, { env: { PATH: tools.path }, timeoutMs: MMDC_TIMEOUT_MS })
  } catch (error) {
    return { error: `mmdc did not finish: ${firstLine(String(error))}` }
  }

  const diagram: Diagram =
    run.exitCode === 0 && (await $.fs.exists(png))
      ? { path: png }
      : { error: firstLine(run.stderr || run.stdout) }
  done.set(hash, diagram)
  return diagram
}
