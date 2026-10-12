const S = window.Store, $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STAT = [['todo', 'To do'], ['doing', 'Doing'], ['review', 'Review'], ['done', 'Done']];
const TST = { new: 'New', progress: 'In progress', waiting: 'Waiting on client', resolved: 'Resolved', closed: 'Closed' };
const CATS = ['Listing', 'Ads', 'Account health', 'Payment', 'Other'];
const today = () => new Date().toISOString().slice(0, 10);
const fmt = d => d ? new Date(d + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';
const ago = t => { const m = Math.round((Date.now() - t) / 6e4); return m < 60 ? m + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago'; };
const toast = m => { $('#toast').innerHTML = `<div>${esc(m)}</div>`; setTimeout(() => $('#toast').innerHTML = '', 2200); };
const ini = n => (n || '?').split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase();
let ui = { loginTab: 'team', view: 'board', task: null, filter: 'all' };
const me = () => S.currentUser();
const D = () => S.teamData();
const uname = e => (D().users.find(u => u.email === e) || {}).name || 'Unassigned';
const cl = id => D().clients.find(c => c.id === id) || {};
const late = t => t.due && t.due < today() && t.status !== 'done';
const openT = t => !['resolved', 'closed'].includes(t.status);
const unreadTeam = t => (t.lastClientAt || 0) > (t.seenTeamAt || 0);
const unreadClient = t => (t.lastTeamAt || 0) > (t.seenClientAt || 0);
const go = h => location.hash = h;

function render() {
  const u = me(), h = location.hash.slice(2).split('/');
  const banner = S.mode === 'demo' ? `<div class="banner">DEMO MODE · sample data saved only in this browser · <a href="#" onclick="S.resetDemo();toast('Demo data reset');return false">Reset demo</a></div>` : '';
  if (!u) return $('#app').innerHTML = banner + loginView();
  if (u.role === 'client') { if (!['portal', 'ctickets', 'cticket', 'cnew'].includes(h[0])) return go('/portal'); return $('#app').innerHTML = banner + clientShell(h); }
  if (!['dash', 'my', 'project', 'clients', 'tickets', 'team'].includes(h[0])) return go('/dash');
  $('#app').innerHTML = banner + teamShell(h); bindBoard(); renderModal();
}

// ---------- LOGIN ----------
function loginView() {
  const t = ui.loginTab, demo = S.mode === 'demo';
  const creds = t === 'team' ? [['admin@sparrow.demo', 'admin123', 'Admin'], ['member@sparrow.demo', 'member123', 'Member']] : [['client1@sparrow.demo', 'client123', 'Glow Home'], ['client2@sparrow.demo', 'client123', 'FitKart']];
  return `<div class="login"><div class="lbox">
  <div class="logo" style="color:var(--ink);margin:0"><span style="font-size:30px">🐦</span><div>Sparrow Web Solutions<small style="color:var(--mute)">Tasks & Client Portal</small></div></div>
  <div class="tabs"><button class="${t === 'team' ? 'on' : ''}" onclick="ui.loginTab='team';render()">👥 Team Login</button><button class="${t === 'client' ? 'on' : ''}" onclick="ui.loginTab='client';render()">🏢 Client Login</button></div>
  <p style="color:var(--mute);font-size:13px;margin:10px 0 0">${t === 'team' ? 'For Sparrow team (admin / members).' : 'For clients – see your project progress & raise tickets.'}</p>
  <form onsubmit="doLogin(event)"><label>Email</label><input id="le" type="email" required autocomplete="username"><label>Password</label><input id="lp" type="password" required autocomplete="current-password">
  <div id="lerr" class="err"></div><button class="btn" style="width:100%;margin-top:14px">Login</button></form>
  ${!demo ? `<button class="btn ghost" style="width:100%;margin-top:8px" onclick="doGoogle()">Continue with Google</button>` : ''}
  ${demo ? `<div class="demo"><b>Demo logins (tap to fill):</b><br>${creds.map(c => `${c[2]}: <code onclick="$('#le').value='${c[0]}';$('#lp').value='${c[1]}'">${c[0]} / ${c[1]}</code>`).join('<br>')}</div>` : ''}
  </div></div>`;
}
async function doLogin(e) { e.preventDefault(); try { await S.signIn(ui.loginTab, $('#le').value, $('#lp').value); go(ui.loginTab === 'team' ? '/dash' : '/portal'); render(); } catch (x) { $('#lerr').textContent = x.message; } }
async function doGoogle() { try { await S.signInGoogle(ui.loginTab); render(); } catch (x) { $('#lerr').textContent = x.message; } }
async function logout() { await S.signOut(); go('/'); render(); }

// ---------- TEAM SHELL ----------
function teamShell(h) {
  const d = D(), u = me(), nt = S.tickets().filter(t => t.status === 'new' || unreadTeam(t)).length;
  const nav = [['dash', '🏠', 'Dashboard'], ['my', '✅', 'My tasks'], ['tickets', '🎫', 'Tickets' + (nt ? ` <span class="pill p-high">${nt}</span>` : '')], ['clients', '🏢', 'Clients'], ['team', '👥', 'Team']];
  const body = { dash: dashView, my: myView, project: () => projectView(h[1]), clients: clientsView, tickets: () => ticketsView(h[1]), team: teamView }[h[0]]();
  return `<div class="layout"><aside class="side"><div class="logo">🐦<div>Sparrow Web Solutions<small>Team workspace</small></div></div>
  <nav class="nav">${nav.map(n => `<a href="#/${n[0]}" class="${h[0] === n[0] ? 'on' : ''}">${n[1]} ${n[2]}</a>`).join('')}
  <h6>Projects</h6>${d.clients.map(c => `<a href="#/project/${c.id}" class="${h[1] === c.id ? 'on' : ''}"><span class="dot" style="background:${c.color}"></span>${esc(c.name)}</a>`).join('')}
  <h6>${esc(u.name)} · ${u.role}</h6><a href="#" onclick="logout();return false">↩ Logout</a></nav></aside>
  <main class="main">${body}</main>
  <nav class="mob bnav">${nav.map(n => `<a href="#/${n[0]}" class="${h[0] === n[0] ? 'on' : ''}"><b>${n[1]}</b>${n[2].replace(/<.*>/, '')}${n[0] === 'tickets' && nt ? ' •' : ''}</a>`).join('')}</nav></div>`;
}
function hdr(title, extra = '') { return `<div class="top"><h1>${title}</h1>${extra}<button class="btn ghost sm mob" onclick="logout()">Logout</button></div>`; }
function card(t, showClient) {
  const c = cl(t.clientId), ck = t.checklist || [];
  return `<div class="tk" draggable="true" data-id="${t.id}" onclick="openTask('${t.id}')"><div class="t">${t.milestone ? '🚩 ' : ''}${esc(t.title)}</div>
  <div class="meta">${showClient ? `<span class="dot" style="background:${c.color}"></span>${esc((c.name || '').replace('DEMO · ', ''))}` : ''}
  <span class="pill p-${t.priority}">${t.priority}</span><span class="${late(t) ? 'late' : ''}">📅 ${fmt(t.due)}</span>
  ${ck.length ? `<span>☑ ${ck.filter(x => x.done).length}/${ck.length}</span>` : ''}${(t.comments || []).length ? `<span>💬 ${t.comments.length}</span>` : ''}
  ${t.clientVisible ? '<span title="Client can see">👁</span>' : ''}<span style="margin-left:auto" class="av" title="${esc(uname(t.assignee))}">${ini(uname(t.assignee))}</span></div></div>`;
}
function dashView() {
  const d = D(), u = me(), mine = d.tasks.filter(t => t.assignee === u.email && t.status !== 'done');
  const dueToday = d.tasks.filter(t => t.due === today() && t.status !== 'done'), over = d.tasks.filter(late);
  const ot = S.tickets().filter(openT), nw = ot.filter(t => t.status === 'new');
  const list = (a, empty) => a.length ? a.map(t => card(t, true)).join('') : `<p style="color:var(--mute)">${empty}</p>`;
  return hdr(`Namaste, ${esc(u.name.split(' ')[0])} 👋`, `<button class="btn" onclick="newTask()">+ New task</button>`) +
  `<div class="grid g4"><div class="card stat"><b>${mine.length}</b><span>My open tasks</span></div><div class="card stat"><b>${dueToday.length}</b><span>Due today</span></div>
  <div class="card stat"><b style="color:var(--bad)">${over.length}</b><span>Overdue</span></div><a href="#/tickets" class="card stat" style="text-decoration:none;color:inherit"><b>${ot.length}</b><span>Open tickets · ${nw.length} new</span></a></div>
  <div class="grid g3" style="margin-top:14px"><div class="card"><h4 style="margin-top:0">⏰ Overdue</h4>${list(over, 'Nothing overdue 🎉')}</div>
  <div class="card"><h4 style="margin-top:0">📅 Due today</h4>${list(dueToday, 'Nothing due today')}</div>
  <div class="card"><h4 style="margin-top:0">🎫 New tickets</h4>${nw.length ? nw.map(tkRow).join('') : '<p style="color:var(--mute)">No new tickets</p>'}</div></div>
  <div class="card" style="margin-top:14px"><h4 style="margin-top:0">Project progress</h4>${d.clients.map(c => { const p = prog(c.id); return `<a href="#/project/${c.id}" style="display:block;text-decoration:none;color:inherit;margin:10px 0"><div class="meta" style="color:var(--ink)"><span class="dot" style="background:${c.color}"></span><b>${esc(c.name)}</b><span style="margin-left:auto">${p}%</span></div><div class="bar" style="margin-top:6px"><i style="width:${p}%"></i></div></a>`; }).join('')}</div>`;
}
const prog = id => { const a = D().tasks.filter(t => t.clientId === id); return a.length ? Math.round(a.filter(t => t.status === 'done').length * 100 / a.length) : 0; };
function myView() {
  const a = D().tasks.filter(t => t.assignee === me().email).sort((x, y) => (x.due || '9').localeCompare(y.due || '9'));
  return hdr('My tasks') + `<div class="card">${listTable(a, true)}</div>`;
}
function listTable(a, showClient) {
  if (!a.length) return '<p style="color:var(--mute)">No tasks</p>';
  return `<table><tr><th>Task</th>${showClient ? '<th class="hide-m">Client</th>' : ''}<th>Status</th><th class="hide-m">Assignee</th><th>Due</th><th class="hide-m">Priority</th></tr>
  ${a.map(t => `<tr class="row" onclick="openTask('${t.id}')"><td>${t.milestone ? '🚩 ' : ''}${esc(t.title)}</td>${showClient ? `<td class="hide-m">${esc(cl(t.clientId).name)}</td>` : ''}
  <td><span class="pill s-${t.status}">${STAT.find(s => s[0] === t.status)[1]}</span></td><td class="hide-m">${esc(uname(t.assignee))}</td><td class="${late(t) ? 'late' : ''}">${fmt(t.due)}</td><td class="hide-m"><span class="pill p-${t.priority}">${t.priority}</span></td></tr>`).join('')}</table>`;
}
function projectView(id) {
  const c = cl(id); if (!c.id) return hdr('Project not found');
  const a = D().tasks.filter(t => t.clientId === id).sort((x, y) => (x.order || 0) - (y.order || 0));
  const head = hdr(`<span class="dot" style="background:${c.color};width:13px;height:13px"></span> ${esc(c.name)}<div style="font-size:13px;color:var(--mute);font-weight:500">${esc(c.project)} · ${prog(id)}% done</div>`,
    `<div class="tabs"><button class="${ui.view === 'board' ? 'on' : ''}" onclick="ui.view='board';render()">Board</button><button class="${ui.view === 'list' ? 'on' : ''}" onclick="ui.view='list';render()">List</button><button class="${ui.view === 'updates' ? 'on' : ''}" onclick="ui.view='updates';render()">Client updates</button></div><button class="btn" onclick="newTask('${id}')">+ Task</button>`);
  if (ui.view === 'list') return head + `<div class="card">${listTable(a)}</div>`;
  if (ui.view === 'updates') return head + updatesView(id);
  return head + `<div class="board">${STAT.map(([k, l]) => { const col = a.filter(t => t.status === k); return `<div class="col" data-st="${k}"><h3>${l}<span>${col.length}</span></h3>${col.map(t => card(t)).join('')}
  <button class="btn ghost sm" style="width:100%" onclick="newTask('${id}','${k}')">+ Add</button></div>`; }).join('')}</div>`;
}
function updatesView(id) {
  const ups = D().updates.filter(u => u.clientId === id).sort((a, b) => b.at - a.at);
  return `<div class="card"><h4 style="margin-top:0">📣 Publish an update to client</h4><input id="ut" placeholder="Title e.g. Listings live ✅"><textarea id="ub" placeholder="Message for the client" style="margin-top:8px"></textarea>
  <button class="btn" style="margin-top:8px" onclick="postUpdate('${id}')">Publish to client</button></div>
  ${ups.map(u => `<div class="card" style="margin-top:10px"><b>${esc(u.title)}</b><p style="margin:6px 0">${esc(u.body)}</p><small style="color:var(--mute)">${esc(u.byName)} · ${ago(u.at)}</small> <a href="#" style="font-size:12px" onclick="S.remove('updates','${u.id}');return false">delete</a></div>`).join('')}`;
}
async function postUpdate(id) { const t = $('#ut').value.trim(); if (!t) return; await S.save('updates', { clientId: id, title: t, body: $('#ub').value, at: Date.now(), byName: me().name }); toast('Update published to client'); }
function clientsView() {
  const d = D(), adm = me().role === 'admin';
  return hdr('Clients & projects', adm ? `<button class="btn" onclick="editClient()">+ Client</button>` : '') + `<div class="grid g3">${d.clients.map(c => {
    const logins = d.users.filter(u => u.role === 'client' && u.clientId === c.id);
    return `<div class="card"><div class="meta" style="color:var(--ink)"><span class="dot" style="background:${c.color}"></span><b>${esc(c.name)}</b></div><p style="color:var(--mute);margin:6px 0 10px">${esc(c.project)}</p>
    <div class="bar"><i style="width:${prog(c.id)}%"></i></div><p style="font-size:12px;color:var(--mute)">${prog(c.id)}% · ${d.tasks.filter(t => t.clientId === c.id).length} tasks · ${logins.length} client login(s)</p>
    <a class="btn ghost sm" href="#/project/${c.id}">Open</a> ${adm ? `<button class="btn ghost sm" onclick="editClient('${c.id}')">Edit</button> <button class="btn ghost sm" onclick="editUser(null,'${c.id}')">+ Client login</button>` : ''}</div>`; }).join('')}</div>`;
}
function teamView() {
  const d = D(), adm = me().role === 'admin';
  const row = u => `<tr><td><span class="av">${ini(u.name)}</span> ${esc(u.name)}</td><td class="hide-m">${esc(u.email)}</td><td><span class="pill">${u.role}${u.clientId ? ' · ' + esc(cl(u.clientId).name || '') : ''}</span></td><td>${adm ? `<button class="btn ghost sm" onclick="editUser('${u.email}')">Edit</button>` : ''}</td></tr>`;
  return hdr('Team & logins', adm ? `<button class="btn" onclick="editUser()">+ Team member</button><button class="btn ghost" onclick="editUser(null,'${d.clients[0]?.id || ''}')">+ Client login</button>` : '') +
  `<div class="card"><h4 style="margin-top:0">👥 Team (admin / member)</h4><table>${d.users.filter(u => u.role !== 'client').map(row).join('')}</table></div>
  <div class="card" style="margin-top:14px"><h4 style="margin-top:0">🏢 Client logins</h4><p style="color:var(--mute);font-size:12px;margin-top:0">Clients only see their own portal & tickets. Internal comments/notes are never shown.</p><table>${d.users.filter(u => u.role === 'client').map(row).join('')}</table></div>`;
}
function modal(html) { $('#modal').innerHTML = `<div class="bg" onclick="if(event.target===this)closeModal()"><div class="panel">${html}</div></div>`; }
function closeModal() { ui.task = null; ui.ticket = null; $('#modal').innerHTML = ''; if (location.hash.startsWith('#/tickets/')) go('/tickets'); }
function editUser(email, clientId) {
  const u = email ? D().users.find(x => x.email === email) : { role: clientId !== undefined ? 'client' : 'member', clientId };
  modal(`<h2>${email ? 'Edit login' : 'New login'}</h2><label>Name</label><input id="un" value="${esc(u.name || '')}"><label>Email</label><input id="ue" type="email" value="${esc(u.email || '')}" ${email ? 'disabled' : ''}>
  <label>Role</label><select id="ur" onchange="$('#ucw').style.display=this.value==='client'?'':'none'">${['admin', 'member', 'client'].map(r => `<option ${u.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select>
  <div id="ucw" style="${u.role === 'client' ? '' : 'display:none'}"><label>Linked client / project</label><select id="uc">${D().clients.map(c => `<option value="${c.id}" ${u.clientId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
  <label>${email ? 'New password (leave blank to keep)' : 'Password'}</label><input id="up" type="text" placeholder="min 6 characters">
  <div style="margin-top:16px;display:flex;gap:8px"><button class="btn" onclick="saveUser(${email ? `'${email}'` : 'null'})">Save</button><button class="btn ghost" onclick="closeModal()">Cancel</button>${email && email !== me().email ? `<button class="btn danger" style="margin-left:auto" onclick="S.removeUser('${email}').then(closeModal)">Remove</button>` : ''}</div>`);
}
async function saveUser(email) {
  const r = $('#ur').value, u = { email: email || $('#ue').value.trim().toLowerCase(), name: $('#un').value.trim() || $('#ue').value, role: r };
  if (r === 'client') u.clientId = $('#uc').value; else u.clientId = null;
  const p = $('#up').value; if (p && p.length < 6) return toast('Password min 6 characters');
  try { await S.saveUser(u, p); closeModal(); toast('Login saved'); } catch (e) { toast(e.message); }
}
function editClient(id) {
  const c = id ? cl(id) : { color: '#0ea5e9' };
  modal(`<h2>${id ? 'Edit client' : 'New client'}</h2><label>Client name</label><input id="cn" value="${esc(c.name || '')}"><label>Project / service</label><input id="cp" value="${esc(c.project || '')}" placeholder="e.g. Amazon account management"><label>Colour</label><input id="cc" type="color" value="${c.color}" style="height:42px">
  <div style="margin-top:16px;display:flex;gap:8px"><button class="btn" onclick="saveClient(${id ? `'${id}'` : 'null'})">Save</button><button class="btn ghost" onclick="closeModal()">Cancel</button></div>`);
}
async function saveClient(id) { const n = $('#cn').value.trim(); if (!n) return; await S.save('clients', { ...(id ? cl(id) : {}), id: id || undefined, name: n, project: $('#cp').value, color: $('#cc').value }); closeModal(); }

// ---------- TASKS ----------
function newTask(clientId, status) {
  const c = clientId || location.hash.split('/')[2] || D().clients[0]?.id;
  const t = { clientId: c, title: '', status: status || 'todo', assignee: me().email, due: today(), priority: 'medium', desc: '', clientVisible: false, milestone: false, checklist: [], comments: [], attachments: [], activity: [{ at: Date.now(), by: me().name, text: 'created this task' }], order: Date.now(), _new: true };
  ui.task = t; renderModal();
}
function openTask(id) { ui.task = JSON.parse(JSON.stringify(D().tasks.find(t => t.id === id))); renderModal(); }
function renderModal() {
  const t = ui.task; if (!t) return; const d = D();
  modal(`<div class="top" style="margin:0"><h1 style="font-size:16px">${t._new ? 'New task' : 'Task'}</h1><button class="btn ghost sm" onclick="closeModal()">✕</button></div>
  <input id="tt" value="${esc(t.title)}" placeholder="Task title" style="font-size:18px;font-weight:700;border:0;padding:6px 0" oninput="ui.task.title=this.value">
  <div class="grid g2"><div><label>Client / project</label><select onchange="ui.task.clientId=this.value">${d.clients.map(c => `<option value="${c.id}" ${c.id === t.clientId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
  <div><label>Assignee</label><select onchange="ui.task.assignee=this.value">${d.users.filter(u => u.role !== 'client').map(u => `<option value="${u.email}" ${u.email === t.assignee ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></div>
  <div><label>Status</label><select onchange="ui.task.status=this.value">${STAT.map(([k, l]) => `<option value="${k}" ${k === t.status ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
  <div><label>Due date</label><input type="date" value="${t.due || ''}" onchange="ui.task.due=this.value"></div>
  <div><label>Priority</label><select onchange="ui.task.priority=this.value">${['high', 'medium', 'low'].map(p => `<option ${p === t.priority ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
  <div><label>Client visibility</label><label class="ck" style="color:var(--ink)"><input type="checkbox" ${t.clientVisible ? 'checked' : ''} onchange="ui.task.clientVisible=this.checked"> 👁 Show to client</label><label class="ck" style="color:var(--ink);margin:0"><input type="checkbox" ${t.milestone ? 'checked' : ''} onchange="ui.task.milestone=this.checked"> 🚩 Milestone</label></div></div>
  <label>Description</label><textarea oninput="ui.task.desc=this.value">${esc(t.desc)}</textarea>
  <div class="sec"><h4>☑ Checklist</h4>${t.checklist.map((c, i) => `<div class="ck ${c.done ? 'done' : ''}"><input type="checkbox" ${c.done ? 'checked' : ''} onchange="ui.task.checklist[${i}].done=this.checked;renderModal()"><span>${esc(c.text)}</span><a href="#" style="margin-left:auto;font-size:12px" onclick="ui.task.checklist.splice(${i},1);renderModal();return false">✕</a></div>`).join('')}
  <div style="display:flex;gap:6px;margin-top:6px"><input id="cki" placeholder="Add checklist item" onkeydown="if(event.key==='Enter')addCk()"><button class="btn ghost sm" onclick="addCk()">Add</button></div></div>
  <div class="sec"><h4>📎 Attachments</h4>${t.attachments.map((a, i) => `<div class="ck">📄 <a href="${esc(a.url)}" target="_blank">${esc(a.name)}</a><a href="#" style="margin-left:auto;font-size:12px" onclick="ui.task.attachments.splice(${i},1);renderModal();return false">✕</a></div>`).join('')}
  <div style="display:flex;gap:6px;margin-top:6px"><input id="ati" placeholder="Paste link (Drive, Sheet…)"><button class="btn ghost sm" onclick="addAt()">Add link</button><label class="btn ghost sm" style="margin:0;color:var(--brand)">File<input type="file" hidden onchange="addFile(this)"></label></div></div>
  <div class="sec"><h4>💬 Comments <span class="internal">INTERNAL · team only</span></h4>${t.comments.map(c => `<div class="cm"><b>${esc(c.by)}</b> <small>${ago(c.at)}</small><div>${esc(c.text)}</div></div>`).join('')}
  <div style="display:flex;gap:6px"><input id="cmi" placeholder="Write a comment for team…" onkeydown="if(event.key==='Enter')addCm()"><button class="btn ghost sm" onclick="addCm()">Send</button></div></div>
  <div class="sec"><h4>🕑 Activity</h4>${t.activity.slice().reverse().map(a => `<div class="act"><b>${esc(a.by)}</b> ${esc(a.text)} · ${ago(a.at)}</div>`).join('')}</div>
  <div style="display:flex;gap:8px;margin-top:20px;position:sticky;bottom:0;background:#fff;padding:10px 0"><button class="btn" onclick="saveTask()">Save task</button><button class="btn ghost" onclick="closeModal()">Cancel</button>${t._new ? '' : `<button class="btn danger" style="margin-left:auto" onclick="delTask()">Delete</button>`}</div>`);
}
const addCk = () => { const v = $('#cki').value.trim(); if (v) { ui.task.checklist.push({ id: Date.now() + '', text: v, done: false }); renderModal(); } };
const addAt = () => { const v = $('#ati').value.trim(); if (v) { ui.task.attachments.push({ id: Date.now() + '', name: v.replace(/^https?:\/\//, '').slice(0, 40), url: v }); renderModal(); } };
const addFile = el => { const f = el.files[0]; if (f) { ui.task.attachments.push({ id: Date.now() + '', name: f.name + ' (upload needs Firebase Storage)', url: '#' }); renderModal(); } };
const addCm = () => { const v = $('#cmi').value.trim(); if (v) { ui.task.comments.push({ id: Date.now() + '', by: me().name, at: Date.now(), text: v }); ui.task.activity.push({ at: Date.now(), by: me().name, text: 'commented' }); renderModal(); } };
async function saveTask() {
  const t = ui.task; if (!t.title.trim()) return toast('Title likho');
  const old = D().tasks.find(x => x.id === t.id);
  if (old && old.status !== t.status) t.activity.push({ at: Date.now(), by: me().name, text: `moved to ${STAT.find(s => s[0] === t.status)[1]}` });
  if (old && old.assignee !== t.assignee) t.activity.push({ at: Date.now(), by: me().name, text: `assigned to ${uname(t.assignee)}` });
  delete t._new; await S.save('tasks', t); ui.task = null; $('#modal').innerHTML = ''; toast('Saved'); render();
}
async function delTask() { if (confirm('Delete this task?')) { await S.remove('tasks', ui.task.id); closeModal(); render(); } }
function bindBoard() {
  document.querySelectorAll('.tk[draggable]').forEach(el => { el.ondragstart = e => { e.dataTransfer.setData('id', el.dataset.id); el.classList.add('drag'); }; el.ondragend = () => el.classList.remove('drag'); });
  document.querySelectorAll('.col').forEach(col => {
    col.ondragover = e => { e.preventDefault(); col.classList.add('over'); }; col.ondragleave = () => col.classList.remove('over');
    col.ondrop = async e => { e.preventDefault(); col.classList.remove('over'); const t = D().tasks.find(x => x.id === e.dataTransfer.getData('id')); if (!t || t.status === col.dataset.st) return;
      const n = { ...t, status: col.dataset.st, order: Date.now(), activity: [...t.activity, { at: Date.now(), by: me().name, text: `moved to ${STAT.find(s => s[0] === col.dataset.st)[1]}` }] }; await S.save('tasks', n); render(); };
  });
}

// ---------- TICKETS (team) ----------
function tkRow(t) {
  const team = me().role !== 'client', un = team ? unreadTeam(t) : unreadClient(t);
  return `<div class="tk" onclick="go('${team ? '/tickets/' : '/cticket/'}${t.id}')"><div class="t">${un ? '<span class="dot" style="background:var(--bad)" title="New activity"></span> ' : ''}#${t.no} ${esc(t.title)}</div>
  <div class="meta">${team ? `<span class="dot" style="background:${cl(t.clientId).color}"></span>${esc((cl(t.clientId).name || '').replace('DEMO · ', ''))}` : ''}<span class="pill tst-${t.status}">${TST[t.status]}</span><span class="pill">${t.category}</span><span class="pill p-${t.priority}">${t.priority}</span>
  <span>👤 ${t.assignee ? esc(team ? uname(t.assignee) : t.assigneeName || 'Team') : 'Unassigned'}</span><span style="margin-left:auto">${ago(Math.max(t.lastClientAt || 0, t.lastTeamAt || 0, t.createdAt))}</span></div></div>`;
}
function ticketsView(id) {
  const all = S.tickets().slice().sort((a, b) => Math.max(b.lastClientAt, b.lastTeamAt, b.createdAt) - Math.max(a.lastClientAt, a.lastTeamAt, a.createdAt));
  const f = ui.filter, groups = { all: all.filter(openT), new: all.filter(t => t.status === 'new'), mine: all.filter(t => t.assignee === me().email && openT(t)), waiting: all.filter(t => t.status === 'waiting'), closed: all.filter(t => !openT(t)) };
  if (id) setTimeout(() => openTicket(id));
  return hdr('🎫 Tickets') + `<div class="tabs" style="margin-bottom:12px;overflow-x:auto">${[['all', 'Open'], ['new', 'New / unassigned'], ['mine', 'Picked by me'], ['waiting', 'Waiting on client'], ['closed', 'Resolved']].map(([k, l]) => `<button class="${f === k ? 'on' : ''}" onclick="ui.filter='${k}';render()">${l} (${groups[k].length})</button>`).join('')}</div>
  ${groups[f].length ? groups[f].map(t => t.status === 'new' ? tkRow(t).replace('</div></div>', `<button class="btn sm" style="margin-left:8px" onclick="event.stopPropagation();pick('${t.id}')">✋ Pick</button></div></div>`) : tkRow(t)).join('') : '<div class="card" style="color:var(--mute)">No tickets here</div>'}`;
}
async function pick(id, stay) {
  const t = { ...S.tickets().find(x => x.id === id) };
  t.assignee = me().email; t.assigneeName = me().name; t.status = 'progress';
  t.thread = [...(t.thread || []), { id: Date.now() + '', role: 'system', text: `${me().name} picked this ticket`, at: Date.now() }]; t.lastTeamAt = Date.now(); t.seenTeamAt = Date.now();
  await S.saveTicket(t); toast(`Ticket #${t.no} picked`); stay ? openTicket(id) : render();
}
function thread(t, team) {
  return (t.thread || []).map(m => m.role === 'system' ? `<div class="act" style="text-align:center">— ${esc(m.text)} · ${ago(m.at)} —</div>` :
    `<div class="cm" style="${m.role === 'client' ? 'background:#f0fdf4;border-color:#bbf7d0' : ''}"><b>${esc(m.by)}</b> <small>${m.role === 'client' ? 'Client' : 'Sparrow team'} · ${ago(m.at)}</small><div>${esc(m.text)}</div></div>`).join('');
}
async function openTicket(id) {
  let t = S.tickets().find(x => x.id === id); if (!t) return;
  if (unreadTeam(t)) { t = { ...t, seenTeamAt: Date.now() }; S.saveTicket(t); }
  ui.ticket = id; const c = cl(t.clientId), notes = D().notes.filter(n => n.ticketId === id);
  modal(`<div class="top" style="margin:0"><h1 style="font-size:16px">Ticket #${t.no}</h1><button class="btn ghost sm" onclick="closeModal()">✕</button></div>
  <h2 style="margin:4px 0">${esc(t.title)}</h2><div class="meta"><span class="dot" style="background:${c.color}"></span>${esc(c.name)} · by ${esc(t.createdBy)} · ${ago(t.createdAt)}</div>
  <div class="grid g3" style="margin-top:10px"><div><label>Status</label><select onchange="tkSet('${id}','status',this.value)">${Object.entries(TST).map(([k, l]) => `<option value="${k}" ${k === t.status ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
  <div><label>Assignee</label><select onchange="tkSet('${id}','assignee',this.value)"><option value="">Unassigned</option>${D().users.filter(u => u.role !== 'client').map(u => `<option value="${u.email}" ${u.email === t.assignee ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></div>
  <div><label>Category · priority</label><div style="padding-top:8px"><span class="pill">${t.category}</span> <span class="pill p-${t.priority}">${t.priority}</span></div></div></div>
  ${t.status === 'new' ? `<button class="btn" style="margin-top:12px;width:100%" onclick="pick('${id}',1)">✋ Pick this ticket</button>` : ''}
  <div class="card" style="margin-top:14px;background:#fafafe">${esc(t.desc)}${(t.attachments || []).map(a => `<div class="ck">📎 <a href="${esc(a.url)}" target="_blank">${esc(a.name)}</a></div>`).join('')}</div>
  <div class="sec"><h4>💬 Conversation with client <span class="pill">visible to client</span></h4>${thread(t, 1)}
  <textarea id="rp" placeholder="Public reply to client…"></textarea><div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap"><button class="btn" onclick="tkReply('${id}')">Send to client</button><button class="btn ghost" onclick="tkReply('${id}','waiting')">Send & mark Waiting on client</button><button class="btn ghost" onclick="tkReply('${id}','resolved')">Send & Resolve</button></div></div>
  <div class="sec" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:12px"><h4>🔒 Internal notes <span class="internal">TEAM ONLY · never shown to client</span></h4>${notes.map(n => `<div class="cm"><b>${esc(n.by)}</b> <small>${ago(n.at)}</small><div>${esc(n.text)}</div></div>`).join('') || '<p style="color:var(--mute);font-size:12px">No notes yet</p>'}
  <div style="display:flex;gap:6px"><input id="ni" placeholder="Add internal note…"><button class="btn ghost sm" onclick="tkNote('${id}')">Add note</button></div></div>`);
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
  const u = me(), tk = S.tickets(), un = tk.filter(unreadClient).length;
  if (!portalCache) { S.portal().then(p => { portalCache = p || { client: { name: 'Your project' }, progress: 0, counts: { total: 0, done: 0 }, tasks: [], updates: [] }; render(); }); return '<p style="padding:30px">Loading…</p>'; }
  const p = portalCache, nav = `<div class="tabs" style="margin:14px 0"><button class="${h[0] === 'portal' ? 'on' : ''}" onclick="go('/portal')">📊 Progress</button><button class="${h[0] !== 'portal' ? 'on' : ''}" onclick="go('/ctickets')">🎫 My tickets${un ? ` <span class="pill p-high">${un}</span>` : ''}</button></div>`;
  const header = `<div style="background:linear-gradient(135deg,#1e1b4b,#4f46e5);color:#fff"><div class="portal" style="padding-bottom:18px"><div class="top" style="margin:0"><div style="flex:1"><div style="font-size:12px;opacity:.8">🐦 Sparrow Web Solutions · Client Portal</div>
  <h1 style="font-size:21px;margin:4px 0">${esc(p.client.name)}</h1><div style="opacity:.85">${esc(p.client.project || '')}</div></div><button class="btn sm" style="background:#ffffff22" onclick="portalCache=null;logout()">Logout</button></div></div></div>`;
  let body;
  if (h[0] === 'portal') body = `<div class="card"><div class="meta" style="color:var(--ink)"><b style="font-size:15px">Overall progress</b><b style="margin-left:auto;font-size:24px">${p.progress}%</b></div><div class="bar" style="height:13px;margin:8px 0"><i style="width:${p.progress}%"></i></div><small style="color:var(--mute)">${p.counts.done} of ${p.counts.total} work items completed</small></div>
  <div class="grid g2" style="margin-top:14px"><div class="card"><h4 style="margin-top:0">🚩 Milestones & tasks</h4>${p.tasks.sort((a, b) => b.milestone - a.milestone).map(t => `<div class="ms"><span class="chk ${t.status}">${t.status === 'done' ? '✓' : t.status === 'todo' ? '' : '…'}</span><div style="flex:1">${t.milestone ? '🚩 ' : ''}<b>${esc(t.title)}</b><div class="meta">${STAT.find(s => s[0] === t.status)[1]} · due ${fmt(t.due)}${t.checklist.length ? ` · ${t.checklist.filter(c => c.done).length}/${t.checklist.length} steps` : ''}</div></div></div>`).join('') || '<p style="color:var(--mute)">No items yet</p>'}</div>
  <div class="card"><h4 style="margin-top:0">📣 Updates from Sparrow team</h4>${p.updates.map(u => `<div class="cm"><b>${esc(u.title)}</b><div style="margin:4px 0">${esc(u.body)}</div><small>${esc(u.by)} · ${ago(u.at)}</small></div>`).join('') || '<p style="color:var(--mute)">No updates yet</p>'}</div></div>`;
  else if (h[0] === 'ctickets') body = `<div class="top"><h1 style="font-size:18px">My tickets</h1><button class="btn" onclick="go('/cnew')">+ Raise ticket</button></div>${tk.sort((a, b) => b.createdAt - a.createdAt).map(tkRow).join('') || '<div class="card">No tickets yet. Koi problem ho to ticket raise karo.</div>'}`;
  else if (h[0] === 'cnew') body = `<div class="card"><h2 style="margin-top:0">Raise a ticket</h2><label>Title</label><input id="nt" placeholder="e.g. Listing suppressed"><label>Describe the problem</label><textarea id="nd" placeholder="Kya problem hai, ASIN / order ID etc."></textarea>
  <div class="grid g2"><div><label>Category</label><select id="nc">${CATS.map(c => `<option>${c}</option>`).join('')}</select></div><div><label>Priority</label><select id="np"><option>low</option><option selected>medium</option><option>high</option></select></div></div>
  <label>Attachment link (screenshot / Drive)</label><input id="na" placeholder="https://…"><label>Or file</label><input id="nf" type="file">
  <div style="display:flex;gap:8px;margin-top:14px"><button class="btn" onclick="raise()">Submit ticket</button><button class="btn ghost" onclick="go('/ctickets')">Cancel</button></div></div>`;
  else body = cTicket(h[1]);
  return header + `<div class="portal" style="padding-top:0">${nav}${body}</div>`;
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
  return `<div class="card"><a href="#/ctickets" style="font-size:12px">← My tickets</a><h2 style="margin:6px 0">#${t.no} ${esc(t.title)}</h2>
  <div class="meta"><span class="pill">${TST[t.status]}</span><span class="pill">${t.category}</span><span class="pill p-${t.priority}">${t.priority}</span><span>👤 ${t.assignee ? 'Handled by ' + esc(t.assigneeName || 'Sparrow team') : 'Waiting for team to pick'}</span></div>
  <div class="cm" style="margin-top:12px">${esc(t.desc)}${(t.attachments || []).map(a => `<div class="ck">📎 <a href="${esc(a.url)}" target="_blank">${esc(a.name)}</a></div>`).join('')}</div>
  <div class="sec"><h4>Conversation</h4>${thread(t) || '<p style="color:var(--mute)">No replies yet</p>'}
  <textarea id="crp" placeholder="${closed ? 'Reply to reopen this ticket…' : 'Write a reply…'}"></textarea><div style="display:flex;gap:8px;margin-top:6px"><button class="btn" onclick="cReply('${id}')">${closed ? 'Reply & reopen' : 'Send reply'}</button>
  ${closed ? `<button class="btn ghost" onclick="cReply('${id}',1)">Reopen</button>` : `<button class="btn ghost" onclick="cReply('${id}',2)">Mark resolved</button>`}</div></div></div>`;
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

window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/tickets/')) $('#modal').innerHTML = ''; render(); });
S.onChange(() => { if (me()?.role === 'client') { portalCache = null; } if (!ui.task && !ui.ticket && !document.activeElement?.matches('input,textarea')) render(); });
window.addEventListener('storage', () => { S.init().then(render); });
S.init().then(render).catch(e => $('#app').innerHTML = `<p style="padding:30px">Error: ${esc(e.message)}</p>`);
