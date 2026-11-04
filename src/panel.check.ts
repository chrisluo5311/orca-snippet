// `orca plugin check` renders the panel once per scenario.
import { defineCheck } from 'orca/testing'

const workspace = {
  event: 'workspace.changed' as const,
  payload: {
    context: {
      branch: 'main',
      displayName: 'my-app',
      terminals: [
        { id: 't1', title: 'Terminal' },
        { id: 't2', title: 'Claude Code' }
      ]
    }
  }
}

export default defineCheck({
  'first run': { events: [workspace] },
  empty: { persisted: { plugin: { snippets: [] } } },
  // Used for the README screenshots.
  showcase: {
    events: [workspace],
    persisted: {
      plugin: {
        snippets: [
          { id: 's1', name: 'Run tests', body: 'pnpm test --watch=false' },
          { id: 's2', name: 'Review prompt', body: 'Review the diff on this branch for bugs and missing tests. List findings by severity.' },
          { id: 's3', name: 'Clean branches', body: 'git fetch -p && git branch -vv | grep ": gone]" | awk \'{print $1}\' | xargs git branch -D' },
          { id: 's4', name: 'Dev server', body: 'pnpm dev --port 3000' }
        ]
      }
    }
  }
})
