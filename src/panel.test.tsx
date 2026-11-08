// `orca plugin test .` runs this in Node with the same runtime Orca uses.
import { mock } from 'node:test'
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

  await view.select({ label: 'Target terminal' }, 't2')
  await view.press({ text: 'Run' })
  assert.deepEqual(sent, [{ terminalId: 't2', text: 'npm test', enter: true }])

  await view.press({ label: 'Insert without Enter' })
  assert.deepEqual(sent[1], { terminalId: 't2', text: 'npm test', enter: false })

  await view.press({ label: 'Copy' })
  const copied = view.find({ type: 'Callout' })
  assert.equal(copied?.props?.title, 'Copied')
  assert.equal(copied?.props?.tone, 'success')
  assert.ok(view.find({ type: 'Callout', text: /Tests/ }))
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
  assert.deepEqual(
    (view.persisted.plugin.snippets as panel.Snippet[]).map((s) => [s.id, s.name]),
    [['a', 'Git status'], ['b', 'Build all']]
  )
  assert.equal(view.find({ label: 'Name' }), null)

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
  const warning = view.find({ type: 'Callout' })
  assert.equal(warning?.props?.tone, 'warning')
  assert.equal(warning?.props?.title, 'No terminal')
  assert.ok(view.find({ type: 'Callout', text: /Open a terminal in this workspace first\./ }))
  await view.unmount()
})

test('keeps an edit whose snippet was deleted meanwhile, as a new snippet', async () => {
  const view = await mount(panel, {
    host: mockHost(),
    persisted: { plugin: { snippets: [{ id: 'a', name: 'Build', body: 'pnpm build' }] } }
  })
  await view.press({ label: 'Edit' })
  await view.type({ label: 'Content' }, 'pnpm build --prod', { replace: true })
  await view.press({ label: 'Delete' })
  await view.press({ text: 'Confirm' })
  assert.deepEqual(view.persisted.plugin.snippets, [])

  await view.press({ text: 'Save' })
  const saved = view.persisted.plugin.snippets as panel.Snippet[]
  assert.deepEqual(saved.map((s) => [s.name, s.body]), [['Build', 'pnpm build --prod']])
  assert.notEqual(saved[0].id, 'a')
  assert.equal(view.find({ type: 'Callout' })?.props?.title, 'Saved as new')
  await view.unmount()
})

test('an unconfirmed delete disarms by itself', async () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    const view = await mount(panel, {
      host: mockHost(),
      persisted: { plugin: { snippets: [{ id: 'a', name: 'Build', body: 'pnpm build' }] } }
    })
    await view.press({ label: 'Delete' })
    assert.ok(view.find({ text: 'Confirm' }))
    mock.timers.tick(4000)
    // The test view redraws after an act, not after a bare timer.
    await view.type({ label: 'Search' }, '', { replace: true })
    assert.equal(view.find({ text: 'Confirm' }), null)
    assert.ok(view.find({ label: 'Delete' }))
    assert.equal((view.persisted.plugin.snippets as unknown[]).length, 1)
    await view.unmount()
  } finally {
    mock.timers.reset()
  }
})
