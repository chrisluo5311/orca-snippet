// The worker does what a sandboxed panel cannot: type into a terminal and write the clipboard.
import type { OrcaWorkerApi } from 'orca/worker'
import { spawn } from 'node:child_process'

type ClipboardCommand = { cmd: string; args: string[]; env?: Record<string, string> }

/** How long one clipboard command may take before we kill it and try the next. */
const CLIPBOARD_TIMEOUT_MS = 5000

/** The OS clipboard commands for this platform, in order of preference, reading text from stdin. */
function clipboardCommands(): ClipboardCommand[] {
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
  if (process.platform === 'darwin') {
    // pbcopy decodes stdin by the locale; apps opened from Finder have none, so non-ASCII
    // text (e.g. Chinese) would land on the clipboard as MacRoman mojibake.
    return [{ cmd: 'pbcopy', args: [], env: { LC_ALL: 'en_US.UTF-8' } }]
  }
  return [
    { cmd: 'wl-copy', args: [] },
    { cmd: 'xclip', args: ['-selection', 'clipboard'] },
    { cmd: 'xsel', args: ['--clipboard', '--input'] }
  ]
}

export function pipeTo(
  { cmd, args, env }: ClipboardCommand,
  text: string,
  timeoutMs = CLIPBOARD_TIMEOUT_MS
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(ok)
    }
    const child = spawn(cmd, args, {
      stdio: ['pipe', 'ignore', 'ignore'],
      windowsHide: true,
      env: env ? { ...process.env, ...env } : process.env
    })
    const timer = setTimeout(() => {
      child.kill()
      finish(false)
    }, timeoutMs)
    child.on('error', () => finish(false))
    child.on('close', (code) => finish(code === 0))
    // A missing or early-exiting command makes this write fail (EPIPE); without a listener
    // that error would crash the worker instead of falling through to the next command.
    child.stdin.on('error', () => finish(false))
    child.stdin.end(text, 'utf8')
  })
}

export async function copyToClipboard(text: string): Promise<boolean> {
  for (const command of clipboardCommands()) {
    if (await pipeTo(command, text)) return true
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
