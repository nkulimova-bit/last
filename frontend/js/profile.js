(function () {
  const $ = (id) => document.getElementById(id);
  const show = (box, msg, ok) => { box.hidden = false; box.style.background = ok ? 'var(--mint-soft)' : ''; box.style.color = ok ? 'var(--mint-d)' : ''; box.innerHTML = msg; };

  App.ready(async (user) => {
    $('email').value = user.email;
    $('fullName').value = user.full_name;
    $('since').textContent = App.fmtDate(user.created_at.slice(0, 10));

    $('profileForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const box = $('profileErr'); box.hidden = true;
      try {
        const r = await Api.put('/profile', { full_name: $('fullName').value });
        App.user = r.user; App.toast('Профиль жаңартылды', 'success');
        document.querySelectorAll('.sidebar-user .who b').forEach((b) => { b.textContent = r.user.full_name; });
      } catch (err) { show(box, App.esc(err.message)); }
    });

    $('pwForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const box = $('pwErr'); box.hidden = true;
      const f = e.target;
      try {
        await Api.post('/auth/change-password', { current_password: f.current_password.value, new_password: f.new_password.value, confirm_password: f.confirm_password.value });
        f.reset(); App.toast('Құпиясөз сәтті өзгертілді', 'success');
      } catch (err) {
        show(box, (err.errors && err.errors.length ? err.errors.map((x) => App.esc(x.message)) : [App.esc(err.message)]).join('<br>'));
      }
    });
    $('logoutBtn2').addEventListener('click', App.logout);
  });
})();
