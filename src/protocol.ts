// The panel <-> worker contract: src/panel.tsx and src/worker.ts both read it.
export {}

declare module 'orca' {
  interface PluginRequests {
    /** Types `text` into a terminal; `enter` also presses Enter (runs it). */
    'snippet.send': {
      input: { terminalId: string; text: string; enter: boolean }
      output: { accepted: boolean }
    }
    /** Puts `text` on the OS clipboard. */
    'snippet.copy': { input: { text: string }; output: { copied: boolean } }
  }
}
