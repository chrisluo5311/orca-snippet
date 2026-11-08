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
  // The data of docs/images/src/panel.html, to compare that mock with Orca's own render:
  // `orca plugin shot . --scenario readme --theme dark --width 326` (Orca window minimized).
  readme: {
    events: [workspace],
    persisted: {
      workspace: { target: 't2' },
      plugin: {
        snippets: [
          { id: 's1', name: 'Run tests', body: 'pnpm test --watch=false' },
          { id: 's2', name: 'Review prompt', body: 'Review the diff on this branch for bugs and missing tests.' },
          { id: 's3', name: 'Git status', body: 'git status -sb' }
        ]
      }
    }
  },
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
