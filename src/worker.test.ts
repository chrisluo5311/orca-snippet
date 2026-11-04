// Runs src/worker.ts's activate(orca) over a mock host.
import { assert, mockHost, mountWorker, test } from 'orca/testing'
import * as main from './worker'

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
