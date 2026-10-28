(function () {
  const E = App.esc;
  const $ = (id) => document.getElementById(id);
  const state = { q: '', status: '', priority: '', subject_id: '', sort: 'due_asc' };
  let timer;

  const row = (t) => {
    const cls = ['task', t.status === 'done' ? 'done' : '', t.is_overdue ? 'overdue' : ''].join(' ');
    return `<div class="${cls}" style="--c:${E(t.subject_color || '#6b9ae3')}" data-id="${t.id}">
      <button type="button" class="check-btn ${t.status === 'done' ? 'on' : ''}" data-act="toggle" aria-label="Орындалды деп белгілеу" title="Орындалды деп белгілеу">${t.status === 'done' ? App.ic('check') : ''}</button>
      <div class="body"><div class="t-title">${E(t.title)}</div>
        <div class="meta">
          ${t.subject_name ? `<span class="chip" style="--c:${E(t.subject_color)}">${E(t.subject_name)}</span>` : ''}
          <span>${App.ic('calendar')} ${E(App.fmtDate(t.due_date))}${t.due_time ? ' · ' + App.hhmm(t.due_time) : ''}</span>
          <span class="badge ${t.priority}">${App.L.priority[t.priority]}</span>
          ${t.is_overdue ? '<span class="badge red">Мерзімі өтті</span>' : ''}
        </div>
        ${t.description ? `<div class="small muted" style="margin-top:6px;white-space:pre-wrap;overflow-wrap:anywhere">${E(t.description)}</div>` : ''}
      </div>
      <div class="actions">
        <select data-act="status" aria-label="Күйі">${Object.entries(App.L.status).map(([v, l]) => `<option value="${v}" ${v === t.status ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <button type="button" class="btn-icon" data-act="edit" aria-label="Өңдеу" title="Өңдеу">${App.ic('pencil')}</button>
        <button type="button" class="btn-icon danger" data-act="delete" aria-label="Жою" title="Жою">${App.ic('trash-2')}</button>
      </div></div>`;
  };

  let items = [];
  async function load() {
    const box = $('list');
    App.loading(box);
    try {
      items = await Api.get('/tasks', state);
      $('count').textContent = `Табылған тапсырмалар: ${items.length}`;
      if (!items.length) {
        const filtered = state.q || state.status || state.priority || state.subject_id;
        App.empty(box, 'list-checks', filtered ? 'Ештеңе табылмады' : 'Тапсырмалар әлі жоқ', filtered ? 'Сүзгілерді өзгертіп көріңіз.' : '«Тапсырма қосу» батырмасын басыңыз.');
      } else box.innerHTML = items.map(row).join('');
      App.icons();
    } catch (e) { App.error(box, e.message, load); }
  }

  App.ready(async () => {
    const subs = await App.subjects().catch(() => []);
    $('fSubject').innerHTML = '<option value="">Барлық пән</option>' + subs.map((s) => `<option value="${s.id}">${E(s.name)}</option>`).join('');
    $('addBtn').addEventListener('click', () => Forms.task(null, load));
    $('q').addEventListener('input', (e) => { clearTimeout(timer); timer = setTimeout(() => { state.q = e.target.value.trim(); load(); }, 300); });
    [['fStatus', 'status'], ['fPriority', 'priority'], ['fSubject', 'subject_id'], ['fSort', 'sort']].forEach(([id, key]) =>
      $(id).addEventListener('change', (e) => { state[key] = e.target.value; load(); }));

    $('list').addEventListener('click', async (e) => {
      const el = e.target.closest('[data-act]'); if (!el || el.tagName === 'SELECT') return;
      const id = Number(el.closest('.task').dataset.id);
      const t = items.find((x) => x.id === id);
      try {
        if (el.dataset.act === 'toggle') { await Api.patch(`/tasks/${id}/status`, { status: t.status === 'done' ? 'todo' : 'done' }); load(); }
        if (el.dataset.act === 'edit') Forms.task(t, load);
        if (el.dataset.act === 'delete' && await App.confirm(`«${t.title}» тапсырмасын жоясыз ба?`)) {
          await Api.del('/tasks/' + id); App.toast('Тапсырма жойылды', 'success'); load();
        }
      } catch (err) { App.toast(err.message, 'error'); }
    });
    $('list').addEventListener('change', async (e) => {
      if (e.target.dataset.act !== 'status') return;
      const id = Number(e.target.closest('.task').dataset.id);
      try { await Api.patch(`/tasks/${id}/status`, { status: e.target.value }); App.toast('Күйі жаңартылды', 'success'); load(); }
      catch (err) { App.toast(err.message, 'error'); load(); }
    });
    await load();
  });
})();
