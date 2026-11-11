// Runs src/worker.ts's activate(orca) over a mock host.
import { assert, mockHost, mountWorker, test } from 'orca/testing'
import * as main from './worker'
import { pipeTo } from './worker'

test('sends snippet text to the terminal', async () => {
  const host = mockHost({ results: { 'terminal.sendText': { accepted: true } } })
  const worker = await mountWorker(main, { host })
  const answer = await worker.request('snippet.send', { terminalId: 't1', text: 'ls', enter: true })
  assert.deepEqual(answer, { accepted: true })
  assert.deepEqual(host.callsOf('terminal.sendText'), [
    { terminalId: 't1', text: 'ls', enter: true }
  ])
  assert.deepEqual(worker.refusals, [])
  await worker.deactivate()
})

test('a missing clipboard command fails over instead of crashing', async () => {
  assert.equal(await pipeTo({ cmd: 'no-such-clipboard-command', args: [] }, 'hi'), false)
})

// The stand-in clipboard commands below run Node itself, not `false`, `sleep` or `sh`: those
// don't exist on Windows, where a missing command would make these tests pass for the wrong reason.
const node = (script: string, env?: Record<string, string>) => ({ cmd: process.execPath, args: ['-e', script], env })

test('a clipboard command that exits without reading its input reports failure', async () => {
  // It exits at once with code 1; the large write then hits a closed pipe (EPIPE).
  assert.equal(await pipeTo(node('process.exit(1)'), 'x'.repeat(4 * 1024 * 1024)), false)
})

test('a clipboard command that hangs is killed after the timeout', async () => {
  const started = Date.now()
  assert.equal(await pipeTo(node('setTimeout(() => {}, 10000)'), 'hi', 200), false)
  const elapsed = Date.now() - started
  assert.ok(elapsed >= 200 && elapsed < 2000, `took ${elapsed} ms`)
})

test('a clipboard command that reads its input and exits 0 reports success', async () => {
  assert.equal(await pipeTo(node('process.stdin.resume().on("end", () => process.exit(0))'), '程式'), true)
})

test('the child gets the extra env, e.g. the UTF-8 locale pbcopy needs', async () => {
  const script = 'process.stdin.resume().on("end", () => process.exit(process.env.LC_ALL === "en_US.UTF-8" ? 0 : 1))'
  assert.equal(await pipeTo(node(script, { LC_ALL: 'en_US.UTF-8' }), '程式'), true)
  assert.equal(await pipeTo(node(script, { LC_ALL: 'C' }), '程式'), false)
})
