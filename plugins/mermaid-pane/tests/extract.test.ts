import { expect, test } from 'claude-code/testing'

import { extractMermaid } from '../hooks/extract'

test('several blocks come back in the order written', async () => {
  const answer = [
    'First:',
    '```mermaid',
    'graph TD; A-->B',
    '```',
    'then some prose, then',
    '```mermaid',
    'sequenceDiagram',
    '  A->>B: hi',
    '```',
  ].join('\n')

  expect(extractMermaid(answer)).toEqual(['graph TD; A-->B', 'sequenceDiagram\n  A->>B: hi'])
})

test('fences of other languages are ignored, a mermaid fence nested in one too', async () => {
  const answer = [
    '```ts',
    'const a = 1',
    '```',
    '````markdown',
    '```mermaid',
    'graph LR; X-->Y',
    '```',
    '````',
    '```',
    'plain',
    '```',
  ].join('\n')

  expect(extractMermaid(answer)).toEqual([])
})

test('an unclosed fence does not throw and yields nothing past it', async () => {
  const answer = ['```mermaid', 'graph TD; A-->B', '```', '```mermaid', 'graph TD; C--'].join('\n')

  expect(extractMermaid(answer)).toEqual(['graph TD; A-->B'])
})

test('tilde fences and CRLF line ends are read too', async () => {
  const answer = '~~~mermaid\r\npie\r\n  "a": 1\r\n~~~\r\n'

  expect(extractMermaid(answer)).toEqual(['pie\n  "a": 1'])
})

test('a reply without mermaid yields nothing', async () => {
  expect(extractMermaid('Just words, `inline code` and ```mermaid inline```.')).toEqual([])
})
