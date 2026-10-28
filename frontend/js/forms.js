// Бірнеше беттерде қолданылатын форма диалогтары (қайталанбас үшін ортақ файл)
(function () {
  const E = App.esc;
  const fld = (label, inner, req) => `<label class="field"><span>${label}${req ? ' <em>*</em>' : ''}</span>${inner}</label>`;
  const inp = (name, val, attrs = '') => `<input name="${name}" value="${E(val ?? '')}" ${attrs}>`;
  const sel = (name, opts, cur) => `<select name="${name}">${opts.map(([v, l]) => `<option value="${v}" ${String(v) === String(cur) ? 'selected' : ''}>${E(l)}</option>`).join('')}</select>`;
  const subjOpts = (list, cur, blank) => `<option value="">${blank}</option>` + list.map((s) => `<option value="${s.id}" ${String(s.id) === String(cur ?? '') ? 'selected' : ''}>${E(s.name)}</option>`).join('') + '<option value="__new__">＋ Жаңа пән қосу…</option>';
  const subjField = (list, cur, required) => fld('Пән', `<select name="subject_id" data-subject>${subjOpts(list, cur, required ? '— Пәнді таңдаңыз —' : '— Таңдалмаған —')}</select>`, required);
  const done = (cb) => { if (cb) cb(); };
  const entries = (o) => Object.entries(o);

  const Forms = {};

  // Таңдау тізіміндегі «Жаңа пән қосу» әрекетін қосады
  Forms.bindSubject = (modal) => {
    const select = modal.el.querySelector('[data-subject]');
    if (!select) return;
    let prev = select.value;
    const blank = select.options[0].textContent;
    select.addEventListener('change', () => {
      if (select.value !== '__new__') { prev = select.value; return; }
      let created = null;
      Forms.subject(null, (r) => { created = r; }, async () => {
        const list = await App.subjects(true);
        const want = created ? created.id : prev;
        select.innerHTML = subjOpts(list, want, blank);
      });
    });
  };

  Forms.subject = (s, onSaved, onClose) => App.modal({
    title: s ? 'Пәнді өңдеу' : 'Жаңа пән',
    body: fld('Атауы', inp('name', s && s.name, 'maxlength="100"'), true) + fld('Түсі', inp('color', (s && s.color) || '#79d1ae', 'type="color"')),
    onSubmit: async (d) => {
      const r = s ? await Api.put('/subjects/' + s.id, d) : await Api.post('/subjects', d);
      App._subj = null; App.toast('Пән сақталды', 'success'); if (onSaved) onSaved(r);
    },
    onClose,
  });

  Forms.task = async (t, onSaved) => {
    const subs = await App.subjects();
    const m = App.modal({
      title: t ? 'Тапсырманы өңдеу' : 'Жаңа тапсырма',
      body: fld('Тақырып', inp('title', t && t.title, 'maxlength="200"'), true)
        + fld('Сипаттама', `<textarea name="description" maxlength="5000">${E((t && t.description) || '')}</textarea>`)
        + subjField(subs, t && t.subject_id)
        + `<div class="form-row">${fld('Мерзім күні', inp('due_date', (t && t.due_date) || App.todayStr(), 'type="date"'), true)}${fld('Уақыты', inp('due_time', t && t.due_time ? App.hhmm(t.due_time) : '', 'type="time"'))}</div>`
        + `<div class="form-row">${fld('Басымдық', sel('priority', entries(App.L.priority), (t && t.priority) || 'medium'))}${fld('Күйі', sel('status', entries(App.L.status), (t && t.status) || 'todo'))}</div>`,
      onSubmit: async (d) => {
        if (t) await Api.put('/tasks/' + t.id, d); else await Api.post('/tasks', d);
        App.toast('Тапсырма сақталды', 'success'); done(onSaved);
      },
    });
    Forms.bindSubject(m);
  };

  Forms.classEntry = async (c, onSaved, defaults = {}) => {
    const subs = await App.subjects();
    const m = App.modal({
      title: c ? 'Сабақты өңдеу' : 'Жаңа сабақ',
      body: subjField(subs, c && c.subject_id, true)
        + `<div class="form-row">${fld('Оқытушы', inp('teacher', c && c.teacher, 'maxlength="120"'))}${fld('Аудитория', inp('classroom', c && c.classroom, 'maxlength="60"'))}</div>`
        + fld('Апта күні', sel('day_of_week', App.DAYS.map((d, i) => [i + 1, d]), (c && c.day_of_week) || defaults.day || 1))
        + `<div class="form-row">${fld('Басталуы', inp('start_time', c ? App.hhmm(c.start_time) : '09:00', 'type="time"'), true)}${fld('Аяқталуы', inp('end_time', c ? App.hhmm(c.end_time) : '10:30', 'type="time"'), true)}</div>`
        + fld('Түсі', inp('color', (c && (c.color || c.subject_color)) || '#6b9ae3', 'type="color"')),
      onSubmit: async (d) => {
        if (c) await Api.put('/timetable/' + c.id, d); else await Api.post('/timetable', d);
        App.toast('Сабақ сақталды', 'success'); done(onSaved);
      },
    });
    Forms.bindSubject(m);
  };

  Forms.note = async (n, onSaved) => {
    const subs = await App.subjects();
    const m = App.modal({
      title: n ? 'Жазбаны өңдеу' : 'Жаңа жазба', wide: true,
      body: fld('Тақырып', inp('title', n && n.title, 'maxlength="200"'), true)
        + subjField(subs, n && n.subject_id)
        + fld('Мәтін', `<textarea name="content" rows="8" maxlength="20000">${E((n && n.content) || '')}</textarea>`)
        + `<label class="check"><input type="checkbox" name="is_pinned" ${n && n.is_pinned ? 'checked' : ''}> Маңызды жазбаны бекіту</label>`,
      onSubmit: async (d) => {
        if (n) await Api.put('/notes/' + n.id, d); else await Api.post('/notes', d);
        App.toast('Жазба сақталды', 'success'); done(onSaved);
      },
    });
    Forms.bindSubject(m);
  };

  Forms.exam = async (x, onSaved) => {
    const subs = await App.subjects();
    const m = App.modal({
      title: x ? 'Өңдеу' : 'Жаңа емтихан / тапсырма',
      body: fld('Атауы', inp('title', x && x.title, 'maxlength="200"'), true)
        + subjField(subs, x && x.subject_id)
        + fld('Түрі', sel('type', entries(App.L.examType), (x && x.type) || 'exam'), true)
        + `<div class="form-row">${fld('Күні', inp('exam_date', (x && x.exam_date) || App.todayStr(), 'type="date"'), true)}${fld('Уақыты', inp('exam_time', x && x.exam_time ? App.hhmm(x.exam_time) : '', 'type="time"'))}</div>`
        + fld('Сипаттама', `<textarea name="description" maxlength="3000">${E((x && x.description) || '')}</textarea>`)
        + fld('Дайындық күйі', sel('prep_status', entries(App.L.prep), (x && x.prep_status) || 'not_started')),
      onSubmit: async (d) => {
        if (x) await Api.put('/exams/' + x.id, d); else await Api.post('/exams', d);
        App.toast('Сақталды', 'success'); done(onSaved);
      },
    });
    Forms.bindSubject(m);
  };

  Forms.event = (ev, onSaved, defaults = {}) => App.modal({
    title: ev ? 'Оқиғаны өңдеу' : 'Жаңа оқиға',
    body: fld('Атауы', inp('title', ev && ev.title, 'maxlength="200"'), true)
      + fld('Күні', inp('event_date', (ev && ev.event_date) || defaults.date || App.todayStr(), 'type="date"'), true)
      + `<div class="form-row">${fld('Басталуы', inp('start_time', ev && ev.start_time ? App.hhmm(ev.start_time) : '', 'type="time"'))}${fld('Аяқталуы', inp('end_time', ev && ev.end_time ? App.hhmm(ev.end_time) : '', 'type="time"'))}</div>`
      + fld('Сипаттама', `<textarea name="description" maxlength="3000">${E((ev && ev.description) || '')}</textarea>`)
      + fld('Түсі', inp('color', (ev && ev.color) || '#f6a55b', 'type="color"')),
    onSubmit: async (d) => {
      if (ev) await Api.put('/calendar/' + ev.id, d); else await Api.post('/calendar', d);
      App.toast('Оқиға сақталды', 'success'); done(onSaved);
    },
  });

  Forms.grade = async (g, onSaved) => {
    const subs = await App.subjects();
    const m = App.modal({
      title: g ? 'Бағаны өңдеу' : 'Жаңа баға',
      body: subjField(subs, g && g.subject_id, true)
        + fld('Бағалау атауы', inp('title', g && g.title, 'maxlength="200" placeholder="Мысалы: Аралық бақылау"'), true)
        + `<div class="form-row">${fld('Балл', inp('score', g && g.score, 'type="number" min="0" step="0.01" inputmode="decimal"'), true)}${fld('Максималды балл', inp('max_score', g ? g.max_score : 100, 'type="number" min="0.01" step="0.01" inputmode="decimal"'), true)}</div>`
        + fld('Бағалау күні', inp('assessed_on', (g && g.assessed_on) || App.todayStr(), 'type="date"'), true)
        + fld('Пікір (міндетті емес)', `<textarea name="comment" maxlength="1000" style="min-height:70px">${E((g && g.comment) || '')}</textarea>`),
      onSubmit: async (d) => {
        if (g) await Api.put('/grades/' + g.id, d); else await Api.post('/grades', d);
        App.toast('Баға сақталды', 'success'); done(onSaved);
      },
    });
    Forms.bindSubject(m);
  };

  Forms.goal = async (g, onSaved) => {
    const subs = await App.subjects();
    const m = App.modal({
      title: g ? 'Мақсатты өңдеу' : 'Жаңа оқу мақсаты',
      body: fld('Мақсат атауы', inp('title', g && g.title, 'maxlength="200"'), true)
        + subjField(subs, g && g.subject_id)
        + fld('Сипаттама', `<textarea name="description" maxlength="3000" style="min-height:70px">${E((g && g.description) || '')}</textarea>`)
        + `<div class="form-row">${fld('Мақсатты күн', inp('target_date', (g && g.target_date) || App.todayStr(), 'type="date"'), true)}${fld('Мақсатты уақыт (минут)', inp('target_minutes', g ? g.target_minutes : 600, 'type="number" min="1" step="1" inputmode="numeric"'), true)}</div>`,
      onSubmit: async (d) => {
        if (g) await Api.put('/study/goals/' + g.id, d); else await Api.post('/study/goals', d);
        App.toast('Мақсат сақталды', 'success'); done(onSaved);
      },
    });
    Forms.bindSubject(m);
  };

  Forms.session = (s, goals, onSaved, defaultGoalId) => App.modal({
    title: s ? 'Сессияны өңдеу' : 'Жаңа оқу сессиясы',
    body: fld('Мақсат', `<select name="goal_id">${goals.map((g) => `<option value="${g.id}" ${String(g.id) === String((s && s.goal_id) || defaultGoalId) ? 'selected' : ''}>${E(g.title)}</option>`).join('')}</select>`, true)
      + fld('Сессия атауы', inp('title', s && s.title, 'maxlength="200" placeholder="Мысалы: 3-тақырыпты қайталау"'))
      + `<div class="form-row">${fld('Күні', inp('session_date', (s && s.session_date) || App.todayStr(), 'type="date"'), true)}${fld('Ұзақтығы (минут)', inp('duration_minutes', s ? s.duration_minutes : 45, 'type="number" min="1" max="1440" inputmode="numeric"'), true)}</div>`
      + `<label class="check"><input type="checkbox" name="is_completed" ${s && s.is_completed ? 'checked' : ''}> Орындалды</label>`,
    onSubmit: async (d) => {
      if (s) await Api.put('/study/sessions/' + s.id, d); else await Api.post('/study/sessions', d);
      App.toast('Сессия сақталды', 'success'); done(onSaved);
    },
  });

  window.Forms = Forms;
})();
