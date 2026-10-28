// Беттің жыпылықтамауы үшін тақырыпты ертерек қолданамыз (құпия деректер сақталмайды).
try { document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light'); } catch (e) { /* ignore */ }
