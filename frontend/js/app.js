(function () {
  const NAV = [
    ['index', 'Басты бет', 'layout-dashboard', 'index.html'],
    ['timetable', 'Сабақ кестесі', 'calendar-clock', 'timetable.html'],
    ['tasks', 'Тапсырмалар', 'list-checks', 'tasks.html'],
    ['calendar', 'Күнтізбе', 'calendar-days', 'calendar.html'],
    ['grades', 'Бағалар', 'award', 'grades.html'],
    ['notes', 'Жазбалар', 'notebook-pen', 'notes.html'],
    ['exams', 'Емтихандар', 'graduation-cap', 'exams.html'],
    ['study', 'Оқу жоспары', 'target', 'study-planner.html'],
    ['notifications', 'Хабарландырулар', 'bell', 'notifications.html'],
    ['profile', 'Профиль', 'user-round', 'profile.html'],
    ['settings', 'Баптаулар', 'settings', 'settings.html'],
  ];
  const BOTTOM = ['index', 'timetable', 'tasks', 'calendar'];
  const MONTHS = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'];
  const MONTHS_N = ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым', 'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан'];
  const DAYS = ['Дүйсенбі', 'Сейсенбі', 'Сәрсенбі', 'Бейсенбі', 'Жұма', 'Сенбі', 'Жексенбі'];
  const DAYS_S = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жк'];
  const L = {
    priority: { low: 'Төмен', medium: 'Орташа', high: 'Жоғары' },
    status: { todo: 'Орындалмаған', in_progress: 'Орындалуда', done: 'Орындалды' },
    examType: { exam: 'Емтихан', test: 'Тест', project: 'Жоба', presentation: 'Презентация', assignment: 'Тапсырма' },
    prep: { not_started: 'Басталмаған', in_progress: 'Дайындалып жатыр', ready: 'Дайын' },
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const toStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); }; // жергілікті күн — ығысусыз
  const todayStr = () => toStr(new Date());
  const fmtDate = (s) => { if (!s) return ''; const d = parse(s); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
  const fmtShort = (s) => { const d = parse(s); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
  const hhmm = (t) => (t ? String(t).slice(0, 5) : '');
  const fmtDT = (s) => (s ? `${fmtDate(s)} ${hhmm(String(s).slice(11))}` : '');
  const daysBetween = (a, b) => Math.round((Date.UTC(...ymd(b)) - Date.UTC(...ymd(a))) / 86400000);
  function ymd(s) { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return [y, m - 1, d]; }
  const relDays = (n) => (n === 0 ? 'Бүгін' : n === 1 ? 'Ертең' : n > 0 ? `${n} күн қалды` : `${-n} күн бұрын`);
  const fmtMin = (m) => { m = Number(m) || 0; const h = Math.floor(m / 60); const r = m % 60; return h ? (r ? `${h} сағ ${r} мин` : `${h} сағ`) : `${r} мин`; };
  const fmtPct = (n) => (n == null ? '—' : `${Math.round(Number(n) * 10) / 10}%`);

  const App = { esc, pad, toStr, parse, todayStr, fmtDate, fmtShort, hhmm, fmtDT, daysBetween, relDays, fmtMin, fmtPct, MONTHS, MONTHS_N, DAYS, DAYS_S, L, NAV };
  window.App = App;

  /* ---------- Icons ---------- */
  App.icons = () => { if (window.lucide) window.lucide.createIcons(); };
  let iconTimer;
  new MutationObserver(() => {
    clearTimeout(iconTimer);
    iconTimer = setTimeout(() => { if (document.querySelector('i[data-lucide]')) App.icons(); }, 16);
  }).observe(document.documentElement, { childList: true, subtree: true });
  const ic = (name) => `<i data-lucide="${name}"></i>`;
  App.ic = ic;

  /* ---------- Theme ---------- */
  App.setTheme = async (t, persist) => {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('theme', t); } catch (e) { /* ignore */ }
    if (App.settings) App.settings.theme = t;
    if (persist) { try { await Api.put('/profile', { theme: t }); } catch (e) { App.toast(e.message, 'error'); } }
    document.dispatchEvent(new CustomEvent('themechange'));
  };

  /* ---------- Toast / states ---------- */
  App.toast = (msg, type = 'info') => {
    let box = document.querySelector('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = `toast ${type}`; t.textContent = msg; box.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  };
  App.loading = (el, text = 'Жүктелуде…') => { el.innerHTML = `<div class="state"><span class="spinner"></span><span>${esc(text)}</span></div>`; };
  App.empty = (el, icon, title, text) => { el.innerHTML = `<div class="state">${ic(icon)}<b>${esc(title)}</b><span>${esc(text || '')}</span></div>`; };
  App.error = (el, msg, retry) => {
    el.innerHTML = `<div class="state err">${ic('triangle-alert')}<b>Қате орын алды</b><span>${esc(msg)}</span>${retry ? '<button class="btn btn-ghost btn-sm" data-retry>Қайталау</button>' : ''}</div>`;
    const b = el.querySelector('[data-retry]'); if (b) b.addEventListener('click', retry);
  };

  /* ---------- Modal / confirm ---------- */
  const stack = [];
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && stack.length) stack[stack.length - 1].close(); });
  App.formData = (form) => {
    const o = {};
    [...form.elements].forEach((el) => {
      if (!el.name) return;
      o[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return o;
  };
  App.modal = ({ title, body, submitText = 'Сақтау', onSubmit, onClose, wide, hideFoot }) => {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head"><h3>${esc(title)}</h3><button type="button" class="icon-btn" data-close aria-label="Жабу">${ic('x')}</button></div>
      <form novalidate><div class="modal-body">${body}<div class="form-error" hidden></div></div>
      <div class="modal-foot" ${hideFoot ? 'hidden' : ''}><button type="button" class="btn btn-ghost" data-close>Бас тарту</button><button type="submit" class="btn btn-primary">${esc(submitText)}</button></div></form></div>`;
    document.body.appendChild(wrap);
    const form = wrap.querySelector('form');
    const errBox = wrap.querySelector('.form-error');
    const ctrl = {
      el: wrap, form,
      close() { const i = stack.indexOf(ctrl); if (i >= 0) stack.splice(i, 1); wrap.remove(); if (onClose) onClose(); },
      error(msg) { errBox.hidden = false; errBox.innerHTML = msg; },
    };
    stack.push(ctrl);
    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) ctrl.close(); });
    wrap.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', ctrl.close));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!onSubmit) return;
      const btn = form.querySelector('[type=submit]');
      errBox.hidden = true; btn.disabled = true;
      try { await onSubmit(App.formData(form), ctrl); ctrl.close(); }
      catch (err) {
        const list = err.errors && err.errors.length ? err.errors.map((x) => esc(x.message)).join('<br>') : esc(err.message || 'Белгісіз қате');
        ctrl.error(list);
      } finally { btn.disabled = false; }
    });
    const first = form.querySelector('input:not([type=hidden]),select,textarea'); if (first) first.focus();
    return ctrl;
  };
  App.confirm = (message, { okText = 'Жою', danger = true } = {}) => new Promise((resolve) => {
    let result = false;
    const m = App.modal({
      title: 'Растау', submitText: okText, body: `<p style="margin:0">${esc(message)}</p>`,
      onSubmit: async () => { result = true; }, onClose: () => resolve(result),
    });
    if (danger) { const b = m.form.querySelector('[type=submit]'); b.classList.remove('btn-primary'); b.classList.add('btn-danger'); }
  });

  /* ---------- Subjects cache ---------- */
  App.subjects = async (force) => { if (!App._subj || force) App._subj = await Api.get('/subjects'); return App._subj; };

  /* ---------- Charts ---------- */
  const charts = {};
  App.chart = (id, config) => {
    const cv = document.getElementById(id);
    if (!cv || !window.Chart) return null;
    if (charts[id]) charts[id].destroy();
    const css = getComputedStyle(document.documentElement);
    Chart.defaults.color = css.getPropertyValue('--muted').trim() || '#777';
    Chart.defaults.font.family = css.getPropertyValue('--font').trim();
    Chart.defaults.borderColor = css.getPropertyValue('--line').trim();
    config.options = Object.assign({ responsive: true, maintainAspectRatio: false }, config.options || {});
    charts[id] = new Chart(cv, config);
    return charts[id];
  };

  /* ---------- Shell ---------- */
  function buildShell() {
    const page = document.body.dataset.page;
    const title = document.body.dataset.title || '';
    const content = document.getElementById('content');
    const u = App.user || { full_name: 'Студент' };
    const initial = (u.full_name || '?').trim().charAt(0).toUpperCase();
    const navLinks = NAV.map(([key, label, icon, href]) =>
      `<a href="${href}" class="${key === page ? 'active' : ''}" ${key === page ? 'aria-current="page"' : ''}>${ic(icon)}<span>${label}</span>${key === 'notifications' ? '<span class="nbadge" data-nbadge hidden></span>' : ''}</a>`).join('');
    const bottom = BOTTOM.map((k) => { const n = NAV.find((x) => x[0] === k); return `<a href="${n[3]}" class="${k === page ? 'active' : ''}">${ic(n[2])}<span>${n[1].split(' ')[0]}</span></a>`; }).join('');
    const app = document.createElement('div');
    app.className = 'app';
    app.innerHTML = `
      <aside class="sidebar" id="sidebar">
        <div class="brand"><span class="brand-logo">${ic('graduation-cap')}</span><div><b>Студенттің</b><small>электрондық органайзері</small></div></div>
        <nav class="nav" aria-label="Негізгі мәзір">${navLinks}</nav>
        <div class="sidebar-user"><span class="avatar">${esc(initial)}</span><div class="who"><b>${esc(u.full_name)}</b><small>Студент</small></div>
          <button type="button" id="logoutBtn" title="Шығу" aria-label="Шығу">${ic('log-out')}</button></div>
      </aside>
      <div class="backdrop" id="backdrop"></div>
      <div class="main-wrap">
        <header class="topbar">
          <button type="button" class="icon-btn menu-btn" id="menuBtn" aria-label="Мәзір">${ic('menu')}</button>
          <div style="flex:1;min-width:0"><h1>${esc(title)}</h1><div class="date">${esc(DAYS[(new Date().getDay() + 6) % 7])}, ${esc(fmtDate(todayStr()))}</div></div>
          <button type="button" class="icon-btn" id="themeBtn" aria-label="Тақырыпты ауыстыру">${ic('moon')}</button>
          <a class="icon-btn" href="notifications.html" aria-label="Хабарландырулар">${ic('bell')}<span class="nbadge" data-nbadge hidden></span></a>
          <a class="avatar" href="profile.html" aria-label="Профиль" style="text-decoration:none">${esc(initial)}</a>
        </header>
        <div class="content" id="contentHost"></div>
      </div>
      <nav class="bottom-nav" aria-label="Жылдам мәзір">${bottom}<button type="button" id="moreBtn">${ic('layout-grid')}<span>Көбірек</span></button></nav>`;
    document.body.appendChild(app);
    app.querySelector('#contentHost').appendChild(content);
    const sb = app.querySelector('#sidebar'); const bd = app.querySelector('#backdrop');
    const toggle = (open) => { sb.classList.toggle('open', open); bd.classList.toggle('show', open); };
    app.querySelector('#menuBtn').addEventListener('click', () => toggle(true));
    app.querySelector('#moreBtn').addEventListener('click', () => toggle(true));
    bd.addEventListener('click', () => toggle(false));
    sb.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => toggle(false)));
    app.querySelector('#themeBtn').addEventListener('click', () => {
      App.setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
    });
    app.querySelector('#logoutBtn').addEventListener('click', App.logout);
    const syncIcon = () => { const b = app.querySelector('#themeBtn'); b.innerHTML = ic(document.documentElement.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon'); };
    document.addEventListener('themechange', syncIcon); syncIcon();
  }

  function updateShellUser() {
    const name = (App.user.full_name || 'Студент').trim();
    const initial = name.charAt(0).toUpperCase() || '?';
    const label = document.querySelector('.sidebar-user .who b');
    if (label) label.textContent = name;
    document.querySelectorAll('.sidebar-user .avatar, .topbar > .avatar').forEach((el) => { el.textContent = initial; });
  }

  App.logout = async () => {
    try { await Api.post('/auth/logout'); } catch (e) { /* ignore */ }
    location.href = 'login.html';
  };
  App.setBadge = (n) => document.querySelectorAll('[data-nbadge]').forEach((b) => { b.hidden = !n; b.textContent = n > 99 ? '99+' : n; });
  App.refreshBadge = async () => { try { const d = await Api.get('/notifications'); App.setBadge(d.unread_count); } catch (e) { /* ignore */ } };

  App.ready = async (cb) => {
    if (!document.querySelector('.app')) buildShell();
    try {
      const me = await Api.get('/auth/me');
      App.user = me.user; App.settings = me.settings;
    } catch (e) {
      if (e.status === 401) { location.href = 'login.html'; return; }
      document.body.innerHTML = `<div class="fatal"><h2>Қосылу қатесі</h2><p>${esc(e.message)}</p><button class="btn btn-primary" id="retry">Қайталау</button></div>`;
      document.getElementById('retry').addEventListener('click', () => location.reload());
      return;
    }
    App.setTheme(App.settings.theme || 'light', false);
    updateShellUser();
    App.icons();
    if (document.body.dataset.page !== 'notifications') App.refreshBadge();
    await cb(App.user);
  };
})();
