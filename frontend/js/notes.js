(function () {
  const E = App.esc;
  const $ = (id) => document.getElementById(id);
  const state = { q: '', subject_id: '', sort: 'created_desc' };
  let items = [], timer;

  const card = (n) => `<article class="note ${n.is_pinned ? 'pinned' : ''}" style="--c:${E(n.subject_color || '#f6a55b')}" data-id="${n.id}">
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><h3>${E(n.title)}</h3>
      <button type="button" class="btn-icon" data-act="pin" aria-label="${n.is_pinned ? 'Бекітуді алу' : 'Бекіту'}" title="${n.is_pinned ? 'Бекітуді алу' : 'Бекіту'}" style="${n.is_pinned ? 'background:var(--orange-soft);color:var(--orange-d)' : ''}">${App.ic('pin')}</button></div>
    ${n.subject_name ? `<span class="chip" style="--c:${E(n.subject_color)};align-self:flex-start">${E(n.subject_name)}</span>` : ''}
    <p>${E(n.content || '')}</p>
    <div class="small muted">Құрылған: ${E(App.fmtDT(n.created_at))}<br>Өзгертілген: ${E(App.fmtDT(n.updated_at))}</div>
    <div class="foot"><button type="button" class="btn btn-ghost btn-sm" data-act="edit">${App.ic('pencil')} Өңдеу</button><button type="button" class="btn-icon danger" data-act="delete" aria-label="Жою">${App.ic('trash-2')}</button></div></article>`;

  async function load() {
    const box = $('list'); App.loading(box);
    try {
      items = await Api.get('/notes', state);
      if (!items.length) App.empty(box, 'notebook-pen', state.q || state.subject_id ? 'Жазба табылмады' : 'Жазбалар әлі жоқ', 'Алғашқы жазбаңызды жасаңыз.');
      else box.innerHTML = `<div class="notes-grid">${items.map(card).join('')}</div>`;
      App.icons();
    } catch (e) { App.error(box, e.message, load); }
  }

  App.ready(async () => {
    const subs = await App.subjects().catch(() => []);
    $('fSubject').innerHTML = '<option value="">Барлық пән</option>' + subs.map((s) => `<option value="${s.id}">${E(s.name)}</option>`).join('');
    $('addBtn').addEventListener('click', () => Forms.note(null, load));
    $('q').addEventListener('input', (e) => { clearTimeout(timer); timer = setTimeout(() => { state.q = e.target.value.trim(); load(); }, 300); });
    $('fSubject').addEventListener('change', (e) => { state.subject_id = e.target.value; load(); });
    $('fSort').addEventListener('change', (e) => { state.sort = e.target.value; load(); });
    $('list').addEventListener('click', async (e) => {
      const el = e.target.closest('[data-act]'); if (!el) return;
      const n = items.find((x) => x.id === Number(el.closest('.note').dataset.id));
      try {
        if (el.dataset.act === 'edit') Forms.note(n, load);
        if (el.dataset.act === 'pin') {
          await Api.put('/notes/' + n.id, { title: n.title, subject_id: n.subject_id, content: n.content, is_pinned: !n.is_pinned });
          App.toast(n.is_pinned ? 'Бекіту алынды' : 'Жазба бекітілді', 'success'); load();
        }
        if (el.dataset.act === 'delete' && await App.confirm(`«${n.title}» жазбасын жоясыз ба?`)) {
          await Api.del('/notes/' + n.id); App.toast('Жазба жойылды', 'success'); load();
        }
      } catch (err) { App.toast(err.message, 'error'); }
    });
    await load();
  });
})();
