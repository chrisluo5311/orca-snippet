// No build step: Orca strips the types and compiles the JSX when the panel loads.
import {
  atom,
  Badge,
  Button,
  Callout,
  Card,
  CodeView,
  EmptyState,
  Heading,
  IconButton,
  Input,
  on,
  plugin,
  read,
  Row,
  Select,
  set,
  Stack,
  Text,
  Textarea,
  update,
  type PanelContext
} from 'orca'

export type Snippet = { id: string; name: string; body: string }
type Terminal = { id: string; title?: string }
type Draft = { id: string | null; name: string; body: string }
type Notice = { tone: 'success' | 'danger'; text: string }

const EXAMPLES: Snippet[] = [
  { id: 'example-1', name: 'Git status', body: 'git status -sb' },
  { id: 'example-2', name: 'Recent commits', body: 'git log --oneline -n 10' }
]

/** Every saved snippet, kept across Orca restarts. */
export const snippets = atom<Snippet[]>('snippets', EXAMPLES, { persist: 'plugin', version: 1 })
/** The terminal snippets go to, remembered per workspace. */
const target = atom<string | null>('target', null, { persist: 'workspace' })
const query = atom('query', '')
/** The add/edit form; null while closed. */
const draft = atom<Draft | null>('draft', null)
const terminals = atom<Terminal[]>([])
const pendingDelete = atom<string | null>(null)
const notice = atom<Notice | null>(null)

let noticeTimer: ReturnType<typeof setTimeout> | undefined
function flash(tone: Notice['tone'], text: string): void {
  set(notice, { tone, text })
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => set(notice, null), 2500)
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** The chosen terminal if it is still open, else the workspace's first terminal. */
function activeTerminal(): Terminal | null {
  const list = read(terminals)
  return list.find((t) => t.id === read(target)) ?? list[0] ?? null
}

function terminalLabel(t: Terminal, index: number): string {
  return t.title?.trim() || `Terminal ${index + 1}`
}

async function send(snippet: Snippet, enter: boolean): Promise<void> {
  const terminal = activeTerminal()
  if (!terminal) {
    flash('danger', 'Open a terminal in this workspace first.')
    return
  }
  try {
    const { accepted } = await plugin.request('snippet.send', {
      terminalId: terminal.id,
      text: snippet.body,
      enter
    })
    if (accepted) flash('success', `${enter ? 'Ran' : 'Inserted'} "${snippet.name}"`)
    else flash('danger', 'The terminal did not accept the text.')
  } catch (error) {
    flash('danger', `Could not send: ${(error as Error).message}`)
  }
}

async function copy(snippet: Snippet): Promise<void> {
  try {
    const { copied } = await plugin.request('snippet.copy', { text: snippet.body })
    if (copied) flash('success', `Copied "${snippet.name}"`)
    else flash('danger', 'No clipboard command is available on this system.')
  } catch (error) {
    flash('danger', `Could not copy: ${(error as Error).message}`)
  }
}

function saveDraft(): void {
  const d = read(draft)
  if (!d) return
  const name = d.name.trim()
  if (!name || !d.body.trim()) return
  if (d.id === null) {
    update(snippets, (list) => [{ id: newId(), name, body: d.body }, ...list])
  } else {
    update(snippets, (list) => list.map((s) => (s.id === d.id ? { ...s, name, body: d.body } : s)))
  }
  set(draft, null)
}

function remove(id: string): void {
  if (read(pendingDelete) !== id) {
    set(pendingDelete, id)
    return
  }
  update(snippets, (list) => list.filter((s) => s.id !== id))
  set(pendingDelete, null)
}

export function matches(snippet: Snippet, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  return (
    snippet.name.toLowerCase().includes(needle) || snippet.body.toLowerCase().includes(needle)
  )
}

/** Runs once before the first render; subscriptions end with the panel. */
export function setup(ctx: PanelContext): void {
  // Fires right away with the current workspace, then on every focus or terminal change.
  ctx.subscriptions.push(
    on('workspace.changed', ({ context }) => set(terminals, context?.terminals ?? []))
  )
}

