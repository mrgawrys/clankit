import type { EngineInterface } from 'claude-code'

import type { TextRender } from '../types'
import { firstLine, sha256 } from './render'

const TIMEOUT_MS = 30_000

// mermaid-ascii exits through logrus, whose line off a terminal is `time="…" level=fatal msg="…"`.
export function textError(stderr: string): string {
  const line = firstLine(stderr, 'mermaid-ascii failed with no message')
  const msg = /\bmsg=("(?:[^"\\]|\\.)*"|\S+)/.exec(line)?.[1]
  if (msg === undefined) return line
  if (!msg.startsWith('"')) return msg
  try {
    return JSON.parse(msg) as string
  } catch {
    return msg.slice(1, -1)
  }
}

export async function renderText(
  $: EngineInterface,
  tools: { path: string; mermaidAscii: string },
  source: string,
  dir: string,
): Promise<TextRender> {
  const txt = `${dir}/${await sha256(source)}.txt`
  if (await $.fs.exists(txt)) return { art: await $.fs.read(txt) }

  let run
  try {
    run = await $.process.run([tools.mermaidAscii, '-f', '-'], {
      env: { PATH: tools.path },
      stdin: source,
      timeoutMs: TIMEOUT_MS,
    })
  } catch (error) {
    return { error: `mermaid-ascii did not finish: ${firstLine(String(error))}` }
  }
  if (run.exitCode !== 0) return { error: textError(run.stderr || run.stdout) }
  if (run.stdout.trim() === '') return { error: 'mermaid-ascii drew nothing for this diagram' }
  await $.fs.write(txt, run.stdout)
  return { art: run.stdout }
}
