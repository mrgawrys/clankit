import type { EngineInterface } from 'claude-code'

export type Tools = { path: string; opener: string; mmdc?: string; chafa?: string; zellij?: string }

const SENTINEL = '__mermaid_pane_path__'

// Claude Code's own PATH often lacks what a version manager adds in the login shell, `node` included.
async function loginPath($: EngineInterface): Promise<string> {
  const own = (await $.env.get('PATH')) ?? '/usr/bin:/bin'
  const shell = await $.env.get('SHELL')
  if (!shell) return own
  const run = await $.process
    .run([shell, '-lc', `printf '\\n${SENTINEL}%s' "$PATH"`], { timeoutMs: 10_000 })
    .catch(() => undefined)
  const at = run?.exitCode === 0 ? run.stdout.lastIndexOf(SENTINEL) : -1
  const path = at === -1 ? '' : (run?.stdout.slice(at + SENTINEL.length).trim() ?? '')
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

async function isMacOs($: EngineInterface, path: string): Promise<boolean> {
  const uname = (await find($, path, 'uname')) ?? 'uname'
  const run = await $.process.run([uname, '-s'], { env: { PATH: path }, timeoutMs: 5_000 }).catch(() => undefined)
  return run?.stdout.trim() === 'Darwin'
}

export async function resolveTools($: EngineInterface, mmdcOverride: string): Promise<Tools> {
  const path = await loginPath($)
  const openerName = (await isMacOs($, path)) ? 'open' : 'xdg-open'
  const [mmdc, chafa, zellij, opener] = await Promise.all([
    mmdcOverride !== '' ? mmdcOverride : find($, path, 'mmdc'),
    find($, path, 'chafa'),
    find($, path, 'zellij'),
    find($, path, openerName),
  ])
  return { path, opener: opener ?? openerName, mmdc, chafa, zellij }
}
