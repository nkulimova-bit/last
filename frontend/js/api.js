/* Student Organizer API adapter — Supabase Auth + Postgres Data API.
 * No private/service-role key belongs in this file. RLS policies are required.
 */
(function () {
  const { createClient } = window.supabase || {};
  if (!createClient) {
    console.error('Supabase JS SDK did not load. Check your internet connection.');
  }
  const sb = createClient
    ? createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

  class ApiError extends Error {
    constructor(message, status = 400, errors = []) { super(message); this.status = status; this.errors = errors; }
  }
  const qs = (o) => {
    const p = new URLSearchParams();
    Object.entries(o || {}).forEach(([k, v]) => { if (v !== '' && v != null) p.append(k, v); });
    const s = p.toString(); return s ? '?' + s : '';
  };
  const fail = (error) => {
    if (!error) return;
    const msg = error.message || 'Supabase сұрауын орындау мүмкін болмады';
    if (/duplicate key|already exists/i.test(msg)) throw new ApiError('Бұл мәлімет бұрыннан бар.', 409);
    if (/JWT|not authenticated|Auth session missing/i.test(msg)) throw new ApiError('Жүйеге қайта кіріңіз.', 401);
    throw new ApiError(msg, error.status || 400);
  };
  async function result(query) {
    const { data, error } = await query;
    if (error) fail(error);
    return data;
  }
  async function userOrThrow() {
    if (!sb) throw new ApiError('Supabase SDK жүктелмеді. Интернетті тексеріңіз.', 503);
    const { data, error } = await sb.auth.getUser();
    if (error || !data.user) throw new ApiError('Жүйеге кіру қажет.', 401);
    return data.user;
  }
  const bool = (v) => v === true || v === 1 || v === '1' || v === 'true';
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const dateAdd = (date, n) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate()+n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const dayOfWeek = () => { const d = new Date().getDay(); return d === 0 ? 7 : d; };
  const tableConfig = {
    subjects: { table: 'subjects', fields: ['name','color'], order: ['name', true] },
    tasks: { table: 'tasks', fields: ['subject_id','title','description','due_date','due_time','priority','status','completed_at'], order: ['due_date', true] },
    timetable: { table: 'timetable_entries', fields: ['subject_id','teacher','classroom','day_of_week','start_time','end_time','color'], order: ['day_of_week', true] },
    calendar: { table: 'calendar_events', fields: ['title','description','event_date','start_time','end_time','color'], order: ['event_date', true] },
    grades: { table: 'grades', fields: ['subject_id','title','score','max_score','assessed_on','comment'], order: ['assessed_on', false] },
    notes: { table: 'notes', fields: ['subject_id','title','content','is_pinned'], order: ['is_pinned', false] },
    exams: { table: 'exams', fields: ['subject_id','title','type','exam_date','exam_time','description','prep_status'], order: ['exam_date', true] },
    goals: { table: 'study_goals', fields: ['subject_id','title','description','target_date','target_minutes'], order: ['target_date', true] },
    sessions: { table: 'study_sessions', fields: ['goal_id','title','session_date','duration_minutes','is_completed'], order: ['session_date', false] },
  };
  const cleanPayload = (payload, fields) => {
    const out = {};
    fields.forEach((f) => {
      if (Object.prototype.hasOwnProperty.call(payload || {}, f)) {
        let v = payload[f];
        if (v === '') v = null;
        if (['is_pinned','is_completed'].includes(f)) v = bool(v);
        if (['subject_id','goal_id','day_of_week','target_minutes','duration_minutes'].includes(f) && v != null) v = Number(v);
        if (['score','max_score'].includes(f) && v != null) v = Number(v);
        out[f] = v;
      }
    });
    return out;
  };
  function flatten(row, kind) {
    if (!row) return row;
    const r = { ...row };
    if (r.subjects) { r.subject_name = r.subjects.name; r.subject_color = r.subjects.color; delete r.subjects; }
    if (r.study_goals) { r.goal_title = r.study_goals.title; delete r.study_goals; }
    if (kind === 'grades') r.percent = Number(r.max_score) ? Math.round(Number(r.score) / Number(r.max_score) * 10000) / 100 : 0;
    if (kind === 'tasks') {
      r.is_overdue = r.status !== 'done' && (`${r.due_date} ${r.due_time || '23:59:59'}` < `${today()} ${new Date().toTimeString().slice(0,8)}`);
    }
    if (kind === 'exams') r.days_left = Math.round((new Date(`${r.exam_date}T12:00:00`) - new Date(`${today()}T12:00:00`)) / 86400000);
    if (kind === 'goals') r.days_left = Math.round((new Date(`${r.target_date}T12:00:00`) - new Date(`${today()}T12:00:00`)) / 86400000);
    return r;
  }
  async function list(kind, query = {}) {
    const uid = (await userOrThrow()).id;
    const cfg = tableConfig[kind];
    let q = sb.from(cfg.table).select(kind === 'subjects' || kind === 'calendar' ? '*' : kind === 'sessions' ? '*, study_goals(title)' : '*, subjects(name,color)').eq('user_id', uid);
    if (kind === 'tasks') {
      if (['todo','in_progress','done'].includes(query.status)) q = q.eq('status', query.status);
      if (['low','medium','high'].includes(query.priority)) q = q.eq('priority', query.priority);
      if (/^\d+$/.test(query.subject_id || '')) q = q.eq('subject_id', Number(query.subject_id));
      if (query.q) q = q.ilike('title', `%${String(query.q).slice(0,100)}%`);
      if (query.overdue === '1') q = q.neq('status','done').lt('due_date', today());
      if (query.sort === 'due_desc') q = q.order('due_date',{ascending:false});
      else if (query.sort === 'created_desc') q = q.order('created_at',{ascending:false});
      else q = q.order('due_date',{ascending:true}).order('due_time',{ascending:true,nullsFirst:false});
    } else if (kind === 'exams') {
      if (['exam','test','project','presentation','assignment'].includes(query.type)) q = q.eq('type', query.type);
      if (query.when === 'upcoming') q = q.gte('exam_date', today());
      if (query.when === 'past') q = q.lt('exam_date', today());
      if (query.q) q = q.ilike('title', `%${String(query.q).slice(0,100)}%`);
      q = q.order('exam_date',{ascending: query.sort !== 'date_desc'});
    } else if (kind === 'grades') {
      if (/^\d+$/.test(query.subject_id || '')) q = q.eq('subject_id', Number(query.subject_id));
      q = q.order('assessed_on',{ascending:false}).order('id',{ascending:false});
    } else if (kind === 'notes') {
      if (/^\d+$/.test(query.subject_id || '')) q = q.eq('subject_id', Number(query.subject_id));
      if (query.q) q = q.ilike('title', `%${String(query.q).slice(0,100)}%`);
      q = q.order('is_pinned',{ascending:false}).order('updated_at',{ascending:false});
    } else if (kind === 'timetable') {
      if (/^[1-7]$/.test(query.day || '')) q = q.eq('day_of_week', Number(query.day));
      q = q.order('day_of_week',{ascending:true}).order('start_time',{ascending:true});
    } else if (kind === 'sessions') {
      if (/^\d+$/.test(query.goal_id || '')) q = q.eq('goal_id', Number(query.goal_id));
      q = q.order('session_date',{ascending:false}).order('id',{ascending:false});
    } else q = q.order(cfg.order[0], { ascending: cfg.order[1] });
    const rows = await result(q);
    return (rows || []).map((r) => flatten(r, kind));
  }
  async function create(kind, body) {
    const u = await userOrThrow(); const cfg = tableConfig[kind];
    const payload = { ...cleanPayload(body, cfg.fields), user_id: u.id };
    if (kind === 'tasks' && payload.status === 'done' && !payload.completed_at) payload.completed_at = new Date().toISOString();
    const row = await result(sb.from(cfg.table).insert(payload).select('*').single());
    return flatten(row, kind);
  }
  async function update(kind, id, body) {
    const u = await userOrThrow(); const cfg = tableConfig[kind];
    const payload = cleanPayload(body, cfg.fields);
    if (kind === 'tasks' && Object.prototype.hasOwnProperty.call(payload,'status')) payload.completed_at = payload.status === 'done' ? new Date().toISOString() : null;
    payload.updated_at = new Date().toISOString();
    const row = await result(sb.from(cfg.table).update(payload).eq('id', id).eq('user_id', u.id).select('*').single());
    return flatten(row, kind);
  }
  async function remove(kind, id) {
    const u = await userOrThrow(); const cfg = tableConfig[kind];
    await result(sb.from(cfg.table).delete().eq('id', id).eq('user_id', u.id));
    return null;
  }
  async function profile() {
    const u = await userOrThrow();
    const [p, s] = await Promise.all([
      result(sb.from('profiles').select('id,full_name,email,created_at').eq('id',u.id).single()),
      result(sb.from('user_settings').select('theme,notify_deadlines,notify_exams').eq('user_id',u.id).single())
    ]);
    return { user: p, settings: s || { theme:'light', notify_deadlines:true, notify_exams:true } };
  }
  async function gradeSummary(uid) {
    const [subjects, grades] = await Promise.all([
      result(sb.from('subjects').select('id,name,color').eq('user_id',uid)),
      result(sb.from('grades').select('subject_id,score,max_score').eq('user_id',uid))
    ]);
    const rows = (subjects || []).map(s => {
      const g = (grades || []).filter(x => x.subject_id === s.id);
      const avg = g.length ? g.reduce((sum,x)=>sum+Number(x.score)/Number(x.max_score)*100,0)/g.length : null;
      return { subject_id:s.id, name:s.name, color:s.color, count:g.length, avg_percent:avg == null ? null : Math.round(avg*100)/100 };
    }).filter(s => s.count).sort((a,b)=>a.name.localeCompare(b.name));
    return { overall_percent: rows.length ? Math.round(rows.reduce((a,r)=>a+r.avg_percent,0)/rows.length*100)/100 : null, grades_count: rows.reduce((a,r)=>a+r.count,0), subjects:rows };
  }
  async function studySummary(uid) {
    const sessions = await result(sb.from('study_sessions').select('session_date,duration_minutes,is_completed').eq('user_id',uid));
    const d = new Date(); const offset = (d.getDay()+6)%7; d.setDate(d.getDate()-offset);
    const weekStart = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const weekEnd = dateAdd(weekStart,6);
    const done = (sessions||[]).filter(s=>s.is_completed);
    const sum = done.reduce((a,s)=>a+Number(s.duration_minutes),0);
    const week = done.filter(s=>s.session_date>=weekStart&&s.session_date<=weekEnd).reduce((a,s)=>a+Number(s.duration_minutes),0);
    const byDay = {};
    done.filter(s=>s.session_date>=weekStart&&s.session_date<=weekEnd).forEach(s=>byDay[s.session_date]=(byDay[s.session_date]||0)+Number(s.duration_minutes));
    return { total_minutes:sum, week_minutes:week, planned_sessions:(sessions||[]).filter(s=>!s.is_completed).length, week_start:weekStart, days:Object.entries(byDay).map(([date,minutes])=>({date,minutes})) };
  }
  async function dashboard() {
    const u = await userOrThrow();
    const [prof,tasks,classes,exams,grades,study] = await Promise.all([
      result(sb.from('profiles').select('full_name').eq('id',u.id).single()), list('tasks'), list('timetable'), list('exams'), gradeSummary(u.id), studySummary(u.id)
    ]);
    const todayStr = today(); const dow = dayOfWeek();
    const total=tasks.length, done=tasks.filter(t=>t.status==='done').length;
    return { user:prof, today:todayStr, weekday:dow,
      tasks:{total,done,pending:tasks.filter(t=>t.status!=='done').length,overdue:tasks.filter(t=>t.is_overdue).length,completion_percent:total?Math.round(done/total*100):0},
      today_classes:classes.filter(c=>Number(c.day_of_week)===dow), week_schedule:classes,
      deadlines:tasks.filter(t=>t.status!=='done').sort((a,b)=>`${a.due_date} ${a.due_time||'23:59:59'}`.localeCompare(`${b.due_date} ${b.due_time||'23:59:59'}`)).slice(0,6),
      exams:exams.filter(e=>e.exam_date>=todayStr).slice(0,5), grades, study:{week_minutes:study.week_minutes,total_minutes:study.total_minutes} };
  }
  async function calendar(query) {
    const uid = (await userOrThrow()).id; const from=query.from||today(); const to=query.to||dateAdd(today(),30);
    const [events,tasks,exams,classes] = await Promise.all([
      result(sb.from('calendar_events').select('*').eq('user_id',uid).gte('event_date',from).lte('event_date',to).order('event_date')),
      result(sb.from('tasks').select('id,title,due_date,due_time,priority,status').eq('user_id',uid).gte('due_date',from).lte('due_date',to).order('due_date')),
      result(sb.from('exams').select('id,title,type,exam_date,exam_time,description,prep_status,subjects(name)').eq('user_id',uid).gte('exam_date',from).lte('exam_date',to).order('exam_date')),
      result(sb.from('timetable_entries').select('id,day_of_week,start_time,end_time,teacher,classroom,color,subjects(name,color)').eq('user_id',uid).order('start_time'))
    ]);
    return {events:events||[],tasks:tasks||[],exams:(exams||[]).map(flatten),timetable:(classes||[]).map(flatten)};
  }
  async function notifications() {
    const uid=(await userOrThrow()).id;
    const [settings,tasks,exams,existing] = await Promise.all([
      result(sb.from('user_settings').select('notify_deadlines,notify_exams').eq('user_id',uid).single()),
      list('tasks'),list('exams'),result(sb.from('notifications').select('*').eq('user_id',uid))
    ]);
    const nd=!settings||settings.notify_deadlines, ne=!settings||settings.notify_exams, now=new Date();
    const generated=[];
    if(nd) tasks.filter(t=>t.status!=='done'&&`${t.due_date} ${t.due_time||'23:59:59'}` <= `${today()} ${now.toTimeString().slice(0,8)}`).forEach(t=>generated.push({user_id:uid,type:'task_overdue',ref_key:`task:${t.id}`,ref_id:t.id,title:t.title,message:`Тапсырманың мерзімі өтіп кетті (${t.due_date})`,due_at:`${t.due_date}T${t.due_time||'23:59:59'}`}));
    if(nd) tasks.filter(t=>t.status!=='done'&&t.due_date>=today()&&t.due_date<=dateAdd(today(),2)).forEach(t=>generated.push({user_id:uid,type:'task_due',ref_key:`task:${t.id}`,ref_id:t.id,title:t.title,message:`Тапсырма мерзімі жақындады: ${t.due_date}`,due_at:`${t.due_date}T${t.due_time||'23:59:59'}`}));
    if(ne) exams.filter(e=>e.exam_date>=today()&&e.exam_date<=dateAdd(today(),7)).forEach(e=>generated.push({user_id:uid,type:'exam_upcoming',ref_key:`exam:${e.id}`,ref_id:e.id,title:e.title,message:`Емтихан күні: ${e.exam_date}`,due_at:`${e.exam_date}T${e.exam_time||'00:00:00'}`}));
    if(generated.length) await result(sb.from('notifications').upsert(generated,{onConflict:'user_id,ref_key',ignoreDuplicates:true}));
    const all=await result(sb.from('notifications').select('*').eq('user_id',uid).eq('is_dismissed',false).order('is_read').order('due_at'));
    const labels={task_overdue:'Мерзімі өтті',task_due:'Мерзімі жақын',exam_upcoming:'Жақындап келе жатыр'};
    const items=(all||[]).map(x=>({...x,type_label:labels[x.type]||x.type}));
    return {items,unread_count:items.filter(x=>!x.is_read).length};
  }
  async function request(method, url, body) {
    if (!sb) throw new ApiError('Supabase SDK жүктелмеді. Интернетті тексеріңіз.',503);
    const path=url.split('?')[0]; const query=Object.fromEntries(new URLSearchParams(url.split('?')[1]||''));
    try {
      if (path==='/auth/register'&&method==='POST') {
        const {data,error}=await sb.auth.signUp({email:body.email.trim(),password:body.password,options:{data:{full_name:body.full_name.trim()}}});
        if(error) fail(error);
        if(data.session) return {user:{id:data.user.id,full_name:body.full_name,email:data.user.email,created_at:data.user.created_at},settings:{theme:'light',notify_deadlines:true,notify_exams:true}};
        return {needsEmailConfirmation:true,email:body.email};
      }
      if(path==='/auth/login'&&method==='POST') {
        const {data,error}=await sb.auth.signInWithPassword({email:body.email.trim(),password:body.password}); if(error) fail(error); return await profile();
      }
      if(path==='/auth/logout'&&method==='POST') { const {error}=await sb.auth.signOut(); if(error) fail(error); return null; }
      if(path==='/auth/me'&&method==='GET'||path==='/profile'&&method==='GET') return await profile();
      if(path==='/auth/change-password'&&method==='POST') {
        const u=await userOrThrow(); const {error:verifyError}=await sb.auth.signInWithPassword({email:u.email,password:body.current_password}); if(verifyError) throw new ApiError('Ағымдағы құпиясөз қате.',400);
        const {error}=await sb.auth.updateUser({password:body.new_password}); if(error) fail(error); return null;
      }
      if(path==='/profile'&&method==='PUT') {
        const u=await userOrThrow();
        if(body.full_name) { const {error}=await sb.auth.updateUser({data:{full_name:body.full_name.trim()}}); if(error) fail(error); await result(sb.from('profiles').update({full_name:body.full_name.trim(),updated_at:new Date().toISOString()}).eq('id',u.id)); }
        const settings={}; if(body.theme) settings.theme=body.theme; if(typeof body.notify_deadlines==='boolean') settings.notify_deadlines=body.notify_deadlines; if(typeof body.notify_exams==='boolean') settings.notify_exams=body.notify_exams;
        if(Object.keys(settings).length) await result(sb.from('user_settings').upsert({user_id:u.id,...settings,updated_at:new Date().toISOString()},{onConflict:'user_id'})); return await profile();
      }
      if(path==='/dashboard'&&method==='GET') return await dashboard();
      if(path==='/grades/summary'&&method==='GET') return await gradeSummary((await userOrThrow()).id);
      if(path==='/study/summary'&&method==='GET') return await studySummary((await userOrThrow()).id);
      if(path==='/calendar'&&method==='GET') return await calendar(query);
      if(path==='/notifications'&&method==='GET') return await notifications();
      if(path==='/notifications/read-all'&&method==='PATCH') { const u=await userOrThrow(); await result(sb.from('notifications').update({is_read:true}).eq('user_id',u.id).eq('is_dismissed',false)); return null; }
      let m=path.match(/^\/notifications\/(\d+)\/read$/);
      if(m&&method==='PATCH') { const u=await userOrThrow(); await result(sb.from('notifications').update({is_read:true}).eq('id',m[1]).eq('user_id',u.id)); return null; }
      m=path.match(/^\/notifications\/(\d+)$/);
      if(m&&method==='DELETE') { const u=await userOrThrow(); await result(sb.from('notifications').update({is_dismissed:true,is_read:true}).eq('id',m[1]).eq('user_id',u.id)); return null; }
      let kind=null, id=null;
      if(path==='/subjects') kind='subjects';
      else if(path==='/tasks') kind='tasks';
      else if(path==='/timetable') kind='timetable';
      else if(path==='/calendar') kind='calendar';
      else if(path==='/grades') kind='grades';
      else if(path==='/notes') kind='notes';
      else if(path==='/exams') kind='exams';
      else if(path==='/study/goals') kind='goals';
      else if(path==='/study/sessions') kind='sessions';
      else { const match=path.match(/^\/(subjects|tasks|timetable|calendar|grades|notes|exams|study\/goals|study\/sessions)\/(\d+)(?:\/status)?$/); if(match){ kind=match[1].startsWith('study/')?match[1].split('/')[1]:match[1]; id=match[2]; } }
      if(kind) {
        if(kind==='tasks'&&id&&path.endsWith('/status')&&method==='PATCH') return await update(kind,id,{status:body.status});
        if(method==='GET'&&!id) return await list(kind,query);
        if(method==='POST'&&!id) return await create(kind,body);
        if((method==='PUT'||method==='PATCH')&&id) return await update(kind,id,body);
        if(method==='DELETE'&&id) return await remove(kind,id);
      }
      throw new ApiError(`Белгісіз сұрау: ${method} ${path}`,404);
    } catch(e) {
      if(e instanceof ApiError) throw e;
      if(e && e.code) fail(e);
      throw new ApiError(e.message || 'Белгісіз қате',400);
    }
  }
  window.Api = {
    ApiError, qs,
    get: async (u,q) => request('GET',u+qs(q)),
    post: async (u,b) => request('POST',u,b||{}),
    put: async (u,b) => request('PUT',u,b||{}),
    patch: async (u,b) => request('PATCH',u,b||{}),
    del: async (u) => request('DELETE',u),
    supabase: sb,
  };
})();
