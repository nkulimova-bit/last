(function () {
  const E = App.esc;
  const $ = (id) => document.getElementById(id);
  const todayDow = ((new Date().getDay() + 6) % 7) + 1;
  const mobile = window.matchMedia('(max-width:900px)').matches;
  let day = mobile ? todayDow : 0;
  let items = [];

  function renderPills() {
    $('dayPills').innerHTML = [`<button type="button" class="pill ${day === 0 ? 'active' : ''}" data-day="0">Апта</button>`]
      .concat(App.DAYS.map((n, i) => `<button type="button" class="pill ${day === i + 1 ? 'active' : ''}" data-day="${i + 1}">${n}</button>`)).join('');
  }

  function render() {
    renderPills();
    const days = day ? [day] : [1, 2, 3, 4, 5, 6, 7];
    const grid = $('grid');
    grid.className = 'tt-week' + (day ? ' single' : '');
    grid.innerHTML = days.map((d) => {
      const list = items.filter((x) => x.day_of_week === d);
      return `<section class="tt-col ${d === todayDow ? 'today' : ''}"><h4>${App.DAYS[d - 1]}<button type="button" class="btn-icon" data-add="${d}" aria-label="Сабақ қосу" title="Сабақ қосу">${App.ic('plus')}</button></h4>
        ${list.map((c) => `<article class="tt-class" style="--c:${E(c.color || c.subject_color)}" data-id="${c.id}">
          <b>${E(c.subject_name)}</b><span>${App.hhmm(c.start_time)}–${App.hhmm(c.end_time)}</span><br>
          <span class="muted">${c.classroom ? 'Ауд. ' + E(c.classroom) : ''}${c.classroom && c.teacher ? ' · ' : ''}${E(c.teacher || '')}</span>
          <div class="row"><button type="button" class="btn-icon" data-act="edit" aria-label="Өңдеу">${App.ic('pencil')}</button><button type="button" class="btn-icon danger" data-act="delete" aria-label="Жою">${App.ic('trash-2')}</button></div></article>`).join('') || '<div class="tt-empty">Әзірге сабақ жоқ</div>'}</section>`;
    }).join('');
    App.icons();
  }

  async function load() {
    App.loading($('grid'));
    try { items = await Api.get('/timetable'); render(); }
    catch (e) { App.error($('grid'), e.message, load); }
  }

  App.ready(async () => {
    $('addBtn').addEventListener('click', () => Forms.classEntry(null, load, { day: day || todayDow }));
    $('dayPills').addEventListener('click', (e) => { const b = e.target.closest('[data-day]'); if (b) { day = Number(b.dataset.day); render(); } });
    $('grid').addEventListener('click', async (e) => {
      const add = e.target.closest('[data-add]');
      if (add) return Forms.classEntry(null, load, { day: Number(add.dataset.add) });
      const el = e.target.closest('[data-act]'); if (!el) return;
      const c = items.find((x) => x.id === Number(el.closest('.tt-class').dataset.id));
      if (el.dataset.act === 'edit') Forms.classEntry(c, load);
      if (el.dataset.act === 'delete' && await App.confirm(`«${c.subject_name}» сабағын кестеден жоясыз ба?`)) {
        try { await Api.del('/timetable/' + c.id); App.toast('Сабақ жойылды', 'success'); load(); } catch (err) { App.toast(err.message, 'error'); }
      }
    });
    await load();
  });
})();
