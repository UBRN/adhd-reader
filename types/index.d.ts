export type AdhdReaderLevel = 1 | 2 | 3 | 4 | 5
export type AdhdReaderSettings = { enabled: boolean; level: AdhdReaderLevel }

declare module 'claude-code' {
  interface PluginState {
    'adhd-reader': { settings: AdhdReaderSettings }
  }
}
