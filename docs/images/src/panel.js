// Draws the Snippets panel into `el` from plain data. Icons are Lucide's, as Orca uses.
const ICONS = {
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  terminal: '<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  edit: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
  delete: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  add: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>'
}
const icon = (name) => `<svg viewBox="0 0 24 24">${ICONS[name]}</svg>`
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

function drawPanel(el, { terminal, snippets }) {
  el.classList.add('panel')
  el.innerHTML = `
    <div class="head">
      <div class="title">Snippets <span class="badge">${snippets.length}</span></div>
      <div class="add">${icon('add')}</div>
    </div>
    <div class="field">
      <label>Target terminal</label>
      <div class="select">${esc(terminal)} ${icon('chevron')}</div>
    </div>
    <div class="search">Search snippets</div>
    <div class="cards">
      ${snippets
        .map(
          (s) => `
        <div class="card">
          <div class="name">${esc(s.name)}</div>
          <div class="code">${esc(s.body)}</div>
          <div class="actions">
            <span class="btn solid">${icon('play')}Run</span>
            <span class="btn outline">${icon('terminal')}</span>
            <span class="btn">${icon('copy')}</span>
            <span class="btn">${icon('edit')}</span>
            <span class="btn danger">${icon('delete')}</span>
          </div>
        </div>`
        )
        .join('')}
    </div>`
}
