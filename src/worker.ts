// The worker does what a sandboxed panel cannot: type into a terminal and write the clipboard.
import type { OrcaWorkerApi } from 'orca/worker'
import { spawn } from 'node:child_process'

/** The OS clipboard command for this platform, reading the text from stdin. */
function clipboardCommand(): { cmd: string; args: string[] }[] {
  if (process.platform === 'win32') {
    return [
      {
        cmd: 'powershell.exe',
        args: [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          '[Console]::InputEncoding=[Text.Encoding]::UTF8; Set-Clipboard -Value ([Console]::In.ReadToEnd())'
        ]
      }
    ]
  }
  if (process.platform === 'darwin') return [{ cmd: 'pbcopy', args: [] }]
  return [
    { cmd: 'wl-copy', args: [] },
    { cmd: 'xclip', args: ['-selection', 'clipboard'] },
    { cmd: 'xsel', args: ['--clipboard', '--input'] }
  ]
}

function pipeTo(cmd: string, args: string[], text: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['pipe', 'ignore', 'ignore'], windowsHide: true })
    child.on('error', () => resolve(false))
    child.on('close', (code) => resolve(code === 0))
    child.stdin.end(text, 'utf8')
  })
}

export async function copyToClipboard(text: string): Promise<boolean> {
  for (const { cmd, args } of clipboardCommand()) {
    if (await pipeTo(cmd, args, text)) return true
  }
  return false
}

export default function activate(orca: OrcaWorkerApi): void {
  orca.panels.handle('snippet.send', async ({ terminalId, text, enter }) => {
    return orca.host.call('terminal.sendText', { terminalId, text, enter })
  })

  orca.panels.handle('snippet.copy', async ({ text }) => {
    const copied = await copyToClipboard(text)
    if (!copied) orca.log('snippets: no clipboard command worked on this system')
    return { copied }
  })
}