function Editor({ value }: { value: Draft }) {
  const invalid = !value.name.trim() || !value.body.trim()
  return (
    <Card title={value.id === null ? 'New snippet' : 'Edit snippet'}>
      <Stack gap="sm">
        <Input
          label="Name"
          value={value.name}
          placeholder="e.g. Run tests"
          onChange={(name) => update(draft, (d) => (d ? { ...d, name } : d))}
          onSubmit={saveDraft}
        />
        <Textarea
          label="Content"
          rows={5}
          value={value.body}
          placeholder="Command or prompt text"
          onChange={(body) => update(draft, (d) => (d ? { ...d, body } : d))}
          onSubmit={saveDraft}
        />
        <Row gap="xs" justify="end">
          <Button variant="ghost" onPress={() => set(draft, null)}>
            Cancel
          </Button>
          <Button icon="check" disabled={invalid} onPress={saveDraft}>
            Save
          </Button>
        </Row>
      </Stack>
    </Card>
  )
}

function SnippetCard({ snippet }: { snippet: Snippet }) {
  const confirming = read(pendingDelete) === snippet.id
  return (
    <Card title={snippet.name}>
      <Stack gap="xs">
        <CodeView code={snippet.body} wrap maxHeight="sm" />
        <Row gap="xs" wrap>
            <Button size="sm" icon="play" tooltip="Type it and press Enter" onPress={() => send(snippet, true)}>
              Run
            </Button>
            <IconButton
              size="sm"
              variant="outline"
              icon="terminal"
              label="Insert without Enter"
              onPress={() => send(snippet, false)}
            />
            <IconButton size="sm" variant="ghost" icon="copy" label="Copy" onPress={() => copy(snippet)} />
            <IconButton
              size="sm"
              variant="ghost"
              icon="edit"
              label="Edit"
              onPress={() => set(draft, { id: snippet.id, name: snippet.name, body: snippet.body })}
            />
            {confirming ? (
              <Button size="sm" tone="danger" icon="delete" onPress={() => remove(snippet.id)}>
                Confirm
              </Button>
            ) : (
              <IconButton
                size="sm"
                variant="ghost"
                tone="danger"
                icon="delete"
                label="Delete"
                onPress={() => remove(snippet.id)}
              />
            )}
        </Row>
      </Stack>
    </Card>
  )
}

export default function Panel() {
  const all = read(snippets)
  const q = read(query)
  const shown = all.filter((s) => matches(s, q))
  const termList = read(terminals)
  const active = activeTerminal()
  const form = read(draft)
  const message = read(notice)

  return (
    <Stack gap="md">
      <Row justify="between">
        <Row gap="xs">
          <Heading>Snippets</Heading>
          <Badge tone="accent">{all.length}</Badge>
        </Row>
        <IconButton
          icon="add"
          label="New snippet"
          disabled={form !== null}
          onPress={() => set(draft, { id: null, name: '', body: '' })}
        />
      </Row>

      {termList.length > 0 ? (
        <Select
          label="Send to"
          value={active?.id ?? ''}
          options={termList.map((t, i) => ({ value: t.id, label: terminalLabel(t, i) }))}
          onChange={(id) => set(target, id)}
        />
      ) : (
        <Text muted size="sm">
          No terminal in this workspace. Copy still works.
        </Text>
      )}

      {message ? <Callout tone={message.tone}>{message.text}</Callout> : null}

      {form ? <Editor value={form} /> : null}

      <Input
        label="Search"
        labelHidden
        type="search"
        placeholder="Search snippets"
        value={q}
        onChange={(value) => set(query, value)}
      />

      {shown.length === 0 ? (
        <EmptyState
          icon="search"
          title={all.length === 0 ? 'No snippets yet' : 'No matches'}
          description={all.length === 0 ? 'Press + to save your first one.' : `Nothing matches "${q}".`}
        />
      ) : (
        <Stack gap="sm">
          {shown.map((s) => (
            <SnippetCard key={s.id} snippet={s} />
          ))}
        </Stack>
      )}
    </Stack>
  )
}
