# Student Organizer — Supabase + Vercel

Студенттің электрондық органайзері. Frontend — HTML/CSS/JavaScript; авторизация және деректер — Supabase Auth + PostgreSQL; hosting — Vercel Static. Ескі MySQL backend бұл нұсқадан алынды.

## 1. Supabase дерекқорын дайындау

1. Аш: https://supabase.com/dashboard/project/uvkpyypwdzvtpewmlkpt/sql/new
2. `supabase/schema.sql` файлын ашып, толық кодын SQL Editor-ге көшір.
3. Run бас. Бұл `profiles`, `user_settings`, `subjects`, `tasks`, `timetable_entries`, `calendar_events`, `grades`, `notes`, `exams`, `study_goals`, `study_sessions`, `notifications` кестелерін жасайды және RLS саясаттарын қосады.
4. Authentication → URL Configuration ішінде production Site URL ретінде Vercel URL-ін орнат. Redirect URLs ішіне Vercel доменін және `https://*.vercel.app/**` preview қажет болса қос.
5. Authentication → Providers → Email ішінде email confirmation баптауын таңда. Қосулы болса, тіркелген адам email-ін растаған соң ғана кіре алады.

## 2. GitHub-қа жүктеу

`frontend/`, `supabase/`, `vercel.json`, `README.md`, `.gitignore` файлдарын репозиторийдің түпкі деңгейіне жүкте. `.env`, құпия кілттер немесе парольдер жүктеме. `frontend/js/config.js` ішінде тек Supabase URL және publishable key бар — ол браузерге арналған ашық кілт.

## 3. Vercel-ге deploy

1. Vercel → Add New → Project → GitHub репозиторий `nkulimova-bit/last` таңда.
2. Framework Preset: **Other**.
3. Root Directory: `./`.
4. Build Command: бос қалдыр (Override қосулы болса өшір).
5. Output Directory: `frontend`. `vercel.json` бұл мәнді алдын ала орнатады.
6. Deploy бас.

## Қауіпсіздік

- Браузерде тек publishable key қолданылады. `sb_secret_...` немесе `service_role` кілтін ешқашан `frontend/` ішіне салма.
- SQL схемасында RLS барлық қолданушы деректерінің кестелеріне қосылған. Оны өшірме.
- Жаңа аккаунттар Supabase Auth арқылы жасалады; парольдер `auth.users` ішінде Supabase арқылы басқарылады.
- Email confirmation қосулы болса, тіркелгеннен кейін поштадағы сілтемені басу қажет.

## Жылдам тексеру

Deploy аяқталған соң Vercel URL-ін аш, тіркелгі жаса, email раста (қажет болса), кіріп пән және тапсырма қос. Содан кейін Supabase → Table Editor ішінде жазбалар пайда болғанын тексер.
