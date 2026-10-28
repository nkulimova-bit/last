(function () {
  const E = App.esc;
  const $ = (id) => document.getElementById(id);
  let grades = [], summary;

  function level(p) { return p >= 85 ? 'mint' : p >= 60 ? 'blue' : p >= 40 ? 'orange' : 'red'; }

  function render() {
    const s = summary;
    $('overall').textContent = App.fmtPct(s.overall_percent);
    $('gcount').textContent = s.grades_count;
    $('scount').textContent = s.subjects.length;

    if (!grades.length) {
      App.empty($('groups'), 'award', 'Бағалар әлі жоқ', '«Баға қосу» батырмасы арқылы алғашқы бағаңызды енгізіңіз.');
      $('chartsRow').hidden = true; return;
    }
    $('chartsRow').hidden = false;

    const bySubject = {};
    grades.forEach((g) => { (bySubject[g.subject_id] = bySubject[g.subject_id] || { name: g.subject_name, color: g.subject_color, list: [] }).list.push(g); });
    $('groups').innerHTML = Object.entries(bySubject).map(([id, grp]) => {
      const sm = s.subjects.find((x) => String(x.subject_id) === id);
      return `<section class="card" style="margin-bottom:var(--sp-4)"><div class="card-head"><h2><span class="chip" style="--c:${E(grp.color)}">${E(grp.name)}</span></h2>
        <span class="badge ${level(sm ? sm.avg_percent : 0)}">Орташа: ${App.fmtPct(sm && sm.avg_percent)}</span></div>
        ${grp.list.map((g) => `<div class="grade-row" data-id="${g.id}"><div><b>${E(g.title)}</b><div class="small muted">${E(App.fmtDate(g.assessed_on))}${g.comment ? ' · ' + E(g.comment) : ''}</div></div>
          <div style="text-align:right"><div class="pct">${App.fmtPct(g.percent)}</div><div class="small muted">${g.score} / ${g.max_score}</div></div>
          <div class="actions" style="display:flex;gap:6px"><button type="button" class="btn-icon" data-act="edit" aria-label="Өңдеу">${App.ic('pencil')}</button><button type="button" class="btn-icon danger" data-act="delete" aria-label="Жою">${App.ic('trash-2')}</button></div></div>`).join('')}</section>`;
    }).join('');

    App.chart('subjChart', {
      type: 'bar',
      data: { labels: s.subjects.map((x) => x.name), datasets: [{ label: 'Орташа, %', data: s.subjects.map((x) => x.avg_percent), backgroundColor: s.subjects.map((x) => x.color), borderRadius: 10 }] },
      options: { scales: { y: { min: 0, max: 100 } }, plugins: { legend: { display: false } } },
    });
    const asc = [...grades].sort((a, b) => a.assessed_on.localeCompare(b.assessed_on) || a.id - b.id);
    App.chart('trendChart', {
      type: 'line',
      data: { labels: asc.map((g) => App.fmtShort(g.assessed_on)), datasets: [{ label: 'Баға, %', data: asc.map((g) => g.percent), borderColor: '#6b9ae3', backgroundColor: 'rgba(107,154,227,.18)', fill: true, tension: .3, pointRadius: 4 }] },
      options: { scales: { y: { min: 0, max: 100 } }, plugins: { legend: { display: false } } },
    });
    App.icons();
  }

  async function load() {
    App.loading($('groups'));
    try {
      [grades, summary] = await Promise.all([Api.get('/grades', { subject_id: $('fSubject').value }), Api.get('/grades/summary')]);
      render();
    } catch (e) { App.error($('groups'), e.message, load); }
  }

  App.ready(async () => {
    const subs = await App.subjects().catch(() => []);
    $('fSubject').innerHTML = '<option value="">Барлық пән</option>' + subs.map((s) => `<option value="${s.id}">${E(s.name)}</option>`).join('');
    $('fSubject').addEventListener('change', load);
    $('addBtn').addEventListener('click', () => Forms.grade(null, load));
    document.addEventListener('themechange', () => { if (summary) render(); });
    $('groups').addEventListener('click', async (e) => {
      const el = e.target.closest('[data-act]'); if (!el) return;
      const g = grades.find((x) => x.id === Number(el.closest('.grade-row').dataset.id));
      if (el.dataset.act === 'edit') Forms.grade(g, load);
      if (el.dataset.act === 'delete' && await App.confirm(`«${g.title}» бағасын жоясыз ба?`)) {
        try { await Api.del('/grades/' + g.id); App.toast('Баға жойылды', 'success'); load(); } catch (err) { App.toast(err.message, 'error'); }
      }
    });
    await load();
  });
})();
