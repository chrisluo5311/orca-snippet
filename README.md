# Snippets for Orca

A right-sidebar panel for saving reusable commands and prompts, then sending them to a terminal or copying them.

- **+**: add a snippet (name and content). Ctrl+Enter in the content box saves.
- **Run**: types the snippet into the chosen terminal and presses Enter.
- **Insert** (terminal icon): types it without pressing Enter, so you can edit it first.
- **Copy**: puts it on the OS clipboard (Windows `Set-Clipboard`, macOS `pbcopy`, Linux `wl-copy`/`xclip`/`xsel`).
- **Send to**: picks which of the workspace's terminals gets the text. The choice is remembered per workspace.
- Search filters by name and content. Delete asks you to confirm.

Snippets are saved in the plugin's own data folder and survive Orca restarts.

## Why it needs a worker

Components panels run sandboxed: they cannot call `terminal.sendText` or reach the clipboard. `src/worker.ts`
handles both on the panel's behalf through `plugin.request` (contract in `src/protocol.ts`).

## Develop

```sh
orca plugin dev watch .     # load and hot-reload while editing
orca plugin test .          # unit tests (Node)
orca plugin check .         # render every scenario in src/panel.check.ts
orca plugin validate .
```

## Publish

Push to a public GitHub repository, then:

```sh
gh repo edit --add-topic orca-plugin
git tag v0.1.0 && git push origin v0.1.0
```

It shows up at `https://www.onorca.dev/plugins/<owner>/<repo>`.
