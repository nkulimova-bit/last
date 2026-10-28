(function () {
  const page = document.body.dataset.page;
  const form = document.getElementById('authForm');
  const errBox = document.getElementById('formError');
  const btn = form.querySelector('[type=submit]');

  // Тақырыпты ауыстыру
  const tb = document.getElementById('themeBtn');
  const sync = () => { tb.innerHTML = `<i data-lucide="${document.documentElement.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon'}"></i>`; if (window.lucide) lucide.createIcons(); };
  tb.addEventListener('click', () => {
    const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('theme', t); } catch (e) { /* ignore */ }
    sync();
  });
  sync();

  // Құпиясөзді көрсету/жасыру
  document.querySelectorAll('[data-toggle-pw]').forEach((b) => b.addEventListener('click', () => {
    const i = b.parentElement.querySelector('input');
    i.type = i.type === 'password' ? 'text' : 'password';
  }));

  function showError(msg) { errBox.hidden = false; errBox.innerHTML = msg; }

  function validate(d) {
    const e = [];
    if (page === 'register') {
      if (d.full_name.trim().length < 2) e.push('Аты-жөніңізді енгізіңіз (кемінде 2 таңба)');
    }
    if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) e.push('Email дұрыс емес');
    if (page === 'register') {
      if (d.password.length < 8) e.push('Құпиясөз кемінде 8 таңба болуы керек');
      else if (!/\d/.test(d.password) || !/[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/.test(d.password)) e.push('Құпиясөзде әріп пен сан болуы керек');
      if (d.password !== d.confirm_password) e.push('Құпиясөздер сәйкес келмейді');
    } else if (!d.password) e.push('Құпиясөзді енгізіңіз');
    return e;
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    errBox.hidden = true;
    const d = App_formData(form);
    const local = validate(d);
    if (local.length) { showError(local.map((x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;')).join('<br>')); return; }
    btn.disabled = true;
    try {
      const body = page === 'register'
        ? { full_name: d.full_name.trim(), email: d.email.trim(), password: d.password, confirm_password: d.confirm_password }
        : { email: d.email.trim(), password: d.password };
      const res = await Api.post(page === 'register' ? '/auth/register' : '/auth/login', body);
      if (res && res.needsEmailConfirmation) {
        showError('Тіркелгі жасалды. Email поштаңызға келген растау сілтемесін ашыңыз, содан кейін жүйеге кіріңіз.');
        return;
      }
      try { localStorage.setItem('theme', (res.settings && res.settings.theme) || 'light'); } catch (e) { /* ignore */ }
      location.href = 'index.html';
    } catch (err) {
      const list = err.errors && err.errors.length ? err.errors.map((x) => x.message) : [err.message];
      showError(list.map((x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;')).join('<br>'));
    } finally { btn.disabled = false; }
  });

  function App_formData(f) { const o = {}; [...f.elements].forEach((el) => { if (el.name) o[el.name] = el.value; }); return o; }
})();
