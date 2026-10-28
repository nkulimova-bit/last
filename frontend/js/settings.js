(function () {
  const E = App.esc;
  const $ = (id) => document.getElementById(id);
  let subs = [];

  function renderTheme() {
    const t = document.documentElement.getAttribute('data-theme');
    document.querySelectorAll('.theme-opt').forEach((b) => b.classList.toggle('active', b.dataset.theme === t));
  }

  async function loadSubjects() {
    App.loading($('subjects'));
    try {
      subs = await App.subjects(true);
      $('subjects').innerHTML = subs.length ? subs.map((s) => `<div class="list-item" style="--c:${E(s.color)};margin-bottom:8px" data-id="${s.id}"><div class="grow"><b>${E(s.name)}</b></div>
        <button type="button" class="btn-icon" data-act="edit" aria-label="Өңдеу">${App.ic('pencil')}</button><button type="button" class="btn-icon danger" data-act="delete" aria-label="Жою">${App.ic('trash-2')}</button></div>`).join('')
        : '<div class="state"><b>Пәндер әлі жоқ</b><span>Пәндерді кесте, тапсырма және бағалар үшін қосыңыз.</span></div>';
      App.icons();
    } catch (e) { App.error($('subjects'), e.message, loadSubjects); }
  }

  App.ready(async () => {
    renderTheme();
    document.addEventListener('themechange', renderTheme);
    document.querySelectorAll('.theme-opt').forEach((b) => b.addEventListener('click', () => App.setTheme(b.dataset.theme, true)));

    $('nDeadlines').checked = !!App.settings.notify_deadlines;
    $('nExams').checked = !!App.settings.notify_exams;
    const save = async () => {
      try {
        await Api.put('/profile', { notify_deadlines: $('nDeadlines').checked, notify_exams: $('nExams').checked });
        App.toast('Баптаулар сақталды', 'success');
      } catch (e) { App.toast(e.message, 'error'); }
    };
    $('nDeadlines').addEventListener('change', save);
    $('nExams').addEventListener('change', save);

    $('addSubject').addEventListener('click', () => Forms.subject(null, loadSubjects));
    $('subjects').addEventListener('click', async (e) => {
      const el = e.target.closest('[data-act]'); if (!el) return;
      const s = subs.find((x) => x.id === Number(el.closest('.list-item').dataset.id));
      if (el.dataset.act === 'edit') Forms.subject(s, loadSubjects);
      if (el.dataset.act === 'delete' && await App.confirm(`«${s.name}» пәнін жоясыз ба? Осы пәннің сабақ кестесі мен бағалары да жойылады.`)) {
        try { await Api.del('/subjects/' + s.id); App._subj = null; App.toast('Пән жойылды', 'success'); loadSubjects(); } catch (err) { App.toast(err.message, 'error'); }
      }
    });
    $('logoutBtn2').addEventListener('click', App.logout);
    await loadSubjects();
  });
})();
