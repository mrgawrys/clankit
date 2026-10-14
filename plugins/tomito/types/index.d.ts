export type Snapshot = { activity: string; remaining: string }

declare module 'claude-code' {
  interface PluginState {
    tomito: { focusEnded: boolean; breakWaiting: boolean; askStart: boolean }
  }
}
