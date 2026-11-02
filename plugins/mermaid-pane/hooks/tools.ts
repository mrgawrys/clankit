import type { EngineInterface } from 'claude-code'

export type Tools = { path: string; opener: string; mmdc?: string; chafa?: string; zellij?: string }

// Claude Code's own PATH often lacks what a version manager adds in the login shell, `node` included.
async function loginPath($: EngineInterface): Promise<string> {
  const own = (await $.env.get('PATH')) ?? '/usr/bin:/bin'
  const shell = await $.env.get('SHELL')
  if (!shell) return own
  const run = await $.process
    .run([shell, '-lc', 'printf %s "$PATH"'], { timeoutMs: 10_000 })
    .catch(() => undefined)
  const path = run?.exitCode === 0 ? run.stdout.trim() : ''
  return path === '' ? own : path
}

async function find($: EngineInterface, path: string, name: string): Promise<string | undefined> {
  for (const dir of path.split(':')) {
    if (!dir.startsWith('/')) continue
    const candidate = `${dir.replace(/\/$/, '')}/${name}`
    const stat = await $.fs.stat(candidate).catch(() => undefined)
    if (stat?.kind === 'file') return candidate
  }
  return undefined
}

export async function resolveTools($: EngineInterface, mmdcOverride: string): Promise<Tools> {
  const path = await loginPath($)
  const [mmdc, chafa, zellij, xdgOpen] = await Promise.all([
    mmdcOverride !== '' ? mmdcOverride : find($, path, 'mmdc'),
    find($, path, 'chafa'),
    find($, path, 'zellij'),
    find($, path, 'xdg-open'),
  ])
  // Some Linux distributions ship an unrelated `open` (openvt), so xdg-open wins where present.
  return { path, opener: xdgOpen ?? 'open', mmdc, chafa, zellij }
}
