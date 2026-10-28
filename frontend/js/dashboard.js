(function () {
  const E = App.esc;
  const $ = (id) => document.getElementById(id);
  let data;

  function greeting() {
    const h = new Date().getHours();
    return h < 5 ? 'Қайырлы түн' : h < 12 ? 'Қайырлы таң' : h < 18 ? 'Қайырлы күн' : 'Қайырлы кеш';
  }

  function render() {
    const d = data; const t = d.tasks;
    const dt = App.parse(d.today);
    const first = (d.user.full_name || '').split(' ')[0];
    const msg = t.overdue ? `Мерзімі өткен ${t.overdue} тапсырма бар — соларды бірінші орындаңыз.`
      : t.pending ? `Орындалуды күтетін ${t.pending} тапсырма бар. Сәттілік!`
      : t.total ? 'Барлық тапсырма орындалды. Керемет жұмыс!' : 'Алғашқы тапсырмаңызды қосып бастаңыз.';
    $('welcome').innerHTML = `<div><h2>${greeting()}, ${E(first)}!</h2><p>${E(msg)}</p></div>
      <div class="big-date"><b>${dt.getDate()}</b>${E(App.MONTHS_N[dt.getMonth()])}<br><small>${E(App.DAYS[d.weekday - 1])}</small></div>`;

    const stat = (icon, cls, n, label) => `<div class="card stat"><span class="ico ${cls}">${App.ic(icon)}</span><div><b>${n}</b><span>${label}</span></div></div>`;
    $('stats').innerHTML = stat('list-todo', 'blue', t.total, 'Барлық тапсырма') + stat('circle-check', 'mint', t.done, 'Орындалды')
      + stat('clock', 'orange', t.pending, 'Күтіп тұр') + stat('alarm-clock-off', 'red', t.overdue, 'Мерзімі өткен');

    $('todayList').innerHTML = d.today_classes.length ? d.today_classes.map((c) => `
      <div class="list-item" style="--c:${E(c.color || c.subject_color)}"><div class="grow"><b>${E(c.subject_name)}</b>
      <small>${E(c.classroom ? 'Ауд. ' + c.classroom : '')}${c.classroom && c.teacher ? ' · ' : ''}${E(c.teacher || '')}</small></div>
      <span class="time-badge">${App.hhmm(c.start_time)}–${App.hhmm(c.end_time)}</span></div>`).join('')
      : '<div class="state">' + App.ic('coffee') + '<b>Бүгін сабақ жоқ</b><span>Демалыс күніңіз құтты болсын!</span></div>';

    // Прогресс
    const g = d.grades;
    $('metrics').innerHTML = `
      <div class="metric"><span>Орташа баға</span><b>${App.fmtPct(g.overall_percent)}</b></div>
      <div class="metric"><span>Осы аптадағы оқу уақыты</span><b>${App.fmtMin(d.study.week_minutes)}</b></div>
      <div class="metric"><span>Алдағы емтихан</span><b>${d.exams.length ? App.relDays(d.exams[0].days_left) : '—'}</b></div>`;
    $('donutPct').textContent = t.completion_percent + '%';
    App.chart('donut', {
      type: 'doughnut',
      data: { labels: ['Орындалды', 'Қалды'], datasets: [{ data: [t.done, Math.max(t.total - t.done, 0) || (t.total ? 0 : 1)], backgroundColor: ['#79d1ae', '#e8e1d0'], borderWidth: 0 }] },
      options: { cutout: '78%', plugins: { legend: { display: false }, tooltip: { enabled: !!t.total } } },
    });

    $('deadlines').innerHTML = d.deadlines.length ? d.deadlines.map((x) => `
      <a class="list-item" href="tasks.html" style="--c:${x.is_overdue ? 'var(--red)' : 'var(--orange)'}"><div class="grow"><b>${E(x.title)}</b>
      <small>${E(x.subject_name || 'Пәнсіз')} · ${E(App.fmtShort(x.due_date))}${x.due_time ? ' ' + App.hhmm(x.due_time) : ''}</small></div>
      ${x.is_overdue ? '<span class="badge red">Мерзімі өтті</span>' : `<span class="badge ${x.priority}">${App.L.priority[x.priority]}</span>`}</a>`).join('')
      : '<div class="state">' + App.ic('party-popper') + '<b>Жақын мерзімдер жоқ</b><span>Барлығы уақтылы орындалған.</span></div>';

    $('examList').innerHTML = d.exams.length ? d.exams.map((x) => `
      <a class="list-item" href="exams.html" style="--c:var(--purple)"><div class="grow"><b>${E(x.title)}</b>
      <small>${E(App.L.examType[x.type])} · ${E(App.fmtShort(x.exam_date))}${x.exam_time ? ' ' + App.hhmm(x.exam_time) : ''}</small></div>
      <span class="badge ${x.days_left <= 3 ? 'red' : 'blue'}">${App.relDays(x.days_left)}</span></a>`).join('')
      : '<div class="state">' + App.ic('graduation-cap') + '<b>Алдағы емтихан жоқ</b></div>';

    $('weekGrid').innerHTML = App.DAYS.map((name, i) => {
      const items = d.week_schedule.filter((c) => c.day_of_week === i + 1);
      return `<div class="week-day ${i + 1 === d.weekday ? 'today' : ''}"><h4>${name}</h4>${items.map((c) => `
        <div class="mini-class" style="--c:${E(c.color || c.subject_color)}"><b>${E(c.subject_name)}</b>${App.hhmm(c.start_time)}–${App.hhmm(c.end_time)}</div>`).join('') || '<small class="muted">—</small>'}</div>`;
    }).join('');
    App.icons();
  }

  async function load() {
    try {
      data = await Api.get('/dashboard');
      render();
    } catch (e) {
      ['welcome', 'stats', 'todayList', 'deadlines', 'examList', 'weekGrid'].forEach((id) => App.error($(id), e.message, load));
    }
  }

  App.ready(async () => {
    ['todayList', 'deadlines', 'examList', 'weekGrid'].forEach((id) => App.loading($(id)));
    $('qTask').addEventListener('click', () => Forms.task(null, load));
    $('qClass').addEventListener('click', () => Forms.classEntry(null, load));
    $('qNote').addEventListener('click', () => Forms.note(null, load));
    $('qExam').addEventListener('click', () => Forms.exam(null, load));
    document.addEventListener('themechange', () => { if (data) render(); });
    await load();
  });
})();
