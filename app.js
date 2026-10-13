// Sparrow Tasks v2 – UI layer. Data via window.Store (store.js). Design ideas inspired by open-source boards
// (Kanboard – MIT, WeKan – MIT); no third-party code copied.
const S = window.Store, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STAT = [['todo', 'To do'], ['doing', 'Doing'], ['review', 'Review'], ['done', 'Done']];
const SL = k => (STAT.find(s => s[0] === k) || [, k])[1];
const TST = { new: 'New', progress: 'In progress', waiting: 'Waiting on client', resolved: 'Resolved', closed: 'Closed' };
const CATS = ['Listing', 'Ads', 'Account health', 'Payment', 'Other'];
const MASCOT = 'img/mascot-400.png', ICON = 'img/icon-192.png';
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (n, from) => { const x = from ? new Date(from + 'T00:00') : new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const fmt = d => { if (!d) return ''; if (d === today()) return 'Today'; if (d === addDays(1)) return 'Tomorrow'; return new Date(d + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };
const ago = t => { const m = Math.round((Date.now() - t) / 6e4); return m < 1 ? 'just now' : m < 60 ? m + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago'; };
const toast = m => { $('#toast').innerHTML = `<div>${esc(m)}</div>`; clearTimeout(toast.t); toast.t = setTimeout(() => $('#toast').innerHTML = '', 2200); };
const ini = n => (n || '?').replace(/\(.*?\)/g, '').trim().split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase();
const COLORS = ['#7c3aed', '#2563eb', '#0891b2', '#059669', '#d97706', '#db2777', '#4f46e5'];
const avc = s => COLORS[[...(s || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const av = (email, sz = 24) => { const n = email ? uname(email) : ''; return email ? `<span class="av" style="width:${sz}px;height:${sz}px;background:${avc(email)};font-size:${sz * .42}px" title="${esc(n)}">${ini(n)}</span>` : `<span class="av empty" style="width:${sz}px;height:${sz}px" title="Unassigned">👤</span>`; };
let ui = { loginTab: 'team', tab: 'list', task: null, filter: 'all', collapsed: localStorage.getItem('sp-col') === '1', drawer: false, q: '' };
const me = () => S.currentUser();
const D = () => S.teamData();
const uname = e => (D().users.find(u => u.email === e) || {}).name || (e ? e.split('@')[0] : 'Unassigned');
const cl = id => D().clients.find(c => c.id === id) || {};
const late = t => t.due && t.due < today() && t.status !== 'done';
const openT = t => !['resolved', 'closed'].includes(t.status);
const unreadTeam = t => (t.lastClientAt || 0) > (t.seenTeamAt || 0);
const unreadClient = t => (t.lastTeamAt || 0) > (t.seenClientAt || 0);
const go = h => location.hash = h;
const DEF_SECTIONS = STAT.map(([k, l]) => ({ id: 's_' + k, name: l, status: k }));
const sections = c => c.sections && c.sections.length ? c.sections : DEF_SECTIONS;
const secOf = t => t.section || 's_' + t.status;
const health = t => t.status === 'done' ? ['done', 'Done'] : late(t) ? ['off', 'Off track'] : (t.due && t.due <= addDays(1)) ? ['risk', 'At risk'] : ['on', 'On track'];
const prog = id => { const a = D().tasks.filter(t => t.clientId === id); return a.length ? Math.round(a.filter(t => t.status === 'done').length * 100 / a.length) : 0; };
const prjIcon = (c, sz = 22) => `<span class="picon" style="background:${c.color};width:${sz}px;height:${sz}px;font-size:${sz * .55}px">${c.icon || ini((c.name || '').replace('DEMO · ', ''))[0]}</span>`;
const cname = c => (c.name || '').replace('DEMO · ', '');

function render() {
  const u = me(), h = location.hash.slice(2).split('/');
  const banner = S.mode === 'demo' ? `<div class="banner">DEMO MODE · sample data saved only in this browser · <a href="#" onclick="S.resetDemo();toast('Demo data reset');return false">Reset demo</a></div>` : '';
  if (!u) return $('#app').innerHTML = banner + loginView();
  if (u.role === 'client') { if (!['portal', 'ctickets', 'cticket', 'cnew'].includes(h[0])) return go('/portal'); return $('#app').innerHTML = banner + clientShell(h); }
  if (!['home', 'my', 'inbox', 'tickets', 'reporting', 'project', 'templates', 'team', 'clients', 'portfolios'].includes(h[0])) return go('/home');
  const sy = $('.content')?.scrollTop;
  $('#app').innerHTML = banner + teamShell(h); bindDnD();
  if (sy) $('.content').scrollTop = sy;
}

// ---------- LOGIN ----------
function loginView() {
  const t = ui.loginTab, demo = S.mode === 'demo';
  const creds = t === 'team' ? [['admin@sparrow.demo', 'admin123', 'Admin'], ['member@sparrow.demo', 'member123', 'Member']] : [['client1@sparrow.demo', 'client123', 'Glow Home'], ['client2@sparrow.demo', 'client123', 'FitKart']];
  return `<div class="login"><div class="lhero"><img src="${MASCOT}" alt="Sparrow mascot"><h2>Sparrow Web Solutions</h2><p>Amazon SPN · Tasks, projects & client support in one place</p></div>
  <div class="lbox"><div class="brand" style="margin-bottom:6px"><img src="${ICON}" class="blogo"><div><b>Sparrow Tasks</b><small>Sparrow Web Solutions</small></div></div>
  <div class="seg"><button class="${t === 'team' ? 'on' : ''}" onclick="ui.loginTab='team';render()">👥 Team Login</button><button class="${t === 'client' ? 'on' : ''}" onclick="ui.loginTab='client';render()">🏢 Client Login</button></div>
  <p class="mute" style="margin:10px 0 0">${t === 'team' ? 'For Sparrow team – admin & members.' : 'For clients – see your project progress & raise support tickets.'}</p>
  <form onsubmit="doLogin(event)"><label>Email</label><input id="le" type="email" required autocomplete="username"><label>Password</label><input id="lp" type="password" required autocomplete="current-password">
  <div id="lerr" class="err"></div><button class="btn" style="width:100%;margin-top:14px">Login</button></form>
  ${!demo ? `<button class="btn ghost" style="width:100%;margin-top:8px" onclick="doGoogle()">Continue with Google</button>` : ''}
  ${demo ? `<div class="demo"><b>Demo logins (tap to fill):</b><br>${creds.map(c => `${c[2]}: <code onclick="$('#le').value='${c[0]}';$('#lp').value='${c[1]}'">${c[0]} / ${c[1]}</code>`).join('<br>')}</div>` : ''}
  </div></div>`;
}
async function doLogin(e) { e.preventDefault(); try { await S.signIn(ui.loginTab, $('#le').value, $('#lp').value); go(ui.loginTab === 'team' ? '/home' : '/portal'); render(); } catch (x) { $('#lerr').textContent = x.message; } }
async function doGoogle() { try { await S.signInGoogle(ui.loginTab); render(); } catch (x) { $('#lerr').textContent = x.message; } }
async function logout() { ui.task = null; portalCache = null; await S.signOut(); go('/'); render(); }

// ---------- NOTIFICATIONS (derived) ----------
function notifs() {
  const u = me(), d = D(), out = [], seen = +localStorage.getItem('sp-inbox-' + u.email) || 0;
  d.tasks.forEach(t => {
    (t.activity || []).forEach(a => { if (a.by !== u.name && (t.assignee === u.email || (t.collaborators || []).includes(u.email))) out.push({ at: a.at, icon: '📝', text: `<b>${esc(a.by)}</b> ${esc(a.text)}`, sub: t.title, task: t.id }); });
    (t.comments || []).forEach(c => { if (c.by !== u.name && (t.assignee === u.email || (t.collaborators || []).includes(u.email))) out.push({ at: c.at, icon: '💬', text: `<b>${esc(c.by)}</b> commented: ${esc(c.text.slice(0, 80))}`, sub: t.title, task: t.id }); });
    if (late(t) && t.assignee === u.email) out.push({ at: Date.now() - 1, icon: '⏰', text: `Overdue since ${fmt(t.due)}`, sub: t.title, task: t.id });
  });
  S.tickets().forEach(t => {
    if (t.status === 'new') out.push({ at: t.createdAt, icon: '🎫', text: `New ticket from <b>${esc(cname(cl(t.clientId)))}</b>`, sub: `#${t.no} ${t.title}`, ticket: t.id });
    else if (unreadTeam(t) && (!t.assignee || t.assignee === u.email)) out.push({ at: t.lastClientAt, icon: '💬', text: `Client replied on ticket`, sub: `#${t.no} ${t.title}`, ticket: t.id });
  });
  out.sort((a, b) => b.at - a.at); out.forEach(n => n.unread = n.at > seen); return out.slice(0, 60);
}

// ---------- TEAM SHELL ----------
function teamShell(h) {
  const d = D(), u = me(), nt = S.tickets().filter(t => t.status === 'new' || unreadTeam(t)).length, ni = notifs().filter(n => n.unread).length;
  const nav = [['home', '🏠', 'Home'], ['inbox', '🔔', 'Inbox', ni], ['my', '✅', 'My tasks'], ['tickets', '🎫', 'Tickets', nt], ['reporting', '📊', 'Reporting'], ['portfolios', '🗂', 'Portfolios']];
  const views = { home: homeView, my: myView, inbox: inboxView, tickets: () => ticketsView(h[1]), reporting: reportView, project: () => projectView(h[1], h[2]), templates: templatesView, portfolios: portfoliosView, team: teamView, clients: teamView };
  const body = views[h[0]]();
  return `<div class="shell ${ui.collapsed ? 'collapsed' : ''} ${ui.drawer ? 'drawer' : ''}">
  <header class="topbar"><button class="iconbtn" aria-label="Menu" onclick="toggleSide()">☰</button>
   <a href="#/home" class="brand"><img src="${ICON}" class="blogo"><b class="hide-s">Sparrow Tasks</b></a>
   <button class="btn create" onclick="createMenu(event)">＋ <span class="hide-s">Create</span></button>
   <div class="search"><span>🔍</span><input id="q" placeholder="Search tasks, projects, tickets" value="${esc(ui.q)}" oninput="ui.q=this.value;searchDrop()" onfocus="searchDrop()" onblur="setTimeout(()=>$('#sres')&&($('#sres').innerHTML=''),200)"><div id="sres"></div></div>
   <div class="avwrap" onclick="userMenu(event)">${av(u.email, 30)}</div></header>
  <aside class="side" onclick="if(event.target.closest('a'))ui.drawer=false"><button class="btn screate" onclick="createMenu(event)">＋ <span>Create</span></button>
   <nav>${nav.map(n => `<a href="#/${n[0]}" class="${h[0] === n[0] ? 'on' : ''}" title="${n[2]}"><i>${n[1]}</i><span>${n[2]}</span>${n[3] ? `<em class="badge">${n[3]}</em>` : ''}</a>`).join('')}</nav>
   <div class="sh"><span>Work · Projects</span><a href="#/templates" title="New project" class="plus">＋</a></div>
   <nav>${d.clients.map(c => `<a href="#/project/${c.id}/${ui.tab}" class="${h[1] === c.id ? 'on' : ''}" title="${esc(c.name)}"><i>${prjIcon(c, 18)}</i><span>${esc(cname(c))}</span></a>`).join('')}</nav>
   <div class="sh"><span>Teams</span></div>
   <nav><a href="#/team" class="${h[0] === 'team' ? 'on' : ''}" title="Team & logins"><i>👥</i><span>Sparrow team & logins</span></a><a href="#/templates" class="${h[0] === 'templates' ? 'on' : ''}" title="Templates"><i>🧩</i><span>Templates</span></a></nav>
   <div class="sidefoot"><img src="${MASCOT}" alt=""><span>May I help you?<br><a href="#" onclick="logout();return false">Logout</a></span></div>
  </aside><div class="scrim" onclick="ui.drawer=false;render()"></div>
  <main class="content ${ui.task ? 'withpane' : ''}">${body}</main>${ui.task ? taskPane() : ''}
  <div id="pop"></div></div>`;
}
function toggleSide() { if (innerWidth <= 820) ui.drawer = !ui.drawer; else { ui.collapsed = !ui.collapsed; localStorage.setItem('sp-col', ui.collapsed ? '1' : '0'); } render(); }
function pop(e, html) { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); $('#pop').innerHTML = `<div class="popm" style="top:${r.bottom + 6}px;${r.left > innerWidth / 2 ? `right:${Math.max(8, innerWidth - r.right)}px` : `left:${r.left}px`}">${html}</div>`; setTimeout(() => document.addEventListener('click', () => $('#pop') && ($('#pop').innerHTML = ''), { once: true })); }
const createMenu = e => pop(e, `<a onclick="newTask()">✅ Task</a><a onclick="go('/templates')">📁 Project (from template)</a>${me().role === 'admin' ? `<a onclick="editUser()">👤 Team member</a><a onclick="editUser(null,'${D().clients[0]?.id || ''}')">🏢 Client login</a>` : ''}`);
const userMenu = e => pop(e, `<div style="padding:8px 12px"><b>${esc(me().name)}</b><div class="mute">${esc(me().email)} · ${me().role}</div></div><a onclick="go('/team')">👥 Team & logins</a><a onclick="logout()">↩ Logout</a>`);
function searchDrop() {
  const q = ui.q.trim().toLowerCase(), el = $('#sres'); if (!el) return; if (!q) return el.innerHTML = '';
  const d = D(), r = [...d.clients.filter(c => c.name.toLowerCase().includes(q)).map(c => `<a onmousedown="go('/project/${c.id}/list')">${prjIcon(c, 16)} ${esc(c.name)}</a>`),
  ...d.tasks.filter(t => t.title.toLowerCase().includes(q)).slice(0, 8).map(t => `<a onmousedown="openTask('${t.id}')">✅ ${esc(t.title)} <span class="mute">· ${esc(cname(cl(t.clientId)))}</span></a>`),
  ...S.tickets().filter(t => t.title.toLowerCase().includes(q)).slice(0, 5).map(t => `<a onmousedown="go('/tickets/${t.id}')">🎫 #${t.no} ${esc(t.title)}</a>`)];
  el.innerHTML = `<div class="popm" style="position:absolute;top:40px;left:0;right:0">${r.join('') || '<div class="mute" style="padding:10px">No results</div>'}</div>`;
}
const page = (title, extra = '', sub = '') => `<div class="phead"><div style="flex:1;min-width:0"><h1>${title}</h1>${sub ? `<div class="mute">${sub}</div>` : ''}</div>${extra}</div>`;

// ---------- HOME ----------
function homeView() {
  const d = D(), u = me(), hr = new Date().getHours(), g = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const mine = d.tasks.filter(t => t.assignee === u.email && t.status !== 'done');
  const tabs = { upcoming: mine.filter(t => !late(t)), overdue: mine.filter(late), completed: d.tasks.filter(t => t.assignee === u.email && t.status === 'done') };
  const ht = ui.homeTab || 'upcoming', ot = S.tickets().filter(openT);
  return `<div class="home"><div class="hello"><div class="mute">${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1>${g}, ${esc(u.name.split(' ')[0])}</h1>
  <div class="chips"><span>✅ ${tabs.completed.length} tasks completed</span><span>⏰ ${tabs.overdue.length} overdue</span><span>🎫 ${ot.length} open tickets · ${ot.filter(t => t.status === 'new').length} new</span></div></div>
  <div class="grid g2"><div class="card widget"><div class="wh">${av(u.email, 34)}<h3>My tasks</h3><a href="#/my" class="mute">See all</a></div>
   <div class="utabs">${['upcoming', 'overdue', 'completed'].map(k => `<button class="${ht === k ? 'on' : ''}" onclick="ui.homeTab='${k}';render()">${k[0].toUpperCase() + k.slice(1)} (${tabs[k].length})</button>`).join('')}</div>
   ${tabs[ht].slice(0, 8).map(t => miniRow(t)).join('') || '<p class="mute">Nothing here 🎉</p>'}<a class="addrow" onclick="newTask()">＋ Create task</a></div>
  <div class="card widget"><div class="wh"><h3>Projects</h3><a href="#/templates" class="mute">＋ New</a></div><div class="plist">
   <a class="pnew" href="#/templates"><span class="picon dash">＋</span><span>Create project</span></a>
   ${d.clients.map(c => `<a href="#/project/${c.id}/list"><span style="position:relative">${prjIcon(c, 44)}</span><span><b>${esc(cname(c))}</b><small class="mute">${prog(c.id)}% · ${d.tasks.filter(t => t.clientId === c.id && t.status !== 'done').length} open</small></span></a>`).join('')}</div></div>
  <div class="card widget"><div class="wh"><h3>🎫 Tickets needing attention</h3><a href="#/tickets" class="mute">Open inbox</a></div>${S.tickets().filter(t => t.status === 'new' || unreadTeam(t)).map(tkRow).join('') || '<p class="mute">All caught up</p>'}</div>
  <div class="card widget"><div class="wh"><h3>⏰ Overdue across team</h3></div>${d.tasks.filter(late).map(t => miniRow(t, 1)).join('') || '<p class="mute">Nothing overdue 🎉</p>'}</div></div></div>`;
}
function miniRow(t, showAs) {
  return `<div class="mrow" onclick="openTask('${t.id}')"><button class="cbx ${t.status === 'done' ? 'on' : ''}" onclick="event.stopPropagation();toggleDone('${t.id}')" aria-label="Complete">✓</button>
  <span class="tt">${t.milestone ? '◆ ' : ''}${esc(t.title)}</span><span class="pchip" style="background:${cl(t.clientId).color}22;color:${cl(t.clientId).color}">${esc(cname(cl(t.clientId)).slice(0, 14))}</span>${showAs ? av(t.assignee, 20) : ''}<span class="due ${late(t) ? 'late' : ''}">${fmt(t.due)}</span></div>`;
}
async function toggleDone(id) {
  const t = JSON.parse(JSON.stringify(D().tasks.find(x => x.id === id))), c = cl(t.clientId), secs = sections(c);
  t.status = t.status === 'done' ? 'todo' : 'done'; t.activity.push({ at: Date.now(), by: me().name, text: t.status === 'done' ? 'marked complete' : 'marked incomplete' });
  if (!c.sections) t.section = 's_' + t.status; await S.save('tasks', t); if (t.status === 'done') toast('🎉 Task completed'); render();
}
// ---------- MY TASKS / INBOX / REPORTING ----------
function myView() {
  const a = D().tasks.filter(t => t.assignee === me().email), groups = [['⏰ Overdue', a.filter(late)], ['📅 Today', a.filter(t => t.due === today() && t.status !== 'done')], ['🗓 Upcoming', a.filter(t => t.status !== 'done' && !late(t) && t.due !== today())], ['✅ Completed', a.filter(t => t.status === 'done')]];
  return page(`${av(me().email, 32)} My tasks`, `<button class="btn" onclick="newTask()">＋ Add task</button>`) + `<div class="list">${listHead(true)}${groups.map(([n, g]) => `<div class="lsec"><div class="lsh">▾ ${n} <span class="mute">${g.length}</span></div>${g.map(t => listRow(t, true)).join('')}</div>`).join('')}</div>`;
}
function inboxView() {
  const n = notifs(); localStorage.setItem('sp-inbox-' + me().email, Date.now());
  return page('🔔 Inbox', '', 'Updates on tasks you own or follow, plus ticket activity') + `<div class="card" style="padding:0">${n.map(x => `<div class="nrow ${x.unread ? 'unread' : ''}" onclick="${x.task ? `openTask('${x.task}')` : `go('/tickets/${x.ticket}')`}"><span class="nic">${x.icon}</span><div style="flex:1;min-width:0"><div>${x.text}</div><div class="mute ell">${esc(x.sub)}</div></div><span class="mute">${ago(x.at)}</span></div>`).join('') || '<p class="mute" style="padding:16px">No notifications</p>'}</div>`;
}
function reportView() {
  const d = D(), tm = d.users.filter(u => u.role !== 'client'), tks = S.tickets();
  const bar = (l, v, max, col) => `<div class="rb"><span class="ell">${l}</span><div class="bar"><i style="width:${max ? v * 100 / max : 0}%;background:${col || ''}"></i></div><b>${v}</b></div>`;
  const byS = STAT.map(([k, l]) => [l, d.tasks.filter(t => t.status === k).length]), mx = Math.max(1, ...byS.map(x => x[1]));
  const byA = tm.map(u => [u.name, d.tasks.filter(t => t.assignee === u.email && t.status !== 'done').length]), ma = Math.max(1, ...byA.map(x => x[1]));
  const byC = CATS.map(c => [c, tks.filter(t => t.category === c).length]), mc = Math.max(1, ...byC.map(x => x[1]));
  return page('📊 Reporting', '', 'Team workload, project progress & tickets') + `<div class="grid g4">
  <div class="card stat"><b>${d.tasks.filter(t => t.status !== 'done').length}</b><span>Open tasks</span></div><div class="card stat"><b>${d.tasks.filter(t => t.status === 'done').length}</b><span>Completed</span></div>
  <div class="card stat"><b class="late">${d.tasks.filter(late).length}</b><span>Overdue</span></div><div class="card stat"><b>${tks.filter(openT).length}</b><span>Open tickets · ${tks.filter(t => t.status === 'new').length} new</span></div></div>
  <div class="grid g2" style="margin-top:14px"><div class="card"><h3>Tasks by status</h3>${byS.map(x => bar(...x, mx)).join('')}</div><div class="card"><h3>Open tasks by assignee</h3>${byA.map(x => bar(...x, ma, '#0ea5e9')).join('')}</div>
  <div class="card"><h3>Project progress</h3>${d.clients.map(c => bar(cname(c), prog(c.id), 100, c.color)).join('')}</div><div class="card"><h3>Tickets by category</h3>${byC.map(x => bar(...x, mc, '#f59e0b')).join('')}</div></div>`;
}

// ---------- PROJECT ----------
function projectView(id, tab) {
  const c = cl(id); if (!c.id) return page('Project not found');
  tab = ui.tab = ['overview', 'list', 'board', 'timeline', 'dashboard', 'calendar', 'messages', 'files'].includes(tab) ? tab : 'list';
  const tabs = [['overview', 'Overview'], ['list', 'List'], ['board', 'Board'], ['timeline', 'Timeline'], ['dashboard', 'Dashboard'], ['calendar', 'Calendar'], ['messages', 'Messages'], ['files', 'Files']];
  const head = `<div class="prhead"><div class="prtitle">${prjIcon(c, 34)}<div style="min-width:0"><h1 class="ell">${esc(c.name)}</h1><div class="mute ell">${esc(c.project || '')} · ${prog(id)}% complete</div></div>
   ${me().role === 'admin' ? `<button class="iconbtn" title="Edit project" onclick="editClient('${id}')">⌄</button>` : ''}<span style="flex:1"></span><span class="avs hide-s">${[...new Set(ptasks(c).map(t => t.assignee).filter(Boolean))].slice(0, 4).map(e => av(e, 26)).join('')}</span>
   ${me().role === 'admin' ? `<button class="btn sm" onclick="editUser(null,'${id}')" title="Give the client a login">👤 Share</button>` : ''}<button class="btn ghost sm hide-s" onclick="customizeMenu(event,'${id}')">⚙ Customize</button></div>
   <div class="ptabs">${tabs.map(([k, l]) => `<a href="#/project/${id}/${k}" class="${tab === k ? 'on' : ''}">${l}</a>`).join('')}</div></div>
   ${tab === 'list' ? listToolbar(c) : tab === 'board' ? `<div class="toolbar"><button class="btn sm" onclick="newTask('${id}')">＋ Add task</button><button class="btn ghost sm" onclick="addSection('${id}')">＋ Add section</button></div>` : ''}`;
  return head + { dashboard: pdashTab, overview: overviewTab, list: listTab, board: boardTab, timeline: timelineTab, calendar: calendarTab, messages: messagesTab, files: filesTab, list: listTabV3 }[tab](c);
}
const ptasks = c => D().tasks.filter(t => t.clientId === c.id).sort((a, b) => (a.order || 0) - (b.order || 0));
function listHead(showP) { return `<div class="lrow lhead"><span class="c-name">Task name</span><span class="c-as">Assignee</span><span class="c-due">Due date</span><span class="c-pr">Priority</span><span class="c-st">Status</span>${showP ? '<span class="c-prj">Project</span>' : '<span class="c-vis">Client</span>'}</div>`; }
function listRow(t, showP) {
  const tm = D().users.filter(u => u.role !== 'client');
  return `<div class="lrow ${t.status === 'done' ? 'done' : ''} ${ui.task === t.id ? 'sel' : ''}" data-id="${t.id}" draggable="true">
  <span class="c-name"><button class="cbx ${t.status === 'done' ? 'on' : ''}" onclick="toggleDone('${t.id}')" aria-label="Complete">✓</button>
   <input class="inl" value="${esc(t.title)}" onchange="inl('${t.id}','title',this.value)">${(t.checklist || []).length ? `<span class="mute sm">☑${t.checklist.filter(x => x.done).length}/${t.checklist.length}</span>` : ''}${(t.comments || []).length ? `<span class="mute sm">💬${t.comments.length}</span>` : ''}
   <button class="openp" onclick="openTask('${t.id}')" title="Open details">Details ›</button></span>
  <span class="c-as">${av(t.assignee, 22)}<select class="inl" onchange="inl('${t.id}','assignee',this.value)">${tm.map(u => `<option value="${u.email}" ${u.email === t.assignee ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></span>
  <span class="c-due"><input type="date" class="inl ${late(t) ? 'late' : ''}" value="${t.due || ''}" onchange="inl('${t.id}','due',this.value)"></span>
  <span class="c-pr"><select class="chip p-${t.priority}" onchange="inl('${t.id}','priority',this.value)">${['high', 'medium', 'low'].map(p => `<option ${p === t.priority ? 'selected' : ''}>${p}</option>`).join('')}</select></span>
  <span class="c-st"><span class="chip h-${health(t)[0]}">${health(t)[1]}</span></span>
  ${showP ? `<span class="c-prj"><span class="pchip" style="background:${cl(t.clientId).color}22;color:${cl(t.clientId).color}">${esc(cname(cl(t.clientId)))}</span></span>` : `<span class="c-vis">${t.clientVisible ? '<span class="chip vis">👁 Visible</span>' : '<span class="mute sm">Internal</span>'}</span>`}</div>`;
}
function listTab(c) {
  const a = ptasks(c);
  return `<div class="list">${listHead()}${sections(c).map(s => { const g = a.filter(t => secOf(t) === s.id); return `<div class="lsec" data-sec="${s.id}"><div class="lsh">▾ ${esc(s.name)} <span class="mute">${g.length}</span></div>${g.map(t => listRow(t)).join('')}<a class="addrow" onclick="newTask('${c.id}','${s.id}')">Add task…</a></div>`; }).join('')}<a class="addsec" onclick="addSection('${c.id}')">＋ Add section</a></div>`;
}
async function inl(id, k, v) {
  const t = JSON.parse(JSON.stringify(D().tasks.find(x => x.id === id))); if (t[k] === v) return; const old = t[k]; t[k] = v;
  const lab = { title: 'renamed the task', assignee: `assigned to ${uname(v)}`, due: `changed due date to ${fmt(v)}`, priority: `set priority to ${v}`, status: `set status to ${SL(v)}`, clientVisible: v ? 'made visible to client' : 'made internal', milestone: v ? 'marked as milestone' : 'unmarked milestone', desc: 'updated description' }[k];
  if (lab && !(k === 'desc' && (t.activity.at(-1) || {}).text === lab)) t.activity.push({ at: Date.now(), by: me().name, text: lab });
  if (k === 'status' && !cl(t.clientId).sections) t.section = 's_' + v;
  await S.save('tasks', t); if (k !== 'title' && k !== 'desc') render();
}
function boardTab(c) {
  const a = ptasks(c);
  return `<div class="board">${sections(c).map(s => { const col = a.filter(t => secOf(t) === s.id); return `<div class="col" data-sec="${s.id}"><h3>${esc(s.name)} <span class="mute">${col.length}</span></h3>${col.map(card).join('')}<a class="addrow" onclick="newTask('${c.id}','${s.id}')">＋ Add task</a></div>`; }).join('')}
  <div class="col addcol" onclick="addSection('${c.id}')">＋ Add section</div></div>`;
}
function card(t) {
  const ck = t.checklist || [];
  return `<div class="tk ${t.status === 'done' ? 'done' : ''}" draggable="true" data-id="${t.id}" onclick="openTask('${t.id}')"><div class="t"><button class="cbx ${t.status === 'done' ? 'on' : ''}" onclick="event.stopPropagation();toggleDone('${t.id}')">✓</button><span>${t.milestone ? '◆ ' : ''}${esc(t.title)}</span></div>
  <div class="meta"><span class="chip p-${t.priority}">${t.priority}</span>${t.clientVisible ? '<span class="chip vis">👁 Client</span>' : ''}</div>
  <div class="meta">${av(t.assignee, 22)}<span class="due ${late(t) ? 'late' : ''}">${fmt(t.due)}</span><span style="margin-left:auto" class="mute sm">${ck.length ? `☑ ${ck.filter(x => x.done).length}/${ck.length}` : ''} ${(t.comments || []).length ? `💬 ${t.comments.length}` : ''}</span></div></div>`;
}
function bindDnD() {
  $$('[draggable][data-id]').forEach(el => { el.ondragstart = e => { e.dataTransfer.setData('id', el.dataset.id); el.classList.add('drag'); }; el.ondragend = () => el.classList.remove('drag'); });
  $$('.col[data-sec],.lsec[data-sec]').forEach(col => {
    col.ondragover = e => { e.preventDefault(); col.classList.add('over'); }; col.ondragleave = () => col.classList.remove('over');
    col.ondrop = async e => { e.preventDefault(); col.classList.remove('over'); moveTo(e.dataTransfer.getData('id'), col.dataset.sec); };
  });
}
async function moveTo(id, sec) {
  const t0 = D().tasks.find(x => x.id === id); if (!t0 || secOf(t0) === sec) return;
  const c = cl(t0.clientId), s = sections(c).find(x => x.id === sec), t = JSON.parse(JSON.stringify(t0));
  t.section = sec; t.order = Date.now(); if (s.status) t.status = s.status; else if (/done|resolved|complete/i.test(s.name)) t.status = 'done'; else if (t.status === 'done') t.status = 'doing';
  t.activity.push({ at: Date.now(), by: me().name, text: `moved to ${s.name}` }); await S.save('tasks', t); render();
}
async function addSection(cid) {
  const n = prompt('Section name'); if (!n) return; const c = JSON.parse(JSON.stringify(cl(cid)));
  if (!c.sections) { c.sections = DEF_SECTIONS.map(x => ({ ...x })); }
  c.sections.push({ id: 's' + Date.now().toString(36), name: n }); await S.save('clients', c); render();
}
function timelineTab(c) {
  const a = ptasks(c).filter(t => t.due); if (!a.length) return '<div class="card mute">No dated tasks</div>';
  const st = t => t.start || addDays(-(t.milestone ? 0 : 3), t.due);
  let min = a.map(st).sort()[0], max = a.map(t => t.due).sort().at(-1); min = addDays(-1, min); max = addDays(2, max);
  const span = (new Date(max) - new Date(min)) / 864e5, pos = d => (new Date(d) - new Date(min)) / 864e5 * 100 / span;
  const days = []; for (let i = 0; i <= span; i++) days.push(addDays(i, min));
  return `<div class="card tl"><div class="tlh">${days.map(d => `<span style="left:${pos(d)}%" class="${d === today() ? 'td' : ''}">${new Date(d + 'T00:00').getDate()}</span>`).join('')}</div>
  <div class="tlb"><i class="tlnow" style="left:${pos(today())}%"></i>${sections(c).map(s => { const g = a.filter(t => secOf(t) === s.id); return g.length ? `<div class="tls">${esc(s.name)}</div>` + g.map(t => `<div class="tlr"><div class="tlbar ${t.milestone ? 'ms' : ''} ${t.status === 'done' ? 'done' : ''}" style="left:${pos(st(t))}%;width:${t.milestone ? 0 : Math.max(2, pos(addDays(1, t.due)) - pos(st(t)))}%;--c:${c.color}" onclick="openTask('${t.id}')" title="${esc(t.title)}"><span>${esc(t.title)}</span></div></div>`).join('') : ''; }).join('')}</div></div>`;
}
function calendarTab(c) {
  const base = ui.calMonth || today().slice(0, 7), first = new Date(base + '-01T00:00'), startDow = (first.getDay() + 6) % 7, dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const a = ptasks(c), cells = [];
  for (let i = 0; i < startDow; i++) cells.push('<div class="cd empty"></div>');
  for (let d = 1; d <= dim; d++) { const ds = base + '-' + String(d).padStart(2, '0'); cells.push(`<div class="cd ${ds === today() ? 'today' : ''}"><b>${d}</b>${a.filter(t => t.due === ds).map(t => `<a class="ce ${t.status === 'done' ? 'done' : ''}" style="--c:${c.color}" onclick="openTask('${t.id}')">${esc(t.title)}</a>`).join('')}</div>`); }
  const shift = n => { const x = new Date(first); x.setMonth(x.getMonth() + n); return x.toISOString().slice(0, 7); };
  return `<div class="card"><div class="phead" style="margin:0 0 10px"><h3 style="flex:1;margin:0">${first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h3><button class="btn ghost sm" onclick="ui.calMonth='${shift(-1)}';render()">‹</button><button class="btn ghost sm" onclick="ui.calMonth=null;render()">Today</button><button class="btn ghost sm" onclick="ui.calMonth='${shift(1)}';render()">›</button></div>
  <div class="cal">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => `<div class="cdh">${x}</div>`).join('')}${cells.join('')}</div></div>`;
}
function filesTab(c) {
  const f = ptasks(c).flatMap(t => (t.attachments || []).map(a => ({ ...a, task: t })));
  return `<div class="card">${f.map(x => `<div class="frow"><span class="fic">📄</span><div style="flex:1;min-width:0"><a href="${esc(x.url)}" target="_blank">${esc(x.name)}</a><div class="mute sm ell">on <a onclick="openTask('${x.task.id}')">${esc(x.task.title)}</a></div></div></div>`).join('') || '<p class="mute">No files yet. Attach files or links from a task.</p>'}</div>`;
}
function overviewTab(c) {
  const a = ptasks(c), ms = a.filter(t => t.milestone), logins = D().users.filter(u => u.role === 'client' && u.clientId === c.id), ups = D().updates.filter(u => u.clientId === c.id).sort((x, y) => y.at - x.at);
  const team = [...new Set(a.map(t => t.assignee).filter(Boolean))];
  return `<div class="grid ov"><div><div class="card"><h3>Project description</h3><p>${esc(c.desc || c.project || 'No description')}</p>
   <div class="rb"><span>Progress</span><div class="bar"><i style="width:${prog(c.id)}%;background:${c.color}"></i></div><b>${prog(c.id)}%</b></div></div>
  <div class="card" style="margin-top:14px"><h3>📣 Client updates <span class="chip vis">visible to client</span></h3><input id="ut" placeholder="Title e.g. Listings live ✅"><textarea id="ub" placeholder="Message for the client" style="margin-top:8px"></textarea>
   <button class="btn" style="margin-top:8px" onclick="postUpdate('${c.id}')">Publish to client</button>
   ${ups.map(u => `<div class="cm"><b>${esc(u.title)}</b><div>${esc(u.body)}</div><small class="mute">${esc(u.byName)} · ${ago(u.at)}</small> <a href="#" class="sm" onclick="S.remove('updates','${u.id}');return false">delete</a></div>`).join('')}</div></div>
  <div><div class="card"><h3>◆ Milestones</h3>${ms.map(t => `<div class="mrow" onclick="openTask('${t.id}')"><span class="msd ${t.status === 'done' ? 'on' : ''}">◆</span><span class="tt">${esc(t.title)}</span><span class="due ${late(t) ? 'late' : ''}">${fmt(t.due)}</span></div>`).join('') || '<p class="mute">No milestones</p>'}</div>
  <div class="card" style="margin-top:14px"><h3>Project members</h3><div class="avs">${team.map(e => `<span class="avn">${av(e, 28)} ${esc(uname(e))}</span>`).join('')}</div>
   <h3 style="margin-top:14px">Client logins</h3>${logins.map(u => `<div class="avn">🏢 ${esc(u.name)} <span class="mute sm">${esc(u.email)}</span></div>`).join('') || '<p class="mute sm">None yet</p>'}${me().role === 'admin' ? `<button class="btn ghost sm" style="margin-top:8px" onclick="editUser(null,'${c.id}')">＋ Client login</button>` : ''}</div></div></div>`;
}
async function postUpdate(id) { const t = $('#ut').value.trim(); if (!t) return; await S.save('updates', { clientId: id, title: t, body: $('#ub').value, at: Date.now(), byName: me().name }); toast('Update published to client'); render(); }

function pdashTab(c) {
  const a = ptasks(c), bar = (l, v, max, col) => `<div class="rb"><span class="ell">${esc(l)}</span><div class="bar"><i style="width:${max ? v * 100 / max : 0}%;background:${col}"></i></div><b>${v}</b></div>`;
  const bs = sections(c).map(s => [s.name, a.filter(t => secOf(t) === s.id && t.status !== 'done').length]), m1 = Math.max(1, ...bs.map(x => x[1]));
  const ba = [...new Set(a.map(t => t.assignee))].map(e => [uname(e), a.filter(t => t.assignee === e && t.status !== 'done').length]), m2 = Math.max(1, ...ba.map(x => x[1]));
  return `<div class="grid g4"><div class="card stat"><b>${a.filter(t => t.status === 'done').length}</b><span>Completed tasks</span></div><div class="card stat"><b>${a.filter(t => t.status !== 'done').length}</b><span>Incomplete tasks</span></div><div class="card stat"><b class="late">${a.filter(late).length}</b><span>Overdue tasks</span></div><div class="card stat"><b>${a.length}</b><span>Total tasks</span></div></div>
  <div class="grid g2" style="margin-top:14px"><div class="card"><h3>Incomplete tasks by section</h3>${bs.map(x => bar(...x, m1, c.color)).join('')}</div><div class="card"><h3>Incomplete tasks by assignee</h3>${ba.map(x => bar(...x, m2, '#4075cf')).join('')}</div></div>`;
}
// ---------- TEMPLATES ----------
function templatesView() {
  const cats = ['All', 'Amazon', 'Ads & Marketing', 'Support', 'Operations'], cat = ui.tcat || 'All';
  const inCat = t => cat === 'All' || (t.cat || []).includes(cat);
  return page('Template gallery', '', 'Ready-made workflows for Amazon SPN work. Each creates sections + tasks with due dates.') +
  `<div class="utabs" style="margin-bottom:16px">${cats.map(k => `<button class="${cat === k ? 'on' : ''}" onclick="ui.tcat='${k}';render()">${k}</button>`).join('')}</div><h3>Sparrow templates</h3><div class="tgrid">${TEMPLATES.filter(t => t.id === 'blank' || inCat(t)).map(t => `<div class="tcard" onclick="useTemplate('${t.id}')"><div class="tbanner" style="background:linear-gradient(135deg,${t.color},${t.color}aa)">${t.icon}</div>
  <div style="padding:12px 14px"><b>${esc(t.name)}</b><p class="mute sm">${esc(t.desc)}</p><div class="mute sm">${t.sections.length} sections · ${t.sections.reduce((a, s) => a + s.tasks.length, 0)} tasks</div></div></div>`).join('')}</div>`;
}
function useTemplate(id) {
  const t = TEMPLATES.find(x => x.id === id);
  modal(`<h2>${t.icon} ${esc(t.name)}</h2><p class="mute">${esc(t.desc)}</p>
  <label>Client / project name</label><input id="pn" placeholder="e.g. Sharma Electronics" value="">
  <label>Service</label><input id="ps" value="${esc(t.id === 'blank' ? '' : t.name)}"><label>Start date</label><input id="pd" type="date" value="${today()}">
  <label>Default assignee</label><select id="pa">${D().users.filter(u => u.role !== 'client').map(u => `<option value="${u.email}" ${u.email === me().email ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select>
  <div class="tprev">${t.sections.map(s => `<b>${esc(s.name)}</b>${s.tasks.map(k => `<div class="mute sm">• ${esc(k[0])} <span>(day ${k[1]})</span></div>`).join('')}`).join('')}</div>
  <div style="margin-top:16px;display:flex;gap:8px"><button class="btn" onclick="createFromTemplate('${id}')">Create project</button><button class="btn ghost" onclick="closeModal()">Cancel</button></div>`);
}
async function createFromTemplate(id) {
  const t = TEMPLATES.find(x => x.id === id), n = $('#pn').value.trim(); if (!n) return toast('Project name likho');
  const start = $('#pd').value || today(), asg = $('#pa').value;
  const secs = t.sections.map((s, i) => ({ id: 's' + i + Date.now().toString(36), name: s.name, ...(t.id === 'blank' ? { status: STAT[i][0] } : {}) }));
  const c = await S.save('clients', { name: n, project: $('#ps').value, color: t.color, icon: t.icon, template: t.id, sections: secs, desc: t.desc });
  let o = Date.now();
  for (const [i, s] of t.sections.entries()) for (const k of s.tasks)
    await S.save('tasks', { clientId: c.id, title: k[0], section: secs[i].id, status: 'todo', assignee: asg, due: addDays(k[1], start), priority: k[2], clientVisible: !!k[3], milestone: !!k[4], desc: '', checklist: [], comments: [], attachments: [], collaborators: [], activity: [{ at: Date.now(), by: me().name, text: `created from template “${t.name}”` }], order: o++ });
  closeModal(); toast('Project created'); go(`/project/${c.id}/list`);
}

// ---------- TASK PANE ----------
function newTask(clientId, section) {
  const h = location.hash.split('/'), c = cl(clientId || (h[1] === 'project' ? h[2] : '') || D().clients[0]?.id);
  const sec = section || sections(c)[0].id, s = sections(c).find(x => x.id === sec);
  S.save('tasks', { clientId: c.id, title: 'New task', section: sec, status: s.status || 'todo', assignee: me().email, due: addDays(2), priority: 'medium', desc: '', clientVisible: false, milestone: false, checklist: [], comments: [], attachments: [], collaborators: [], activity: [{ at: Date.now(), by: me().name, text: 'created this task' }], order: Date.now() })
    .then(t => { ui.task = t.id; ui.focusTitle = 1; render(); });
}
function openTask(id) { ui.task = id; render(); }
function closePane() { ui.task = null; render(); }
function taskPane() {
  const t = D().tasks.find(x => x.id === ui.task); if (!t) { ui.task = null; return ''; }
  const d = D(), c = cl(t.clientId), tm = d.users.filter(u => u.role !== 'client'), col = t.collaborators || [];
  setTimeout(() => { if (ui.focusTitle) { ui.focusTitle = 0; const e = $('#ptitle'); e && (e.focus(), e.select()); } });
  const feed = [...(t.comments || []).map(x => ({ ...x, k: 'c' })), ...(t.activity || []).map(x => ({ ...x, k: 'a' }))].sort((a, b) => a.at - b.at);
  return `<aside class="pane"><div class="pbar"><button class="btn sm ${t.status === 'done' ? 'okb' : 'ghost'}" onclick="toggleDone('${t.id}')">✓ ${t.status === 'done' ? 'Completed' : 'Mark complete'}</button><span style="flex:1"></span>
   <button class="iconbtn" title="Delete" onclick="delTask('${t.id}')">🗑</button><button class="iconbtn" title="Close" onclick="closePane()">✕</button></div>
  <div class="pbody"><textarea id="ptitle" class="ptitle" rows="1" onchange="inl('${t.id}','title',this.value)">${esc(t.title)}</textarea>
  <div class="fields">
   <span>Assignee</span><div>${av(t.assignee, 24)}<select class="inl" onchange="inl('${t.id}','assignee',this.value)">${tm.map(u => `<option value="${u.email}" ${u.email === t.assignee ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></div>
   <span>Due date</span><div><input type="date" class="inl ${late(t) ? 'late' : ''}" value="${t.due || ''}" onchange="inl('${t.id}','due',this.value)"></div>
   <span>Projects</span><div><span class="pchip" style="background:${c.color}22;color:${c.color}">${esc(c.name)}</span> <select class="inl" style="width:auto" onchange="inl('${t.id}','section',this.value)">${sections(c).map(s => `<option value="${s.id}" ${s.id === secOf(t) ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
   <span>Status</span><div><select class="chip s-${t.status}" onchange="inl('${t.id}','status',this.value)">${STAT.map(([k, l]) => `<option value="${k}" ${k === t.status ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
   <span>Priority</span><div><select class="chip p-${t.priority}" onchange="inl('${t.id}','priority',this.value)">${['high', 'medium', 'low'].map(p => `<option ${p === t.priority ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
   <span>Client</span><div><label class="tog"><input type="checkbox" ${t.clientVisible ? 'checked' : ''} onchange="inl('${t.id}','clientVisible',this.checked)"> 👁 Visible to client</label> <label class="tog"><input type="checkbox" ${t.milestone ? 'checked' : ''} onchange="inl('${t.id}','milestone',this.checked)"> ◆ Milestone</label></div>
  </div>
  <h4>Description</h4><textarea class="desc" placeholder="What is this task about?" onchange="inl('${t.id}','desc',this.value)">${esc(t.desc)}</textarea>
  <h4>Subtasks</h4><div class="subs">${(t.checklist || []).map((s, i) => `<div class="sub ${s.done ? 'done' : ''}"><button class="cbx ${s.done ? 'on' : ''}" onclick="subT('${t.id}',${i})">✓</button><span>${esc(s.text)}</span><a onclick="subDel('${t.id}',${i})">✕</a></div>`).join('')}
   <div class="addsub"><input id="sbi" placeholder="＋ Add subtask and press Enter" onkeydown="if(event.key==='Enter')subAdd('${t.id}')"></div></div>
  <h4>Attachments</h4>${(t.attachments || []).map((a, i) => `<div class="frow"><span class="fic">📄</span><a href="${esc(a.url)}" target="_blank" style="flex:1">${esc(a.name)}</a><a onclick="attDel('${t.id}',${i})">✕</a></div>`).join('')}
   <div class="row2"><input id="ati" placeholder="Paste link (Drive, Sheet…)"><button class="btn ghost sm" onclick="attAdd('${t.id}')">Add link</button><label class="btn ghost sm" style="margin:0">File<input type="file" hidden onchange="attFile('${t.id}',this)"></label></div>
  <h4>Comments & activity <span class="internal">INTERNAL · team only</span></h4><div class="feed">${feed.map(x => x.k === 'c' ? `<div class="cm"><div class="cmh">${av((d.users.find(u => u.name === x.by) || {}).email || x.by, 22)} <b>${esc(x.by)}</b> <small class="mute">${ago(x.at)}</small></div><div>${esc(x.text)}</div></div>` : `<div class="act">• <b>${esc(x.by)}</b> ${esc(x.text)} · ${ago(x.at)}</div>`).join('')}</div>
  </div><div class="pfoot"><div class="row2">${av(me().email, 28)}<input id="cmi" placeholder="Add a comment for the team…" onkeydown="if(event.key==='Enter')addCm('${t.id}')"><button class="btn sm" onclick="addCm('${t.id}')">Comment</button></div>
   <div class="collab"><span class="mute sm">Collaborators</span>${[t.assignee, ...col].filter((x, i, a) => x && a.indexOf(x) === i).map(e => av(e, 24)).join('')}
   <select class="inl" style="width:auto" onchange="if(this.value)collabAdd('${t.id}',this.value)"><option value="">＋</option>${tm.filter(u => !col.includes(u.email) && u.email !== t.assignee).map(u => `<option value="${u.email}">${esc(u.name)}</option>`).join('')}</select></div></div></aside>`;
}
const mut = async (id, f) => { const t = JSON.parse(JSON.stringify(D().tasks.find(x => x.id === id))); t.checklist ||= []; t.attachments ||= []; t.comments ||= []; f(t); await S.save('tasks', t); render(); };
const subAdd = id => { const v = $('#sbi').value.trim(); if (v) mut(id, t => { t.checklist.push({ id: Date.now() + '', text: v, done: false }); t.activity.push({ at: Date.now(), by: me().name, text: `added subtask “${v}”` }); }).then(() => $('#sbi')?.focus()); };
const subT = (id, i) => mut(id, t => { t.checklist[i].done = !t.checklist[i].done; if (t.checklist[i].done) t.activity.push({ at: Date.now(), by: me().name, text: `completed subtask “${t.checklist[i].text}”` }); });
const subDel = (id, i) => mut(id, t => t.checklist.splice(i, 1));
const attAdd = id => { const v = $('#ati').value.trim(); if (v) mut(id, t => { t.attachments.push({ id: Date.now() + '', name: v.replace(/^https?:\/\//, '').slice(0, 50), url: v }); t.activity.push({ at: Date.now(), by: me().name, text: 'attached a link' }); }); };
const attFile = (id, el) => { const f = el.files[0]; if (f) mut(id, t => t.attachments.push({ id: Date.now() + '', name: f.name + ' (upload needs Firebase Storage)', url: '#' })); };
const attDel = (id, i) => mut(id, t => t.attachments.splice(i, 1));
const addCm = id => { const v = $('#cmi').value.trim(); if (v) mut(id, t => t.comments.push({ id: Date.now() + '', by: me().name, at: Date.now(), text: v })); };
const collabAdd = (id, e) => mut(id, t => { t.collaborators = [...(t.collaborators || []), e]; t.activity.push({ at: Date.now(), by: me().name, text: `added ${uname(e)} as collaborator` }); });
async function delTask(id) { if (confirm('Delete this task?')) { await S.remove('tasks', id); ui.task = null; render(); } }

// ---------- MODALS: users / clients ----------
function modal(html) { $('#modal').innerHTML = `<div class="bg" onclick="if(event.target===this)closeModal()"><div class="dlg">${html}</div></div>`; }
function closeModal() { ui.ticket = null; $('#modal').innerHTML = ''; if (location.hash.startsWith('#/tickets/')) go('/tickets'); }
function teamView() {
  const d = D(), adm = me().role === 'admin';
  const row = u => `<div class="frow">${av(u.email, 32)}<div style="flex:1;min-width:0"><b>${esc(u.name)}</b><div class="mute sm ell">${esc(u.email)}</div></div><span class="chip">${u.role}${u.clientId ? ' · ' + esc(cname(cl(u.clientId))) : ''}</span>${adm ? `<button class="btn ghost sm" onclick="editUser('${u.email}')">Edit</button>` : ''}</div>`;
  return page('👥 Sparrow team & logins', adm ? `<button class="btn" onclick="editUser()">＋ Team member</button><button class="btn ghost" onclick="editUser(null,'${d.clients[0]?.id || ''}')">＋ Client login</button>` : '') +
  `<div class="grid g2"><div class="card"><h3>Team (admin / member)</h3>${d.users.filter(u => u.role !== 'client').map(row).join('')}</div>
  <div class="card"><h3>🏢 Client logins</h3><p class="mute sm">Clients only see their own portal & tickets. Internal comments/notes are never shown.</p>${d.users.filter(u => u.role === 'client').map(row).join('')}</div></div>`;
}
function editUser(email, clientId) {
  const u = email ? D().users.find(x => x.email === email) : { role: clientId !== undefined ? 'client' : 'member', clientId };
  modal(`<h2>${email ? 'Edit login' : 'New login'}</h2><label>Name</label><input id="un" value="${esc(u.name || '')}"><label>Email</label><input id="ue" type="email" value="${esc(u.email || '')}" ${email ? 'disabled' : ''}>
  <label>Role</label><select id="ur" onchange="$('#ucw').style.display=this.value==='client'?'':'none'">${['admin', 'member', 'client'].map(r => `<option ${u.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select>
  <div id="ucw" style="${u.role === 'client' ? '' : 'display:none'}"><label>Linked client / project</label><select id="uc">${D().clients.map(c => `<option value="${c.id}" ${u.clientId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
  <label>${email ? 'New password (leave blank to keep)' : 'Password'}</label><input id="up" type="text" placeholder="min 6 characters">
  <div style="margin-top:16px;display:flex;gap:8px"><button class="btn" onclick="saveUser(${email ? `'${email}'` : 'null'})">Save</button><button class="btn ghost" onclick="closeModal()">Cancel</button>${email && email !== me().email ? `<button class="btn danger" style="margin-left:auto" onclick="S.removeUser('${email}').then(()=>{closeModal();render()})">Remove</button>` : ''}</div>`);
}
async function saveUser(email) {
  const r = $('#ur').value, u = { email: email || $('#ue').value.trim().toLowerCase(), name: $('#un').value.trim() || $('#ue').value, role: r };
  u.clientId = r === 'client' ? $('#uc').value : null;
  const p = $('#up').value; if (p && p.length < 6) return toast('Password min 6 characters');
  try { await S.saveUser(u, p); closeModal(); toast('Login saved'); render(); } catch (e) { toast(e.message); }
}
function editClient(id) {
  const c = cl(id);
  modal(`<h2>Edit project</h2><label>Client name</label><input id="cn" value="${esc(c.name || '')}"><label>Service</label><input id="cp" value="${esc(c.project || '')}"><label>Colour</label><input id="cc" type="color" value="${c.color}" style="height:42px">
  <div style="margin-top:16px;display:flex;gap:8px"><button class="btn" onclick="saveClient('${id}')">Save</button><button class="btn ghost" onclick="closeModal()">Cancel</button></div>`);
}
async function saveClient(id) { const n = $('#cn').value.trim(); if (!n) return; await S.save('clients', { ...cl(id), name: n, project: $('#cp').value, color: $('#cc').value }); closeModal(); render(); }

// ---------- TICKETS (team) ----------
function tkRow(t) {
  const team = me().role !== 'client', un = team ? unreadTeam(t) : unreadClient(t);
  return `<div class="tkr ${un ? 'unread' : ''}" onclick="go('${team ? '/tickets/' : '/cticket/'}${t.id}')"><div class="tkt">${un ? '<span class="dot" title="New activity"></span>' : ''}<b>#${t.no}</b> ${esc(t.title)}</div>
  <div class="meta">${team ? `${prjIcon(cl(t.clientId), 16)}<span>${esc(cname(cl(t.clientId)))}</span>` : ''}<span class="chip tst-${t.status}">${TST[t.status]}</span><span class="chip">${t.category}</span><span class="chip p-${t.priority}">${t.priority}</span>
  <span>${t.assignee ? (team ? av(t.assignee, 18) + ' ' + esc(uname(t.assignee)) : '🎧 ' + esc(t.assigneeName || 'Team')) : 'Unassigned'}</span><span style="margin-left:auto" class="mute">${ago(Math.max(t.lastClientAt || 0, t.lastTeamAt || 0, t.createdAt))}</span>
  ${team && t.status === 'new' ? `<button class="btn sm" onclick="event.stopPropagation();pick('${t.id}')">✋ Pick</button>` : ''}</div></div>`;
}
function ticketsView(id) {
  const all = S.tickets().slice().sort((a, b) => Math.max(b.lastClientAt, b.lastTeamAt, b.createdAt) - Math.max(a.lastClientAt, a.lastTeamAt, a.createdAt));
  const f = ui.filter, groups = { all: all.filter(openT), new: all.filter(t => t.status === 'new'), mine: all.filter(t => t.assignee === me().email && openT(t)), waiting: all.filter(t => t.status === 'waiting'), closed: all.filter(t => !openT(t)) };
  if (id) setTimeout(() => openTicket(id));
  return page('🎫 Tickets', '', 'Client support inbox – pick a ticket to own it') + `<div class="utabs" style="margin-bottom:12px">${[['all', 'Open'], ['new', 'New / unassigned'], ['mine', 'Picked by me'], ['waiting', 'Waiting on client'], ['closed', 'Resolved']].map(([k, l]) => `<button class="${f === k ? 'on' : ''}" onclick="ui.filter='${k}';render()">${l} (${groups[k].length})</button>`).join('')}</div>
  <div class="card" style="padding:0">${groups[f].map(tkRow).join('') || '<p class="mute" style="padding:16px">No tickets here</p>'}</div>`;
}
async function pick(id, stay) {
  const t = { ...S.tickets().find(x => x.id === id) };
  t.assignee = me().email; t.assigneeName = me().name; t.status = 'progress';
  t.thread = [...(t.thread || []), { id: Date.now() + '', role: 'system', text: `${me().name} picked this ticket`, at: Date.now() }]; t.lastTeamAt = Date.now(); t.seenTeamAt = Date.now();
  await S.saveTicket(t); toast(`Ticket #${t.no} picked`); stay ? openTicket(id) : render();
}
function thread(t) {
  return (t.thread || []).map(m => m.role === 'system' ? `<div class="act" style="text-align:center">— ${esc(m.text)} · ${ago(m.at)} —</div>` :
    `<div class="msg ${m.role}">${m.role === 'client' ? `<span class="av" style="background:#059669">${ini(m.by)}</span>` : `<img class="sav" src="${ICON}" alt="Support">`}<div class="bub"><div><b>${esc(m.by)}</b> <small class="mute">${m.role === 'client' ? 'Client' : 'Sparrow support'} · ${ago(m.at)}</small></div><div>${esc(m.text)}</div></div></div>`).join('');
}
async function openTicket(id) {
  let t = S.tickets().find(x => x.id === id); if (!t) return;
  if (unreadTeam(t)) { t = { ...t, seenTeamAt: Date.now() }; ui.ticket = id; await S.saveTicket(t); }
  ui.ticket = id; const c = cl(t.clientId), notes = D().notes.filter(n => n.ticketId === id);
  modal(`<div class="phead" style="margin:0"><h1 style="font-size:15px;flex:1">Ticket #${t.no}</h1><button class="iconbtn" onclick="closeModal()">✕</button></div>
  <h2 style="margin:4px 0">${esc(t.title)}</h2><div class="meta">${prjIcon(c, 16)} ${esc(c.name)} · by ${esc(t.createdBy)} · ${ago(t.createdAt)}</div>
  <div class="grid g3" style="margin-top:10px"><div><label>Status</label><select onchange="tkSet('${id}','status',this.value)">${Object.entries(TST).map(([k, l]) => `<option value="${k}" ${k === t.status ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
  <div><label>Assignee</label><select onchange="tkSet('${id}','assignee',this.value)"><option value="">Unassigned</option>${D().users.filter(u => u.role !== 'client').map(u => `<option value="${u.email}" ${u.email === t.assignee ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></div>
  <div><label>Category · priority</label><div style="padding-top:8px"><span class="chip">${t.category}</span> <span class="chip p-${t.priority}">${t.priority}</span></div></div></div>
  ${t.status === 'new' ? `<button class="btn" style="margin-top:12px;width:100%" onclick="pick('${id}',1)">✋ Pick this ticket</button>` : ''}
  <div class="cm" style="margin-top:14px">${esc(t.desc)}${(t.attachments || []).map(a => `<div>📎 <a href="${esc(a.url)}" target="_blank">${esc(a.name)}</a></div>`).join('')}</div>
  <h4>💬 Conversation with client <span class="chip vis">visible to client</span></h4>${thread(t)}
  <textarea id="rp" placeholder="Public reply to client…"></textarea><div class="row2" style="flex-wrap:wrap;margin-top:6px"><button class="btn" onclick="tkReply('${id}')">Send to client</button><button class="btn ghost" onclick="tkReply('${id}','waiting')">Send & mark Waiting on client</button><button class="btn ghost" onclick="tkReply('${id}','resolved')">Send & Resolve</button></div>
  <div class="notes"><h4>🔒 Internal notes <span class="internal">TEAM ONLY · never shown to client</span></h4>${notes.map(n => `<div class="cm"><b>${esc(n.by)}</b> <small class="mute">${ago(n.at)}</small><div>${esc(n.text)}</div></div>`).join('') || '<p class="mute sm">No notes yet</p>'}
  <div class="row2"><input id="ni" placeholder="Add internal note…"><button class="btn ghost sm" onclick="tkNote('${id}')">Add note</button></div></div>`);
}
async function tkSet(id, k, v) {
  const t = { ...S.tickets().find(x => x.id === id), [k]: v || null };
  if (k === 'assignee') t.assigneeName = v ? uname(v) : null;
  t.thread = [...(t.thread || []), { id: Date.now() + '', role: 'system', text: `${me().name} ${k === 'status' ? 'set status to ' + TST[v] : 'assigned to ' + (v ? uname(v) : 'nobody')}`, at: Date.now() }];
  t.lastTeamAt = t.seenTeamAt = Date.now(); await S.saveTicket(t); openTicket(id); render();
}
async function tkReply(id, st) {
  const v = $('#rp').value.trim(); if (!v && !st) return;
  const t = { ...S.tickets().find(x => x.id === id) }; t.thread = [...(t.thread || [])];
  if (v) t.thread.push({ id: Date.now() + '', by: me().name, role: 'team', text: v, at: Date.now() });
  if (!t.assignee) { t.assignee = me().email; t.assigneeName = me().name; }
  if (st) { t.status = st; t.thread.push({ id: Date.now() + 'x', role: 'system', text: `Status: ${TST[st]}`, at: Date.now() }); } else if (t.status === 'new') t.status = 'progress';
  t.lastTeamAt = t.seenTeamAt = Date.now(); await S.saveTicket(t); toast('Sent to client'); openTicket(id); render();
}
async function tkNote(id) { const v = $('#ni').value.trim(); if (!v) return; await S.save('notes', { ticketId: id, by: me().name, text: v, at: Date.now() }); openTicket(id); }

// ---------- CLIENT SIDE ----------
let portalCache = null;
function clientShell(h) {
  const tk = S.tickets(), un = tk.filter(unreadClient).length;
  if (!portalCache) { S.portal().then(p => { portalCache = p || { client: { name: 'Your project' }, progress: 0, counts: { total: 0, done: 0 }, tasks: [], updates: [] }; render(); }); return '<p style="padding:30px">Loading…</p>'; }
  const p = portalCache;
  const header = `<div class="chead"><div class="portal"><div class="phead" style="margin:0;align-items:center"><img src="${ICON}" class="blogo" style="width:44px;height:44px;background:#fff"><div style="flex:1;min-width:0"><div class="sm" style="opacity:.85">Sparrow Web Solutions · Client Portal</div>
  <h1 class="ell" style="margin:2px 0">${esc(p.client.name)}</h1><div class="sm ell" style="opacity:.85">${esc(p.client.project || '')}</div></div><button class="btn sm" style="background:#ffffff26" onclick="logout()">Logout</button></div>
  <div class="ctabs"><a class="${h[0] === 'portal' ? 'on' : ''}" href="#/portal">📊 Progress</a><a class="${h[0] !== 'portal' ? 'on' : ''}" href="#/ctickets">🎫 My tickets${un ? ` <em class="badge">${un}</em>` : ''}</a></div></div></div>`;
  let body;
  if (h[0] === 'portal') body = `<div class="card"><div class="meta" style="color:var(--ink)"><b style="font-size:15px">Overall progress</b><b style="margin-left:auto;font-size:24px">${p.progress}%</b></div><div class="bar big"><i style="width:${p.progress}%"></i></div><small class="mute">${p.counts.done} of ${p.counts.total} work items completed</small></div>
  <div class="grid g2" style="margin-top:14px"><div class="card"><h3>◆ Milestones & tasks</h3>${p.tasks.sort((a, b) => b.milestone - a.milestone).map(t => `<div class="ms"><span class="chk ${t.status}">${t.status === 'done' ? '✓' : t.status === 'todo' ? '' : '…'}</span><div style="flex:1">${t.milestone ? '◆ ' : ''}<b>${esc(t.title)}</b><div class="meta">${SL(t.status)} · due ${fmt(t.due)}${t.checklist.length ? ` · ${t.checklist.filter(c => c.done).length}/${t.checklist.length} steps` : ''}</div></div></div>`).join('') || '<p class="mute">No items yet</p>'}</div>
  <div class="card"><h3>📣 Updates from Sparrow team</h3>${p.updates.map(u => `<div class="cm"><b>${esc(u.title)}</b><div style="margin:4px 0">${esc(u.body)}</div><small class="mute">${esc(u.by)} · ${ago(u.at)}</small></div>`).join('') || '<p class="mute">No updates yet</p>'}</div></div>
  <div class="helpcard"><img src="${MASCOT}" alt=""><div><b>Need help with your Amazon account?</b><p class="mute">Raise a ticket – our team will pick it up quickly.</p><button class="btn" onclick="go('/cnew')">＋ Raise a ticket</button></div></div>`;
  else if (h[0] === 'ctickets') body = `<div class="phead"><h1 style="flex:1;font-size:18px">My tickets</h1><button class="btn" onclick="go('/cnew')">＋ Raise ticket</button></div><div class="card" style="padding:0">${tk.sort((a, b) => b.createdAt - a.createdAt).map(tkRow).join('') || '<p style="padding:16px">No tickets yet. Koi problem ho to ticket raise karo.</p>'}</div>`;
  else if (h[0] === 'cnew') body = `<div class="card"><div class="helphead"><img src="${MASCOT}" alt=""><div><h2 style="margin:0">Raise a ticket</h2><p class="mute">May I help you? Tell us the problem.</p></div></div><label>Title</label><input id="nt" placeholder="e.g. Listing suppressed"><label>Describe the problem</label><textarea id="nd" placeholder="Kya problem hai, ASIN / order ID etc."></textarea>
  <div class="grid g2"><div><label>Category</label><select id="nc">${CATS.map(c => `<option>${c}</option>`).join('')}</select></div><div><label>Priority</label><select id="np"><option>low</option><option selected>medium</option><option>high</option></select></div></div>
  <label>Attachment link (screenshot / Drive)</label><input id="na" placeholder="https://…"><label>Or file</label><input id="nf" type="file">
  <div class="row2" style="margin-top:14px"><button class="btn" onclick="raise()">Submit ticket</button><button class="btn ghost" onclick="go('/ctickets')">Cancel</button></div></div>`;
  else body = cTicket(h[1]);
  return header + `<div class="portal">${body}</div>`;
}
async function raise() {
  const t = $('#nt').value.trim(); if (!t) return toast('Title likho');
  const att = []; const l = $('#na').value.trim(); if (l) att.push({ id: '1', name: l.replace(/^https?:\/\//, '').slice(0, 40), url: l });
  const f = $('#nf').files[0]; if (f) att.push({ id: '2', name: f.name, url: '#' });
  const now = Date.now(), r = await S.saveTicket({ clientId: me().clientId, title: t, desc: $('#nd').value, category: $('#nc').value, priority: $('#np').value, status: 'new', assignee: null, attachments: att, createdAt: now, createdBy: me().name, thread: [], lastClientAt: now, lastTeamAt: 0, seenTeamAt: 0, seenClientAt: now });
  toast(`Ticket #${r.no} raised – team will pick it soon`); go('/cticket/' + r.id);
}
function cTicket(id) {
  let t = S.tickets().find(x => x.id === id); if (!t) return '<div class="card">Ticket not found</div>';
  if (unreadClient(t)) { t = { ...t, seenClientAt: Date.now() }; S.saveTicket(t); }
  const closed = !openT(t);
  return `<div class="card"><a href="#/ctickets" class="sm">← My tickets</a><h2 style="margin:6px 0">#${t.no} ${esc(t.title)}</h2>
  <div class="meta"><span class="chip tst-${t.status}">${TST[t.status]}</span><span class="chip">${t.category}</span><span class="chip p-${t.priority}">${t.priority}</span></div>
  <div class="supbox"><img src="${ICON}" alt=""><div>${t.assignee ? `<b>${esc(t.assigneeName || 'Sparrow team')}</b> is handling your ticket` : '<b>Sparrow support</b> will pick your ticket soon'}<div class="mute sm">May I help you? 🙂</div></div></div>
  <div class="cm">${esc(t.desc)}${(t.attachments || []).map(a => `<div>📎 <a href="${esc(a.url)}" target="_blank">${esc(a.name)}</a></div>`).join('')}</div>
  <h4>Conversation</h4>${thread(t) || '<p class="mute">No replies yet</p>'}
  <textarea id="crp" placeholder="${closed ? 'Reply to reopen this ticket…' : 'Write a reply…'}"></textarea><div class="row2" style="margin-top:6px"><button class="btn" onclick="cReply('${id}')">${closed ? 'Reply & reopen' : 'Send reply'}</button>
  ${closed ? `<button class="btn ghost" onclick="cReply('${id}',1)">Reopen</button>` : `<button class="btn ghost" onclick="cReply('${id}',2)">Mark resolved</button>`}</div></div>`;
}
async function cReply(id, act) {
  const v = $('#crp').value.trim(); if (!v && !act) return;
  const t = { ...S.tickets().find(x => x.id === id) }; t.thread = [...(t.thread || [])]; const now = Date.now();
  if (v) t.thread.push({ id: now + '', by: me().name, role: 'client', text: v, at: now });
  const closed = !openT(t);
  if (act === 2) { t.status = 'resolved'; t.thread.push({ id: now + 'x', role: 'system', text: 'Client marked resolved', at: now }); }
  else if (closed || act === 1) { t.status = t.assignee ? 'progress' : 'new'; t.thread.push({ id: now + 'x', role: 'system', text: 'Client reopened the ticket', at: now }); }
  else if (t.status === 'waiting') t.status = 'progress';
  t.lastClientAt = t.seenClientAt = now; await S.saveTicket(t); toast('Sent'); render();
}

window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/tickets/')) { $('#modal').innerHTML = ''; ui.ticket = null; } ui.drawer = false; render(); });
S.onChange(() => { if (me()?.role === 'client') portalCache = null; if (!ui.ticket && !document.activeElement?.matches('input,textarea')) render(); });
window.addEventListener('storage', () => { S.init().then(render); });
S.init().then(render).catch(e => $('#app').innerHTML = `<p style="padding:30px">Error: ${esc(e.message)}</p>`);
