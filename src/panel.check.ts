// `orca plugin check` renders the panel once per scenario.
import { defineCheck } from 'orca/testing'

export default defineCheck({
  'first run': {
    events: [
      {
        event: 'workspace.changed',
        payload: { context: { branch: 'main', displayName: 'repo', terminals: [{ id: 't1', title: 'zsh' }] } }
      }
    ]
  },
  empty: { persisted: { plugin: { snippets: [] } } }
})
