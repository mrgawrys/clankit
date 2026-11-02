import { expect, test } from 'claude-code/testing'

import { tabIdOf, viewerArgv } from '../hooks/zellij'

// The shape `zellij action list-panes --json --tab` prints: a plugin pane and a
// terminal pane can share an id, so the plugin one must not win.
const LISTED = JSON.stringify([
  { id: 3, is_plugin: true, is_floating: false, tab_id: 0 },
  { id: 1, is_plugin: false, is_floating: false, tab_id: 0 },
  { id: 3, is_plugin: false, is_floating: false, tab_id: 2 },
])

test('the tab is the one holding our own terminal pane, never a plugin pane of the same id', async () => {
  expect(tabIdOf(LISTED, '3')).toBe(2)
  expect(tabIdOf(LISTED, '1')).toBe(0)
  expect(tabIdOf(LISTED, '9')).toBeUndefined()
  expect(tabIdOf('not json', '3')).toBeUndefined()
})

test('the viewer opens floating, 90% by 90%, in the session tab, diagrams in reply order', async () => {
  const argv = viewerArgv({
    zellij: '/bin/zellij',
    tabId: 2,
    script: '/plugin/viewer/mermaid-view.sh',
    chafa: '/bin/chafa',
    opener: 'open',
    diagrams: [{ path: '/t/a.png' }, { error: 'Error: Parse error on line 2:' }, { path: '/t/c.png' }],
  })

  expect(argv).toEqual([
    '/bin/zellij', 'run', '--floating', '--close-on-exit',
    '--width', '90%', '--height', '90%',
    '--tab-id', '2',
    '--name', 'mermaid',
    '--', '/bin/sh', '/plugin/viewer/mermaid-view.sh', '/bin/chafa', 'open',
    'png:/t/a.png', 'error:Error: Parse error on line 2:', 'png:/t/c.png',
  ])
})

test('without a known tab the viewer opens where Zellij puts it', async () => {
  const argv = viewerArgv({
    zellij: 'zellij', tabId: undefined, script: 's', chafa: 'c', opener: 'o', diagrams: [{ path: '/a.png' }],
  })
  expect(argv).not.toContain('--tab-id')
})
