(function () {
  const E = App.esc;
  const $ = (id) => document.getElementById(id);
  let goals = [], sessions = [], summary;

  function render() {
    $('totalTime').textContent = App.fmtMin(summary.total_minutes);
    $('weekTime').textContent = App.fmtMin(summary.week_minutes);
    $('goalCount').textContent = goals.length;

    const ws = App.parse(summary.week_start);
    const labels = App.DAYS_S; const vals = labels.map((_, i) => {
      const k = App.toStr(new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + i));
      const d = summary.days.find((x) => x.date === k); return d ? d.minutes : 0;
    });
    App.chart('weekChart', { type: 'bar', data: { labels, datasets: [{ label: 'Минут', data: vals, backgroundColor: '#79d1ae', borderRadius: 10 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } } });

    const box = $('goals');
    if (!goals.length) { App.empty(box, 'target', 'Оқу мақсаттары әлі жоқ', '«Мақсат қосу» батырмасын басып жоспарлауды бастаңыз.'); return; }
    box.innerHTML = goals.map((g) => {
      const pct = Math.min(100, Math.round((g.done_minutes / g.target_minutes) * 100));
      const list = sessions.filter((s) => s.goal_id === g.id);
      return `<section class="card goal" data-goal="${g.id}">
        <div class="card-head"><div><h2>${E(g.title)}</h2><div class="meta">${g.subject_name ? `<span class="chip" style="--c:${E(g.subject_color)}">${E(g.subject_name)}</span>` : ''}<span>${App.ic('flag')} ${E(App.fmtDate(g.target_date))} · ${App.relDays(g.days_left)}</span></div></div>
          <div style="display:flex;gap:6px"><button type="button" class="btn btn-mint btn-sm" data-act="addSession">${App.ic('plus')} Сессия</button>
          <button type="button" class="btn-icon" data-act="editGoal" aria-label="Өңдеу">${App.ic('pencil')}</button><button type="button" class="btn-icon danger" data-act="delGoal" aria-label="Жою">${App.ic('trash-2')}</button></div></div>
        ${g.description ? `<p class="muted small" style="margin-top:0">${E(g.description)}</p>` : ''}
        <div class="meta" style="margin:0 0 6px"><b>${pct}%</b> · ${App.fmtMin(g.done_minutes)} / ${App.fmtMin(g.target_minutes)} · сессия: ${g.sessions_done}/${g.sessions_count}</div>
        <div class="progress"><i style="width:${pct}%"></i></div>
        <div class="sessions">${list.map((s) => `<div class="session ${s.is_completed ? 'done' : ''}" data-id="${s.id}">
          <button type="button" class="check-btn ${s.is_completed ? 'on' : ''}" data-act="toggle" aria-label="Орындалды деп белгілеу">${s.is_completed ? App.ic('check') : ''}</button>
          <div class="grow"><b>${E(s.title || 'Оқу сессиясы')}</b> <small class="muted">${E(App.fmtShort(s.session_date))} · ${App.fmtMin(s.duration_minutes)}</small></div>
          <button type="button" class="btn-icon" data-act="editSession" aria-label="Өңдеу">${App.ic('pencil')}</button><button type="button" class="btn-icon danger" data-act="delSession" aria-label="Жою">${App.ic('trash-2')}</button></div>`).join('') || '<small class="muted">Сессиялар әлі жоқ</small>'}</div></section>`;
    }).join('');
    App.icons();
  }

  async function load() {
    App.loading($('goals'));
    try {
      [goals, sessions, summary] = await Promise.all([Api.get('/study/goals'), Api.get('/study/sessions'), Api.get('/study/summary')]);
      render();
    } catch (e) { App.error($('goals'), e.message, load); }
  }

  App.ready(async () => {
    $('addGoal').addEventListener('click', () => Forms.goal(null, load));
    document.addEventListener('themechange', () => { if (summary) render(); });
    $('goals').addEventListener('click', async (e) => {
      const el = e.target.closest('[data-act]'); if (!el) return;
      const gid = Number(el.closest('[data-goal]').dataset.goal);
      const g = goals.find((x) => x.id === gid);
      const sEl = el.closest('.session'); const s = sEl && sessions.find((x) => x.id === Number(sEl.dataset.id));
      try {
        switch (el.dataset.act) {
          case 'addSession': Forms.session(null, goals, load, gid); break;
          case 'editGoal': Forms.goal(g, load); break;
          case 'delGoal': if (await App.confirm(`«${g.title}» мақсаты және оның барлық сессиялары жойылады. Жалғастырасыз ба?`)) { await Api.del('/study/goals/' + gid); App.toast('Мақсат жойылды', 'success'); load(); } break;
          case 'editSession': Forms.session(s, goals, load); break;
          case 'delSession': if (await App.confirm('Сессияны жоясыз ба?')) { await Api.del('/study/sessions/' + s.id); App.toast('Сессия жойылды', 'success'); load(); } break;
          case 'toggle':
            await Api.put('/study/sessions/' + s.id, { goal_id: s.goal_id, title: s.title, session_date: s.session_date, duration_minutes: s.duration_minutes, is_completed: !s.is_completed });
            load(); break;
          default:
        }
      } catch (err) { App.toast(err.message, 'error'); }
    });
    await load();
  });
})();
