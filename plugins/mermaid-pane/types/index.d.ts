export type TextRender = { art: string } | { error: string }
// `text` absent: mermaid-ascii was not found when the reply rendered.
export type Diagram = ({ path: string } | { error: string }) & { text?: TextRender }
export type PaneMode = 'image' | 'text'

declare module 'claude-code' {
  interface PluginState {
    'mermaid-pane': {
      diagrams: Shaped<Diagram[]>
      index: number
      isRendering: boolean
      mode: PaneMode
      zellijPane: string
      zellijSession: string
    }
  }
}
