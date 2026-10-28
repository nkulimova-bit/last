(function () {
  const E = App.esc;
  const $ = (id) => document.getElementById(id);
  const today = App.todayStr();
  let view = 'month';
  let cursor = App.parse(today);   // көрсетіліп тұрған ай/апта күні
  let selected = today;
  let data = { events: [], tasks: [], exams: [], timetable: [] };
  let byDate = {};

  const mondayOf = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

  function range() {
    if (view === 'week') { const s = mondayOf(cursor); return [s, addDays(s, 6)]; }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    return [mondayOf(first), addDays(mondayOf(last), 6)];
  }

  function build(from, to) {
    byDate = {};
    const push = (k, it) => { (byDate[k] = byDate[k] || []).push(it); };
    data.events.forEach((e) => push(e.event_date, { kind: 'event', title: e.title, time: App.hhmm(e.start_time), color: e.color, raw: e }));
    data.tasks.forEach((t) => push(t.due_date, { kind: 'task', title: t.title, time: App.hhmm(t.due_time), color: t.status === 'done' ? '#79d1ae' : '#e88a33', raw: t }));
    data.exams.forEach((x) => push(x.exam_date, { kind: 'exam', title: x.title, time: App.hhmm(x.exam_time), color: '#c59be8', raw: x }));
    for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
      const dow = ((d.getDay() + 6) % 7) + 1;
      data.timetable.filter((c) => c.day_of_week === dow).forEach((c) =>
        push(App.toStr(d), { kind: 'class', title: c.subject_name, time: App.hhmm(c.start_time), color: c.color || c.subject_color, raw: c }));
    }
    Object.values(byDate).forEach((a) => a.sort((x, y) => (x.time || '99').localeCompare(y.time || '99')));
  }

  function chip(it, i, key) {
    return `<button type="button" class="cal-chip" style="--c:${E(it.color)}" data-key="${key}" data-i="${i}">${it.time ? it.time + ' ' : ''}${E(it.title)}</button>`;
  }

  function render() {
    const [from, to] = range();
    $('title').textContent = view === 'month'
      ? `${App.MONTHS_N[cursor.getMonth()]} ${cursor.getFullYear()}`
      : `${App.fmtShort(App.toStr(from))} – ${App.fmtDate(App.toStr(to))}`;
    $('mBtn').classList.toggle('active', view === 'month');
    $('wBtn').classList.toggle('active', view === 'week');
    const cells = [];
    for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
      const k = App.toStr(d); const list = byDate[k] || [];
      const limit = view === 'week' ? 99 : 3;
      cells.push(`<div class="cal-cell ${d.getMonth() !== cursor.getMonth() && view === 'month' ? 'other' : ''} ${k === today ? 'today' : ''} ${k === selected ? 'sel' : ''}" data-date="${k}" role="button" tabindex="0" aria-label="${App.fmtDate(k)}">
        <span class="num">${d.getDate()}</span>
        ${list.slice(0, limit).map((it, i) => chip(it, i, k)).join('')}
        ${list.length > limit ? `<div class="cal-more">+${list.length - limit} тағы</div>` : ''}
        <div class="cal-dots">${list.slice(0, 6).map((it) => `<i style="--c:${E(it.color)}"></i>`).join('')}</div></div>`);
    }
    $('grid').className = 'cal-grid ' + (view === 'week' ? 'cal-week' : '');
    $('grid').innerHTML = App.DAYS_S.map((n) => `<div class="cal-dow">${n}</div>`).join('') + cells.join('');
    renderAgenda();
    App.icons();
  }

  const KIND = { event: ['Оқиға', 'orange'], task: ['Тапсырма', 'blue'], exam: ['Емтихан', 'red'], class: ['Сабақ', 'mint'] };
  function renderAgenda() {
    const list = byDate[selected] || [];
    $('agendaTitle').textContent = App.fmtDate(selected);
    $('agenda').innerHTML = list.length ? list.map((it, i) => `
      <button type="button" class="list-item" style="--c:${E(it.color)};width:100%;text-align:left;border-top:0;border-right:0;border-bottom:0;cursor:pointer" data-key="${selected}" data-i="${i}">
        <div class="grow"><b>${E(it.title)}</b><small>${KIND[it.kind][0]}${it.time ? ' · ' + it.time : ''}</small></div><span class="badge ${KIND[it.kind][1]}">${KIND[it.kind][0]}</span></button>`).join('')
      : '<div class="state"><b>Бұл күні жазба жоқ</b><span>«Оқиға қосу» арқылы жаңа оқиға жасаңыз.</span></div>';
  }

  function details(it) {
    const r = it.raw; let body = '';
    const row = (a, b) => (b ? `<p style="margin:0 0 8px"><b>${a}:</b> ${E(b)}</p>` : '');
    if (it.kind === 'event') body = row('Күні', App.fmtDate(r.event_date)) + row('Уақыты', [App.hhmm(r.start_time), App.hhmm(r.end_time)].filter(Boolean).join('–')) + row('Сипаттама', r.description);
    if (it.kind === 'task') body = row('Мерзім', App.fmtDate(r.due_date) + (r.due_time ? ' ' + App.hhmm(r.due_time) : '')) + row('Басымдық', App.L.priority[r.priority]) + row('Күйі', App.L.status[r.status]) + '<p style="margin:12px 0 0"><a class="btn btn-ghost btn-sm" href="tasks.html">Тапсырмаларға өту</a></p>';
    if (it.kind === 'exam') body = row('Түрі', App.L.examType[r.type]) + row('Күні', App.fmtDate(r.exam_date) + (r.exam_time ? ' ' + App.hhmm(r.exam_time) : '')) + row('Пән', r.subject_name) + row('Сипаттама', r.description) + '<p style="margin:12px 0 0"><a class="btn btn-ghost btn-sm" href="exams.html">Емтихандарға өту</a></p>';
    if (it.kind === 'class') body = row('Күні', App.DAYS[r.day_of_week - 1]) + row('Уақыты', `${App.hhmm(r.start_time)}–${App.hhmm(r.end_time)}`) + row('Аудитория', r.classroom) + row('Оқытушы', r.teacher) + '<p style="margin:12px 0 0"><a class="btn btn-ghost btn-sm" href="timetable.html">Кестеге өту</a></p>';
    const m = App.modal({ title: it.title, body: `<p><span class="badge ${KIND[it.kind][1]}">${KIND[it.kind][0]}</span></p>${body}`, hideFoot: it.kind !== 'event', submitText: 'Өңдеу' ,
      onSubmit: async () => { setTimeout(() => Forms.event(r, load), 0); } });
    if (it.kind === 'event') {
      const del = document.createElement('button');
      del.type = 'button'; del.className = 'btn btn-danger'; del.textContent = 'Жою';
      m.el.querySelector('.modal-foot').prepend(del);
      del.addEventListener('click', async () => {
        if (!(await App.confirm(`«${r.title}» оқиғасын жоясыз ба?`))) return;
        try { await Api.del('/calendar/' + r.id); m.close(); App.toast('Оқиға жойылды', 'success'); load(); } catch (e) { App.toast(e.message, 'error'); }
      });
    }
  }

  async function load() {
    const [from, to] = range();
    App.loading($('agenda'));
    try {
      data = await Api.get('/calendar', { from: App.toStr(from), to: App.toStr(to) });
      build(from, to); render();
    } catch (e) { App.error($('agenda'), e.message, load); }
  }

  App.ready(async () => {
    const shift = (n) => {
      cursor = view === 'month' ? new Date(cursor.getFullYear(), cursor.getMonth() + n, 1) : addDays(cursor, 7 * n);
      load();
    };
    $('prev').addEventListener('click', () => shift(-1));
    $('next').addEventListener('click', () => shift(1));
    $('todayBtn').addEventListener('click', () => { cursor = App.parse(today); selected = today; load(); });
    $('mBtn').addEventListener('click', () => { view = 'month'; load(); });
    $('wBtn').addEventListener('click', () => { view = 'week'; load(); });
    $('addEvent').addEventListener('click', () => Forms.event(null, load, { date: selected }));
    $('grid').addEventListener('click', (e) => {
      const ch = e.target.closest('.cal-chip');
      if (ch) { e.stopPropagation(); return details(byDate[ch.dataset.key][Number(ch.dataset.i)]); }
      const cell = e.target.closest('[data-date]');
      if (cell) { selected = cell.dataset.date; render(); }
    });
    $('grid').addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.date) { e.preventDefault(); selected = e.target.dataset.date; render(); }
    });
    $('agenda').addEventListener('click', (e) => {
      const b = e.target.closest('[data-key]'); if (b) details(byDate[b.dataset.key][Number(b.dataset.i)]);
    });
    await load();
  });
})();
