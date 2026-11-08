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

test('a clipboard command that exits without reading its input reports failure', async () => {
  // `false` exits at once with code 1; the large write then hits a closed pipe (EPIPE).
  assert.equal(await pipeTo({ cmd: 'false', args: [] }, 'x'.repeat(4 * 1024 * 1024)), false)
})

test('a clipboard command that hangs is killed after the timeout', async () => {
  const started = Date.now()
  assert.equal(await pipeTo({ cmd: 'sleep', args: ['10'] }, 'hi', 200), false)
  assert.ok(Date.now() - started < 2000)
})

test('the child gets the extra env, e.g. the UTF-8 locale pbcopy needs', async () => {
  assert.equal(
    await pipeTo({ cmd: 'sh', args: ['-c', 'cat >/dev/null; [ "$LC_ALL" = en_US.UTF-8 ]'], env: { LC_ALL: 'en_US.UTF-8' } }, '程式'),
    true
  )
})
