(function () {
  const E = App.esc;
  const $ = (id) => document.getElementById(id);
  const state = { type: '', when: '', sort: 'date_asc' };
  let items = [];

  const card = (x) => {
    const past = x.days_left < 0;
    return `<div class="task ${past ? 'done' : ''}" style="--c:${E(x.subject_color || '#c59be8')}" data-id="${x.id}">
      <div class="body"><div class="t-title">${E(x.title)}</div>
        <div class="meta"><span class="badge blue">${App.L.examType[x.type]}</span>
          ${x.subject_name ? `<span class="chip" style="--c:${E(x.subject_color)}">${E(x.subject_name)}</span>` : ''}
          <span>${App.ic('calendar')} ${E(App.fmtDate(x.exam_date))}${x.exam_time ? ' · ' + App.hhmm(x.exam_time) : ''}</span>
          <span class="badge ${past ? '' : x.days_left <= 3 ? 'red' : 'orange'}">${App.relDays(x.days_left)}</span></div>
        ${x.description ? `<div class="small muted" style="margin-top:6px;overflow-wrap:anywhere">${E(x.description)}</div>` : ''}</div>
      <div class="actions"><select data-act="prep" aria-label="Дайындық күйі">${Object.entries(App.L.prep).map(([v, l]) => `<option value="${v}" ${v === x.prep_status ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <button type="button" class="btn-icon" data-act="edit" aria-label="Өңдеу">${App.ic('pencil')}</button>
        <button type="button" class="btn-icon danger" data-act="delete" aria-label="Жою">${App.ic('trash-2')}</button></div></div>`;
  };

  async function load() {
    const box = $('list'); App.loading(box);
    try {
      items = await Api.get('/exams', state);
      if (!items.length) App.empty(box, 'graduation-cap', 'Жазба табылмады', 'Жаңа емтихан немесе тапсырма қосыңыз.');
      else box.innerHTML = items.map(card).join('');
      App.icons();
    } catch (e) { App.error(box, e.message, load); }
  }

  App.ready(async () => {
    $('addBtn').addEventListener('click', () => Forms.exam(null, load));
    [['fType', 'type'], ['fWhen', 'when'], ['fSort', 'sort']].forEach(([id, k]) => $(id).addEventListener('change', (e) => { state[k] = e.target.value; load(); }));
    $('list').addEventListener('click', async (e) => {
      const el = e.target.closest('[data-act]'); if (!el || el.tagName === 'SELECT') return;
      const x = items.find((i) => i.id === Number(el.closest('.task').dataset.id));
      if (el.dataset.act === 'edit') Forms.exam(x, load);
      if (el.dataset.act === 'delete' && await App.confirm(`«${x.title}» жазбасын жоясыз ба?`)) {
        try { await Api.del('/exams/' + x.id); App.toast('Жойылды', 'success'); load(); } catch (err) { App.toast(err.message, 'error'); }
      }
    });
    $('list').addEventListener('change', async (e) => {
      if (e.target.dataset.act !== 'prep') return;
      const x = items.find((i) => i.id === Number(e.target.closest('.task').dataset.id));
      try {
        await Api.put('/exams/' + x.id, { title: x.title, subject_id: x.subject_id, type: x.type, exam_date: x.exam_date, exam_time: x.exam_time, description: x.description, prep_status: e.target.value });
        App.toast('Дайындық күйі жаңартылды', 'success'); load();
      } catch (err) { App.toast(err.message, 'error'); load(); }
    });
    await load();
  });
})();
