const OPEN = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)[^`]*$/
const CLOSE = /^ {0,3}(`{3,}|~{3,})\s*$/

export function extractMermaid(text: string): string[] {
  const found: string[] = []
  let fence: { mark: string; isMermaid: boolean; lines: string[] } | null = null

  for (const line of text.split(/\r?\n/)) {
    if (fence === null) {
      const open = OPEN.exec(line)
      if (open) {
        fence = { mark: open[1] ?? '', isMermaid: open[2]?.toLowerCase() === 'mermaid', lines: [] }
      }
      continue
    }
    const close = CLOSE.exec(line)?.[1]
    if (close && close[0] === fence.mark[0] && close.length >= fence.mark.length) {
      if (fence.isMermaid && fence.lines.some(l => l.trim() !== '')) found.push(fence.lines.join('\n'))
      fence = null
      continue
    }
    fence.lines.push(line)
  }

  return found
}
