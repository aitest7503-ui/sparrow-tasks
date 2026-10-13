// v3: Asana-style list view – configurable columns, column menu, custom fields, automations.
// Persisted per project on the client doc (teams/sparrow/clients/{id}.lv); task values in task.cf.
const BCOL = { as: ['Assignee', 160], due: ['Due date', 130], pr: ['Priority', 110], st: ['Status', 120], vis: ['Client', 110] };
const FTYPES = { text: 'Text', number: 'Number', date: 'Date', select: 'Single-select' };
const OPTC = ['#e8384f', '#fd612c', '#fdba31', '#a4cf30', '#37c5ab', '#4186e0', '#7a6ff0', '#e362e3', '#8da3a6'];
ui.lv = ui.lv || {};
const lvOf = c => { const l = JSON.parse(JSON.stringify(c.lv || {})); l.fields ||= []; l.hidden ||= []; l.autos ||= [];
  const all = [...Object.keys(BCOL), ...l.fields.map(f => f.id)]; l.order = (l.order || []).filter(x => all.includes(x)); all.forEach(x => l.order.includes(x) || l.order.push(x)); return l; };
const lvs = cid => ui.lv[cid] ||= { sort: null, filter: null, group: null, col: {}, q: '', quick: 'all' };
const fieldOf = (l, id) => l.fields.find(f => f.id === id);
const colName = (l, id) => id === 'name' ? 'Task name' : BCOL[id] ? BCOL[id][0] : (fieldOf(l, id) || {}).name || id;
const visCols = l => l.order.filter(x => !l.hidden.includes(x));
async function saveLv(cid, f) { const c = JSON.parse(JSON.stringify(cl(cid))), l = lvOf(c); f(l); c.lv = l; await S.save('clients', c); render(); }
const PRO = { high: 0, medium: 1, low: 2 }, STO = { todo: 0, doing: 1, review: 2, done: 3 };
function cval(t, col, l) {
  if (col === 'name') return (t.title || '').toLowerCase();
  if (col === 'as') return uname(t.assignee).toLowerCase(); if (col === 'due') return t.due || '9999';
  if (col === 'pr') return PRO[t.priority] ?? 9; if (col === 'st') return STO[t.status] ?? 9; if (col === 'vis') return t.clientVisible ? 0 : 1;
  const f = fieldOf(l, col), v = (t.cf || {})[col]; if (v == null || v === '') return f && f.type === 'number' ? Infinity : '\uffff';
  return f && f.type === 'number' ? +v : f && f.type === 'select' ? f.options.findIndex(o => o.id === v) : String(v).toLowerCase();
}
function dval(t, col, l) { // display value for grouping / filtering
  if (col === 'as') return uname(t.assignee); if (col === 'due') return t.due ? fmt(t.due) : 'No due date'; if (col === 'pr') return t.priority || 'none';
  if (col === 'st') return health(t)[1]; if (col === 'vis') return t.clientVisible ? 'Visible to client' : 'Internal';
  const f = fieldOf(l, col), v = (t.cf || {})[col]; if (!f) return ''; if (f.type === 'select') return (f.options.find(o => o.id === v) || {}).name || 'No ' + f.name;
  return v == null || v === '' ? 'No ' + f.name : String(v);
}
function listToolbar(c) {
  const st = lvs(c.id), l = lvOf(c), chip = (on, t) => on ? `<span class="chip vis">${t}</span>` : '';
  return `<div class="toolbar lvbar"><button class="btn sm" onclick="newTask('${c.id}')">＋ Add task</button><span style="flex:1"></span>
  ${chip(st.filter, 'Filter: ' + esc(st.filter && colName(l, st.filter.col) + ' = ' + st.filter.val) + ` <a onclick="lvs('${c.id}').filter=null;render()">✕</a>`)}
  ${chip(st.sort, 'Sort: ' + esc(st.sort && colName(l, st.sort.col)) + (st.sort && st.sort.dir < 0 ? ' ↓' : ' ↑') + ` <a onclick="lvs('${c.id}').sort=null;render()">✕</a>`)}
  ${chip(st.group, 'Group: ' + esc(st.group && colName(l, st.group)) + ` <a onclick="lvs('${c.id}').group=null;render()">✕</a>`)}
  <button class="btn ghost sm" onclick="quickFilter(event,'${c.id}')">⚲ Filter</button><button class="btn ghost sm" onclick="pickMenu(event,'${c.id}','sort')">⇅ Sort</button>
  <button class="btn ghost sm" onclick="pickMenu(event,'${c.id}','group')">▤ Group</button><button class="btn ghost sm" onclick="optionsMenu(event,'${c.id}')">⚙ Options</button>
  <input class="lvq" id="lvq" placeholder="🔍 Search" value="${esc(st.q)}" oninput="lvs('${c.id}').q=this.value;clearTimeout(window._lq);window._lq=setTimeout(()=>{render();const e=$('#lvq');e.focus();e.setSelectionRange(e.value.length,e.value.length)},250)"></div>`;
}
function gridTpl(cols) { return `${innerWidth<=820?"190px":"minmax(240px,1fr)"} ${cols.map(x => (BCOL[x] ? BCOL[x][1] : 140) + 'px').join(' ')} 44px`; }
function listTabV3(c) {
  const l = lvOf(c), st = lvs(c.id), cols = visCols(l), g = gridTpl(cols);
  let a = ptasks(c);
  if (st.q) a = a.filter(t => (t.title || '').toLowerCase().includes(st.q.toLowerCase()));
  if (st.quick === 'open') a = a.filter(t => t.status !== 'done'); if (st.quick === 'done') a = a.filter(t => t.status === 'done');
  if (st.quick === 'me') a = a.filter(t => t.assignee === me().email); if (st.quick === 'week') a = a.filter(t => t.due && t.due <= addDays(7) && t.status !== 'done');
  if (st.filter) a = a.filter(t => dval(t, st.filter.col, l) === st.filter.val);
  if (st.sort) a = [...a].sort((x, y) => { const p = cval(x, st.sort.col, l), q = cval(y, st.sort.col, l); return (p > q ? 1 : p < q ? -1 : 0) * st.sort.dir; });
  const groups = st.group ? [...new Set(a.map(t => dval(t, st.group, l)))].map(k => ({ id: 'g:' + k, name: k, tasks: a.filter(t => dval(t, st.group, l) === k) }))
    : sections(c).map(s => ({ id: s.id, name: s.name, sec: true, tasks: a.filter(t => secOf(t) === s.id) }));
  const head = `<div class="lrow lhead v3" style="grid-template-columns:${g}"><span class="c-name hcell" onclick="colMenu(event,'${c.id}','name')">Task name <i>⌄</i></span>
   ${cols.map(x => `<span class="hcell" data-col="${x}" onclick="colMenu(event,'${c.id}','${x}')">${fieldOf(l, x) ? '<b class="fi">' + ({ text: 'T', number: '#', date: '📅', select: '◉' })[fieldOf(l, x).type] + '</b>' : ''}<span class="ell">${esc(colName(l, x))}</span>${st.sort && st.sort.col === x ? (st.sort.dir > 0 ? ' ↑' : ' ↓') : ''}<i>⌄</i></span>`).join('')}
   <span class="c-add" title="Add field" onclick="addFieldDlg('${c.id}')">＋</span></div>`;
  return `<div class="list v3wrap"><div class="v3">${head}${groups.map(gr => { const col = st.col[gr.id];
    return `<div class="lsec" ${gr.sec ? `data-sec="${gr.id}"` : ''}><div class="lsh" onclick="lvs('${c.id}').col['${esc(gr.id).replace(/'/g, '')}']=!${!!col};render()"><span class="tw">${col ? '▸' : '▾'}</span> ${esc(gr.name)} <span class="mute">${gr.tasks.length}</span></div>
    ${col ? '' : gr.tasks.map(t => rowV3(t, c, l, cols, g)).join('') + `<a class="addrow" onclick="newTask('${c.id}'${gr.sec ? `,'${gr.id}'` : ''})">Add task…</a>`}</div>`; }).join('')}
   ${st.group ? '' : `<a class="addsec" onclick="addSection('${c.id}')">＋ Add section</a>`}</div></div>`;
}
function rowV3(t, c, l, cols, g) {
  const tm = D().users.filter(u => u.role !== 'client'), cf = t.cf || {};
  const cell = x => {
    if (x === 'as') return `<span class="c-as">${av(t.assignee, 22)}<select class="inl" onchange="inl('${t.id}','assignee',this.value)"><option value="">Unassigned</option>${tm.map(u => `<option value="${u.email}" ${u.email === t.assignee ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></span>`;
    if (x === 'due') return `<span class="c-due"><input type="date" class="inl ${late(t) ? 'late' : ''}" value="${t.due || ''}" onchange="inl('${t.id}','due',this.value)">${l.rollup && (t.checklist || []).length ? `<small class="mute">☑${t.checklist.filter(k => k.done).length}/${t.checklist.length}</small>` : ''}</span>`;
    if (x === 'pr') return `<span class="c-pr"><select class="chip p-${t.priority}" onchange="inl('${t.id}','priority',this.value)">${['high', 'medium', 'low'].map(p => `<option ${p === t.priority ? 'selected' : ''}>${p}</option>`).join('')}</select></span>`;
    if (x === 'st') return `<span class="c-st"><select class="chip h-${health(t)[0]}" title="Task status" onchange="inl('${t.id}','status',this.value)">${STAT.map(([k, n]) => `<option value="${k}" ${k === t.status ? 'selected' : ''}>${k === t.status ? health(t)[1] : n}</option>`).join('')}</select></span>`;
    if (x === 'vis') return `<span class="c-vis"><button class="chip ${t.clientVisible ? 'vis' : ''}" style="cursor:pointer" onclick="inl('${t.id}','clientVisible',${!t.clientVisible})">${t.clientVisible ? '👁 Visible' : 'Internal'}</button></span>`;
    const f = fieldOf(l, x); if (!f) return '<span></span>'; const v = cf[x] ?? '', on = `onchange="cfSet('${t.id}','${x}',this.value)"`;
    if (f.type === 'select') { const o = f.options.find(o => o.id === v); return `<span class="c-cf"><select class="chip" style="${o ? `background:${o.color}33;color:${o.color}` : ''}" ${on}><option value="">–</option>${f.options.map(o => `<option value="${o.id}" ${o.id === v ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</select></span>`; }
    return `<span class="c-cf"><input class="inl" type="${f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}" value="${esc(v)}" ${on}></span>`;
  };
  return `<div class="lrow v3 ${t.status === 'done' ? 'done' : ''} ${ui.task === t.id ? 'sel' : ''}" data-id="${t.id}" draggable="true" style="grid-template-columns:${g}">
  <span class="c-name"><button class="cbx ${t.status === 'done' ? 'on' : ''}" onclick="toggleDone('${t.id}')" aria-label="Complete">✓</button>
   <input class="inl" value="${esc(t.title)}" onchange="inl('${t.id}','title',this.value)">${(t.comments || []).length ? `<span class="mute sm">💬${t.comments.length}</span>` : ''}
   <button class="openp" onclick="openTask('${t.id}')" title="Open details">Details ›</button></span>${cols.map(cell).join('')}<span></span></div>`;
}
async function cfSet(id, fid, v) {
  const t = JSON.parse(JSON.stringify(D().tasks.find(x => x.id === id))), l = lvOf(cl(t.clientId)), f = fieldOf(l, fid); t.cf ||= {}; t.cf[fid] = f.type === 'number' && v !== '' ? +v : v;
  t.activity ||= []; t.activity.push({ at: Date.now(), by: me().name, text: `set ${f.name} to ${f.type === 'select' ? (f.options.find(o => o.id === v) || {}).name || '–' : v || '–'}` });
  const au = l.autos.find(a => a.field === fid && a.value === v);
  if (au && t.status !== 'done') { t.status = 'done'; if (!cl(t.clientId).sections) t.section = 's_done'; t.activity.push({ at: Date.now(), by: 'Automation', text: `marked complete (${f.name} = ${(f.options.find(o => o.id === v) || {}).name || v})` }); toast('⚡ Automation: task marked complete'); }
  await S.save('tasks', t); render();
}
// ---- menus (submenus open on hover, or tap on mobile) ----
const sub = (label, items) => `<div class="sub" onclick="if(!event.target.closest('.subm')){event.stopPropagation();this.classList.toggle('open')}"><a>${label}<span style="margin-left:auto">›</span></a><div class="subm">${items}</div></div>`;
function colMenu(e, cid, col) {
  const l = lvOf(cl(cid)), i = l.order.indexOf(col), vc = visCols(l), vi = vc.indexOf(col), S_ = `lvs('${cid}')`;
  const sortI = sub('⇅ Sort', `<a onclick="${S_}.sort={col:'${col}',dir:1};render()">Ascending ↑</a><a onclick="${S_}.sort={col:'${col}',dir:-1};render()">Descending ↓</a><a onclick="${S_}.sort=null;render()">None</a>`);
  if (col === 'name') return pop(e, sortI);
  pop(e, `<div class="mute sm" style="padding:4px 14px">${esc(colName(l, col))}</div>${sortI}
   <a onclick="filterCol(event,'${cid}','${col}')">⚲ Filter…</a>
   ${sub('▤ Group', `<a onclick="${S_}.group='${col}';render()">Group by this field</a><a onclick="${S_}.group=null;render()">None (sections)</a>`)}
   ${col === 'due' ? `<a onclick="saveLv('${cid}',l=>l.rollup=!l.rollup)">${l.rollup ? '✓ ' : ''}Roll up subtask dates</a>` : ''}
   ${sub('↔ Move column', `${vi > 0 ? `<a onclick="moveCol('${cid}','${col}',-1)">← Move left</a>` : ''}${vi < vc.length - 1 ? `<a onclick="moveCol('${cid}','${col}',1)">Move right →</a>` : ''}`)}
   <a onclick="saveLv('${cid}',l=>l.hidden.push('${col}'))">🙈 Hide column</a>
   <a onclick="autoDlg('${cid}','${col}')">⚡ Add automation to field</a>
   ${fieldOf(l, col) ? `<a onclick="addFieldDlg('${cid}','${col}')">✎ Edit field</a><a onclick="delField('${cid}','${col}')" style="color:#c92f54">🗑 Delete field</a>` : ''}`);
}
function moveCol(cid, col, d) { saveLv(cid, l => { const v = visCols(l), j = v.indexOf(col), other = v[j + d]; if (!other) return; const a = l.order.indexOf(col), b = l.order.indexOf(other); [l.order[a], l.order[b]] = [l.order[b], l.order[a]]; }); }
function filterCol(e, cid, col) { const c = cl(cid), l = lvOf(c), vals = [...new Set(ptasks(c).map(t => dval(t, col, l)))].sort();
  setTimeout(() => modal(`<h2>Filter by ${esc(colName(l, col))}</h2>${vals.map(v => `<a class="fopt" onclick='lvs("${cid}").filter={col:"${col}",val:${JSON.stringify(v).replace(/'/g, '&#39;')}};closeModal();render()'>${esc(v)}</a>`).join('')}<div class="row" style="margin-top:12px"><button class="btn ghost" onclick="lvs('${cid}').filter=null;closeModal();render()">Clear filter</button></div>`)); }
function quickFilter(e, cid) { const q = k => `lvs('${cid}').quick='${k}';render()`, st = lvs(cid), m = k => st.quick === k ? '✓ ' : '';
  pop(e, `<a onclick="${q('all')}">${m('all')}All tasks</a><a onclick="${q('open')}">${m('open')}Incomplete tasks</a><a onclick="${q('done')}">${m('done')}Completed tasks</a><a onclick="${q('week')}">${m('week')}Due this week</a><a onclick="${q('me')}">${m('me')}Just my tasks</a>`); }
function pickMenu(e, cid, kind) { const l = lvOf(cl(cid)), cols = ['name', ...visCols(l)].filter(x => kind === 'sort' || x !== 'name');
  pop(e, cols.map(x => kind === 'sort' ? `<a onclick="lvs('${cid}').sort={col:'${x}',dir:1};render()">${esc(colName(l, x))}</a>` : `<a onclick="lvs('${cid}').group='${x}';render()">${esc(colName(l, x))}</a>`).join('') + `<a onclick="lvs('${cid}').${kind}=null;render()">${kind === 'sort' ? 'None' : 'Sections (default)'}</a>`); }
function optionsMenu(e, cid) { const l = lvOf(cl(cid));
  pop(e, `<div class="mute sm" style="padding:4px 14px">Hidden columns</div>${l.hidden.map(x => `<a onclick="saveLv('${cid}',l=>l.hidden=l.hidden.filter(y=>y!=='${x}'))">👁 Show ${esc(colName(l, x))}</a>`).join('') || '<div class="mute sm" style="padding:4px 14px">None</div>'}
   <a onclick="addFieldDlg('${cid}')">＋ Add field</a><a onclick="saveLv('${cid}',l=>{l.hidden=[];l.order=[]})">↺ Reset column order</a>`); }
const customizeMenu = (e, cid) => pop(e, `<a onclick="addFieldDlg('${cid}')">＋ Add custom field</a><a onclick="optionsMenu(event,'${cid}')">🙈 Hidden columns</a><a onclick="autoDlg('${cid}')">⚡ Automations</a><a onclick="addSection('${cid}')">＋ Add section</a>`);
// ---- custom fields ----
let fdraft = null;
function addFieldDlg(cid, fid) {
  const l = lvOf(cl(cid)); fdraft = fid ? JSON.parse(JSON.stringify(fieldOf(l, fid))) : { id: 'f' + Date.now().toString(36), name: '', type: 'select', options: [{ id: 'o1', name: 'Option 1', color: OPTC[5] }, { id: 'o2', name: 'Option 2', color: OPTC[2] }] };
  fdraft.cid = cid; fdraft.edit = !!fid; setTimeout(drawField);
}
function drawField() { const f = fdraft;
  modal(`<h2>${f.edit ? 'Edit' : 'Add'} field</h2><label>Field title<input id="fn" value="${esc(f.name)}" placeholder="e.g. Stage, Budget, ASIN" oninput="fdraft.name=this.value"></label>
  <label>Field type<select id="ft" onchange="fdraft.type=this.value;drawField()" ${f.edit ? 'disabled' : ''}>${Object.entries(FTYPES).map(([k, n]) => `<option value="${k}" ${k === f.type ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
  ${f.type === 'select' ? `<div class="mute sm" style="margin:8px 0 4px">Options</div>${f.options.map((o, i) => `<div class="optrow"><input type="color" value="${o.color}" onchange="fdraft.options[${i}].color=this.value"><input value="${esc(o.name)}" oninput="fdraft.options[${i}].name=this.value"><button class="iconbtn" onclick="fdraft.options.splice(${i},1);drawField()">✕</button></div>`).join('')}
   <a class="addrow" style="padding-left:4px" onclick="fdraft.options.push({id:'o'+Date.now().toString(36),name:'Option '+(fdraft.options.length+1),color:OPTC[fdraft.options.length%OPTC.length]});drawField()">＋ Add an option</a>` : ''}
  <div class="row" style="margin-top:14px;justify-content:flex-end;gap:8px"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn" id="fsave" onclick="saveField()">${f.edit ? 'Save' : 'Create field'}</button></div>`);
  setTimeout(() => $('#fn') && $('#fn').focus()); }
async function saveField() { const f = fdraft; if (!f.name.trim()) return toast('Field title required'); const { cid, edit, ...fd } = f; fd.name = fd.name.trim(); if (fd.type !== 'select') delete fd.options;
  closeModal(); await saveLv(cid, l => { const i = l.fields.findIndex(x => x.id === fd.id); i >= 0 ? l.fields[i] = fd : (l.fields.push(fd), l.order.push(fd.id)); }); toast(edit ? 'Field updated' : 'Field added'); }
async function delField(cid, fid) { if (!confirm('Delete this field? Values in tasks will be hidden.')) return; await saveLv(cid, l => { l.fields = l.fields.filter(f => f.id !== fid); l.order = l.order.filter(x => x !== fid); l.autos = l.autos.filter(a => a.field !== fid); }); }
// ---- automations (minimal): when <single-select field> = <option> → mark task complete. Built-in: Status = Done already completes. ----
function autoDlg(cid, col) { const l = lvOf(cl(cid)), sel = l.fields.filter(f => f.type === 'select');
  setTimeout(() => modal(`<h2>⚡ Field automations</h2><p class="mute sm">Built-in: setting <b>Status</b> to Done or ticking the circle marks the task complete.</p>
   ${l.autos.map((a, i) => { const f = fieldOf(l, a.field); return `<div class="optrow">When <b>${esc(f ? f.name : '?')}</b> = <b>${esc(f ? (f.options.find(o => o.id === a.value) || {}).name : '?')}</b> → mark complete <button class="iconbtn" onclick="saveLv('${cid}',l=>l.autos.splice(${i},1));closeModal()">✕</button></div>`; }).join('') || '<p class="mute">No automations yet</p>'}
   ${sel.length ? `<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:10px">When <select id="af" onchange="$('#ao').innerHTML=lvOf(cl('${cid}')).fields.find(f=>f.id===this.value).options.map(o=>'<option value='+o.id+'>'+esc(o.name)+'</option>').join('')">${sel.map(f => `<option value="${f.id}" ${f.id === col ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select> =
     <select id="ao">${(sel.find(f => f.id === col) || sel[0]).options.map(o => `<option value="${o.id}">${esc(o.name)}</option>`).join('')}</select> → mark task complete
     <button class="btn sm" onclick="saveLv('${cid}',l=>l.autos.push({field:$('#af').value,value:$('#ao').value}));closeModal();toast('Automation added')">Add rule</button></div>` : '<p class="mute sm">Add a single-select field (＋ column) to create rules.</p>'}
   <div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn ghost" onclick="closeModal()">Close</button></div>`)); }
// ---- extra tabs/views ----
function messagesTab(c) { const ups = D().updates.filter(u => u.clientId === c.id).sort((x, y) => y.at - x.at);
  return `<div class="card" style="max-width:760px;margin-top:14px"><h3>💬 Messages <span class="chip vis">visible to client</span></h3><input id="ut" placeholder="Subject"><textarea id="ub" placeholder="Write a message to the client / project" style="margin-top:8px"></textarea>
  <button class="btn" style="margin-top:8px" onclick="postUpdate('${c.id}')">Post message</button>${ups.map(u => `<div class="cm"><b>${esc(u.title)}</b><div>${esc(u.body)}</div><small class="mute">${esc(u.byName)} · ${ago(u.at)}</small></div>`).join('') || '<p class="mute">No messages yet</p>'}</div>`; }
function portfoliosView() { return page('Portfolios', '', 'All client projects at a glance') + `<div class="pfgrid">${D().clients.map(c => `<a class="card pf" href="#/project/${c.id}/list">${prjIcon(c, 30)} <b>${esc(cname(c))}</b><div class="mute sm">${esc(c.project || '')}</div><div class="bar"><i style="width:${prog(c.id)}%;background:${c.color}"></i></div><small>${prog(c.id)}% · ${ptasks(c).filter(t => late(t)).length} overdue</small></a>`).join('')}</div>`; }
