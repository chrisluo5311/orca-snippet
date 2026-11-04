// `orca plugin test .` runs this in Node with the same runtime Orca uses.
import { assert, mockHost, mount, test } from 'orca/testing'
import * as panel from './panel'

const context = {
  branch: 'main',
  displayName: 'repo',
  terminals: [{ id: 't1', title: 'zsh' }, { id: 't2', title: 'Claude' }]
}

test('adds a snippet and runs it in the chosen terminal', async () => {
  const sent: unknown[] = []
  const host = mockHost({
    requests: {
      'snippet.send': (input) => (sent.push(input), { accepted: true }),
      'snippet.copy': () => ({ copied: true })
    }
  })
  const view = await mount(panel, { host, persisted: { plugin: { snippets: [] } } })
  await view.emit('workspace.changed', { context })

  assert.equal(view.find({ type: 'EmptyState' })?.props?.title, 'No snippets yet')
  await view.press({ label: 'New snippet' })
  await view.type({ label: 'Name' }, 'Tests')
  await view.type({ label: 'Content' }, 'npm test')
  await view.press({ text: 'Save' })
  assert.deepEqual(
    (view.persisted.plugin.snippets as panel.Snippet[]).map((s) => [s.name, s.body]),
    [['Tests', 'npm test']]
  )

  await view.select({ label: 'Send to' }, 't2')
  await view.press({ text: 'Run' })
  assert.deepEqual(sent, [{ terminalId: 't2', text: 'npm test', enter: true }])

  await view.press({ label: 'Insert without Enter' })
  assert.deepEqual(sent[1], { terminalId: 't2', text: 'npm test', enter: false })

  await view.press({ label: 'Copy' })
  assert.ok(view.find({ text: 'Copied "Tests"' }))
  assert.deepEqual(view.errors, [])
  assert.deepEqual(view.refusals, [])
  await view.unmount()
})

test('searches, edits and deletes with confirmation', async () => {
  const view = await mount(panel, {
    host: mockHost(),
    persisted: {
      plugin: {
        snippets: [
          { id: 'a', name: 'Git status', body: 'git status' },
          { id: 'b', name: 'Build', body: 'pnpm build' }
        ]
      }
    }
  })
  await view.type({ label: 'Search' }, 'pnpm')
  assert.equal(view.findAll({ type: 'Card' }).length, 1)
  await view.type({ label: 'Search' }, 'zzz', { replace: true })
  assert.equal(view.find({ type: 'EmptyState' })?.props?.title, 'No matches')
  await view.type({ label: 'Search' }, '', { replace: true })

  await view.press(view.findAll({ label: 'Edit' })[1])
  await view.type({ label: 'Name' }, 'Build all', { replace: true })
  await view.press({ text: 'Save' })
  assert.ok(view.find({ label: 'Build all' }))

  await view.press(view.findAll({ label: 'Delete' })[0])
  assert.equal((view.persisted.plugin.snippets as unknown[]).length, 2)
  await view.press({ text: 'Confirm' })
  assert.deepEqual(
    (view.persisted.plugin.snippets as panel.Snippet[]).map((s) => s.id),
    ['b']
  )
  assert.deepEqual(view.errors, [])
  await view.unmount()
})

test('warns when the workspace has no terminal', async () => {
  const view = await mount(panel, { host: mockHost() })
  await view.emit('workspace.changed', { context: null })
  await view.press(view.findAll({ text: 'Run' })[0])
  assert.ok(view.find({ text: 'Open a terminal in this workspace first.' }))
  await view.unmount()
})
