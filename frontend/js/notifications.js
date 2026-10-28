(function () {
  const E = App.esc;
  const $ = (id) => document.getElementById(id);
  let items = [];
  const ICON = { task_overdue: ['alarm-clock-off', 'red'], task_due: ['clock', 'orange'], exam_upcoming: ['graduation-cap', 'blue'] };

  function render(unread) {
    App.setBadge(unread);
    $('unread').textContent = unread ? `Оқылмаған: ${unread}` : 'Барлығы оқылған';
    const box = $('list');
    if (!items.length) { App.empty(box, 'bell-ring', 'Жаңа хабарландыру жоқ', 'Мерзімі жақын тапсырмалар мен емтихандар осында көрінеді.'); return; }
    box.innerHTML = items.map((n) => `<div class="notif ${n.is_read ? '' : 'unread'}" data-id="${n.id}">
      <span class="ico ${ICON[n.type][1]}" style="width:42px;height:42px;border-radius:14px;display:grid;place-items:center;flex:none">${App.ic(ICON[n.type][0])}</span>
      <div class="grow"><div class="small muted">${E(n.type_label)}</div><b style="overflow-wrap:anywhere">${E(n.title)}</b><div class="small muted">${E(n.message)}</div></div>
      <div style="display:flex;gap:6px">${n.is_read ? '' : `<button type="button" class="btn-icon" data-act="read" aria-label="Оқылды деп белгілеу" title="Оқылды деп белгілеу">${App.ic('check')}</button>`}
        <button type="button" class="btn-icon danger" data-act="dismiss" aria-label="Жою" title="Жою">${App.ic('x')}</button></div></div>`).join('');
    App.icons();
  }

  async function load() {
    App.loading($('list'));
    try { const d = await Api.get('/notifications'); items = d.items; render(d.unread_count); }
    catch (e) { App.error($('list'), e.message, load); }
  }

  App.ready(async () => {
    $('readAll').addEventListener('click', async () => {
      try { await Api.patch('/notifications/read-all'); load(); } catch (e) { App.toast(e.message, 'error'); }
    });
    $('list').addEventListener('click', async (e) => {
      const el = e.target.closest('[data-act]'); if (!el) return;
      const id = el.closest('.notif').dataset.id;
      try {
        if (el.dataset.act === 'read') await Api.patch(`/notifications/${id}/read`);
        if (el.dataset.act === 'dismiss') await Api.del('/notifications/' + id);
        load();
      } catch (err) { App.toast(err.message, 'error'); }
    });
    await load();
  });
})();
