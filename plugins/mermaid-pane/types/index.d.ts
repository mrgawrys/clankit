export type Diagram = { path: string } | { error: string }

declare module 'claude-code' {
  interface PluginState {
    'mermaid-pane': {
      diagrams: Shaped<Diagram[]>
      index: number
      isRendering: boolean
      zellijPane: string
      zellijSession: string
    }
  }
}
