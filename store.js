// Data layer. Same API for LocalAdapter (demo) and FirebaseAdapter (live).
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const COLLS = ['clients', 'tasks', 'updates', 'notes'];

// Sanitize a client's data for the portal: NO internal comments, only client-visible tasks.
function buildPortal(data, clientId) {
  const client = data.clients.find(c => c.id === clientId);
  if (!client) return null;
  const all = data.tasks.filter(t => t.clientId === clientId);
  const done = all.filter(t => t.status === 'done').length;
  return {
    client: { id: client.id, name: client.name, project: client.project, color: client.color },
    progress: all.length ? Math.round(done * 100 / all.length) : 0,
    counts: { total: all.length, done },
    tasks: all.filter(t => t.clientVisible).map(t => ({ id: t.id, title: t.title, status: t.status, due: t.due, milestone: !!t.milestone,
      checklist: (t.checklist || []).map(c => ({ text: c.text, done: c.done })) })),
    updates: data.updates.filter(u => u.clientId === clientId).sort((a, b) => b.at - a.at)
      .map(u => ({ id: u.id, title: u.title, body: u.body, at: u.at, by: u.byName })),
    publishedAt: Date.now()
  };
}

function demoData() {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  const users = [
    { email: 'admin@sparrow.demo', password: 'admin123', name: 'Shalu Rajbhar', role: 'admin' },
    { email: 'member@sparrow.demo', password: 'member123', name: 'Ravi (Demo)', role: 'member' },
    { email: 'priya@sparrow.demo', password: 'member123', name: 'Priya (Demo)', role: 'member' },
    { email: 'client1@sparrow.demo', password: 'client123', name: 'Demo Client – Glow Home', role: 'client', clientId: 'c1' },
    { email: 'client2@sparrow.demo', password: 'client123', name: 'Demo Client – Fit Kart', role: 'client', clientId: 'c2' }
  ];
  const clients = [
    { id: 'c1', name: 'DEMO · Glow Home Decor', project: 'Amazon account setup & listings', color: '#f59e0b' },
    { id: 'c2', name: 'DEMO · FitKart Sports', project: 'Amazon PPC & A+ content', color: '#10b981' },
    { id: 'c3', name: 'DEMO · Desi Spices Co.', project: 'Brand Registry + catalog', color: '#6366f1' }
  ];
  const T = (id, clientId, title, status, assignee, due, priority, extra = {}) => ({ id, clientId, title, status, assignee, due, priority,
    desc: '', clientVisible: false, milestone: false, checklist: [], comments: [], attachments: [], activity: [{ at: Date.now() - 864e5, by: 'Shalu Rajbhar', text: 'created this task' }], order: Date.now(), ...extra });
  const tasks = [
    T('t1', 'c1', 'Seller Central account verification', 'done', 'admin@sparrow.demo', d(-6), 'high', { clientVisible: true, milestone: true,
      checklist: [{ id: 'k1', text: 'GST & PAN uploaded', done: true }, { id: 'k2', text: 'Bank account verified', done: true }] }),
    T('t2', 'c1', 'Create 25 product listings (flat file)', 'doing', 'member@sparrow.demo', d(0), 'high', { clientVisible: true, milestone: true,
      desc: 'Use client catalog sheet. Keywords from Helium10 research.',
      checklist: [{ id: 'k3', text: 'Keyword research', done: true }, { id: 'k4', text: 'Titles & bullets', done: true }, { id: 'k5', text: 'Upload flat file', done: false }],
      comments: [{ id: 'm1', by: 'Ravi (Demo)', at: Date.now() - 36e5, text: 'Internal: client ka MRP sheet galat hai, confirm karna hai.' }],
      attachments: [{ id: 'a1', name: 'catalog-sheet.xlsx', url: '#' }] }),
    T('t3', 'c1', 'Product photography brief', 'review', 'priya@sparrow.demo', d(2), 'medium', { clientVisible: true }),
    T('t4', 'c1', 'Internal: pricing margin calculation', 'todo', 'admin@sparrow.demo', d(-1), 'medium'),
    T('t5', 'c2', 'Launch Sponsored Products campaigns', 'doing', 'priya@sparrow.demo', d(1), 'high', { clientVisible: true, milestone: true }),
    T('t6', 'c2', 'A+ content design (5 ASINs)', 'todo', 'member@sparrow.demo', d(4), 'medium', { clientVisible: true }),
    T('t7', 'c2', 'Weekly ACoS report', 'todo', 'admin@sparrow.demo', d(0), 'low', { clientVisible: true }),
    T('t8', 'c2', 'Fix suppressed listings', 'done', 'member@sparrow.demo', d(-3), 'high', { clientVisible: true }),
    T('t9', 'c3', 'Brand Registry application', 'review', 'admin@sparrow.demo', d(-2), 'high', { clientVisible: true, milestone: true }),
    T('t10', 'c3', 'Catalog cleanup (variations)', 'todo', 'priya@sparrow.demo', d(6), 'medium')
  ];
  const updates = [
    { id: 'u1', clientId: 'c1', title: 'Account verified ✅', body: 'Your Seller Central account is verified. Listings work has started.', at: Date.now() - 5 * 864e5, byName: 'Shalu Rajbhar' },
    { id: 'u2', clientId: 'c1', title: '18 of 25 listings ready', body: 'Titles and bullets are done. Upload expected by today evening.', at: Date.now() - 864e5, byName: 'Ravi (Demo)' },
    { id: 'u3', clientId: 'c2', title: 'PPC campaigns going live', body: 'Campaign structure approved. Launch tomorrow with ₹500/day budget.', at: Date.now() - 2 * 864e5, byName: 'Priya (Demo)' }
  ];
  const h = 36e5, now = Date.now();
  const tickets = [
    { id: 'k101', no: 101, clientId: 'c1', title: 'Listing suppressed – missing main image', desc: 'Our 3 ASINs show "Search suppressed" since yesterday. Please check.', category: 'Listing', priority: 'high', status: 'new', assignee: null, attachments: [{ id: 'x1', name: 'screenshot-suppressed.png', url: '#' }],
      createdAt: now - 3 * h, createdBy: 'Demo Client – Glow Home', thread: [], lastClientAt: now - 3 * h, lastTeamAt: 0, seenTeamAt: 0, seenClientAt: now - 3 * h },
    { id: 'k102', no: 102, clientId: 'c2', title: 'ACoS too high on running shoes campaign', desc: 'ACoS is 48% this week. Can you optimise?', category: 'Ads', priority: 'medium', status: 'progress', assignee: 'priya@sparrow.demo', attachments: [],
      createdAt: now - 26 * h, createdBy: 'Demo Client – Fit Kart', thread: [
        { id: 'r1', by: 'Priya (Demo)', role: 'team', text: 'Picked this up. Checking search term report now.', at: now - 20 * h },
        { id: 'r2', by: 'Demo Client – Fit Kart', role: 'client', text: 'Thanks! Budget can be increased if needed.', at: now - 2 * h }],
      lastClientAt: now - 2 * h, lastTeamAt: now - 20 * h, seenTeamAt: now - 20 * h, seenClientAt: now - 2 * h },
    { id: 'k103', no: 103, clientId: 'c1', title: 'Disbursement on hold', desc: 'Amazon payment is on hold for 7 days.', category: 'Payment', priority: 'high', status: 'waiting', assignee: 'admin@sparrow.demo', attachments: [],
      createdAt: now - 50 * h, createdBy: 'Demo Client – Glow Home', thread: [
        { id: 'r3', by: 'Shalu Rajbhar', role: 'team', text: 'Please share your latest bank statement (PDF) so we can raise a case with Seller Support.', at: now - 5 * h }],
      lastClientAt: now - 50 * h, lastTeamAt: now - 5 * h, seenTeamAt: now - 5 * h, seenClientAt: now - 50 * h },
    { id: 'k104', no: 104, clientId: 'c3', title: 'Brand Registry trademark question', desc: 'Is a TM application number enough?', category: 'Account health', priority: 'low', status: 'resolved', assignee: 'admin@sparrow.demo', attachments: [],
      createdAt: now - 120 * h, createdBy: 'Demo Client', thread: [{ id: 'r4', by: 'Shalu Rajbhar', role: 'team', text: 'Yes, the application number works for IP Accelerator / Brand Registry.', at: now - 100 * h }],
      lastClientAt: now - 120 * h, lastTeamAt: now - 100 * h, seenTeamAt: now - 100 * h, seenClientAt: now - 90 * h }
  ];
  const notes = [{ id: 'n1', ticketId: 'k102', by: 'Priya (Demo)', text: 'Internal: 3 broad keywords are burning budget, will add negatives.', at: now - 19 * h }];
  return { users, clients, tasks, updates, tickets, notes };
}

class LocalAdapter {
  constructor() { this.mode = 'demo'; this.key = 'sparrow-tasks-v2'; this.subs = []; }
  async init() {
    try { this.data = JSON.parse(localStorage.getItem(this.key)); } catch (e) { }
    if (!this.data) { this.data = demoData(); this.persist(); }
    const s = localStorage.getItem(this.key + '-session');
    this.user = s ? this.data.users.find(u => u.email === s) || null : null;
  }
  persist() { localStorage.setItem(this.key, JSON.stringify(this.data)); }
  emit() { this.persist(); this.subs.forEach(f => f()); }
  onChange(f) { this.subs.push(f); }
  pub(u) { if (!u) return null; const { password, ...r } = u; return r; }
  currentUser() { return this.pub(this.user); }
  async signIn(kind, email, password) {
    const u = this.data.users.find(x => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password);
    if (!u) throw new Error('Wrong email or password');
    const isTeam = u.role !== 'client';
    if ((kind === 'team') !== isTeam) throw new Error(isTeam ? 'This is a team account – use Team Login' : 'This is a client account – use Client Login');
    this.user = u; localStorage.setItem(this.key + '-session', u.email); return this.pub(u);
  }
  async signInGoogle() { throw new Error('Google login works after Firebase is connected'); }
  async signOut() { this.user = null; localStorage.removeItem(this.key + '-session'); }
  // team-only reads
  teamData() { if (!this.user || this.user.role === 'client') throw new Error('Not allowed'); return { ...this.data, users: this.data.users.map(u => this.pub(u)) }; }
  async save(coll, obj) { this.assertTeam(); if (!obj.id) obj.id = uid(); const a = this.data[coll]; const i = a.findIndex(x => x.id === obj.id); i >= 0 ? a[i] = obj : a.push(obj); this.emit(); return obj; }
  async remove(coll, id) { this.assertTeam(); this.data[coll] = this.data[coll].filter(x => x.id !== id); this.emit(); }
  async saveUser(u, password) {
    if (this.user?.role !== 'admin') throw new Error('Only admin can manage logins');
    const i = this.data.users.findIndex(x => x.email === u.email);
    if (i >= 0) this.data.users[i] = { ...this.data.users[i], ...u, ...(password ? { password } : {}) };
    else { if (!password) throw new Error('Password required'); this.data.users.push({ ...u, password }); }
    this.emit();
  }
  async removeUser(email) { if (this.user?.role !== 'admin') throw new Error('Only admin'); this.data.users = this.data.users.filter(u => u.email !== email); this.emit(); }
  assertTeam() { if (!this.user || this.user.role === 'client') throw new Error('Not allowed'); }
  // client portal read: only own clientId
  async portal() { const u = this.user; if (!u || u.role !== 'client') throw new Error('Not allowed'); return buildPortal(this.data, u.clientId); }
  async resetDemo() { this.data = demoData(); this.emit(); }
  // Tickets: team sees all; client sees only own (internal notes live in 'notes', team-only)
  tickets() { const u = this.user; if (!u) return []; this.data.tickets ||= []; return u.role === 'client' ? this.data.tickets.filter(t => t.clientId === u.clientId) : this.data.tickets; }
  async saveTicket(t) {
    const u = this.user; if (!u) throw new Error('Login first');
    if (u.role === 'client') { if (t.clientId !== u.clientId) throw new Error('Not allowed'); const old = this.data.tickets.find(x => x.id === t.id); if (old && (old.assignee !== t.assignee)) throw new Error('Not allowed'); }
    if (!t.id) { t.id = uid(); t.no = Math.max(100, ...this.data.tickets.map(x => x.no || 0)) + 1; }
    const a = this.data.tickets; const i = a.findIndex(x => x.id === t.id); i >= 0 ? a[i] = t : a.push(t); this.emit(); return t;
  }
}

class FirebaseAdapter {
  constructor(cfg) { this.mode = 'firebase'; this.cfg = cfg; this.subs = []; this.data = { users: [], clients: [], tasks: [], updates: [], notes: [], tickets: [] }; }
  async init() {
    const v = '10.12.2', base = `https://www.gstatic.com/firebasejs/${v}/`;
    const app = await import(base + 'firebase-app.js'), auth = await import(base + 'firebase-auth.js'), fs = await import(base + 'firebase-firestore.js');
    this.F = { ...app, ...auth, ...fs };
    this.app = app.initializeApp(this.cfg); this.auth = auth.getAuth(this.app); this.db = fs.getFirestore(this.app);
    await new Promise(r => { const off = auth.onAuthStateChanged(this.auth, async fu => { off(); if (fu) await this.loadProfile(fu).catch(() => this.user = null); r(); }); });
  }
  emit() { this.subs.forEach(f => f()); }
  onChange(f) { this.subs.push(f); }
  currentUser() { return this.user || null; }
  async loadProfile(fu) {
    const { doc, getDoc, setDoc } = this.F; const email = fu.email.toLowerCase();
    let s = await getDoc(doc(this.db, 'users', email));
    if (!s.exists()) {
      // bootstrap first admin
      const meta = await getDoc(doc(this.db, 'meta', 'bootstrap'));
      if (meta.exists()) throw new Error('No access. Ask admin to create your login.');
      await setDoc(doc(this.db, 'users', email), { email, name: fu.displayName || email, role: 'admin' });
      await setDoc(doc(this.db, 'meta', 'bootstrap'), { by: email, at: Date.now() });
      s = await getDoc(doc(this.db, 'users', email));
    }
    this.user = s.data();
    this.user.role !== 'client' ? this.listen() : this.listenClient();
    return this.user;
  }
  check(kind) {
    const isTeam = this.user.role !== 'client';
    if ((kind === 'team') !== isTeam) { const r = isTeam ? 'This is a team account – use Team Login' : 'This is a client account – use Client Login'; this.signOut(); throw new Error(r); }
    return this.user;
  }
  async signIn(kind, email, password) { const fu = (await this.F.signInWithEmailAndPassword(this.auth, email.trim(), password)).user; await this.loadProfile(fu); return this.check(kind); }
  async signInGoogle(kind) { const fu = (await this.F.signInWithPopup(this.auth, new this.F.GoogleAuthProvider())).user; await this.loadProfile(fu); return this.check(kind); }
  async signOut() { (this.unsubs || []).forEach(f => f()); this.unsubs = []; this.user = null; await this.F.signOut(this.auth); }
  listen() {
    const { collection, onSnapshot } = this.F; this.unsubs = [];
    const sub = (name, ref) => this.unsubs.push(onSnapshot(ref, s => { this.data[name] = s.docs.map(d => ({ id: d.id, ...d.data() })); this.emit(); }));
    COLLS.forEach(c => sub(c, collection(this.db, 'teams', 'sparrow', c)));
    sub('users', collection(this.db, 'users'));
    sub('tickets', collection(this.db, 'tickets'));
  }
  listenClient() {
    const { collection, onSnapshot, query, where } = this.F; this.unsubs = [];
    this.unsubs.push(onSnapshot(query(collection(this.db, 'tickets'), where('clientId', '==', this.user.clientId)), s => { this.data.tickets = s.docs.map(d => ({ id: d.id, ...d.data() })); this.emit(); }));
  }
  tickets() { return this.data.tickets || []; }
  async saveTicket(t) {
    if (!t.id) { t.id = uid(); t.no = Date.now() % 100000; }
    const a = this.data.tickets ||= []; const i = a.findIndex(x => x.id === t.id); i >= 0 ? a[i] = t : a.push(t); this.emit();
    await this.F.setDoc(this.F.doc(this.db, 'tickets', t.id), JSON.parse(JSON.stringify(t))); return t;
  }
  teamData() { if (!this.user || this.user.role === 'client') throw new Error('Not allowed'); return this.data; }
  async save(coll, obj) {
    const { doc, setDoc } = this.F; if (!obj.id) obj.id = uid();
    const a = this.data[coll]; const i = a.findIndex(x => x.id === obj.id); i >= 0 ? a[i] = obj : a.push(obj); this.emit();
    await setDoc(doc(this.db, 'teams', 'sparrow', coll, obj.id), JSON.parse(JSON.stringify(obj)));
    await this.publish(obj.clientId || (coll === 'clients' ? obj.id : null)); return obj;
  }
  async remove(coll, id) { const o = this.data[coll].find(x => x.id === id); await this.F.deleteDoc(this.F.doc(this.db, 'teams', 'sparrow', coll, id)); this.data[coll] = this.data[coll].filter(x => x.id !== id); this.emit(); if (o) await this.publish(o.clientId || (coll === 'clients' ? id : null)); }
  async publish(clientId) { if (!clientId) return; const p = buildPortal(this.data, clientId); const r = this.F.doc(this.db, 'portals', clientId); p ? await this.F.setDoc(r, p) : await this.F.deleteDoc(r); }
  async saveUser(u, password) {
    if (this.user?.role !== 'admin') throw new Error('Only admin can manage logins');
    u.email = u.email.toLowerCase();
    if (password) { // create Auth account with a secondary app so admin stays signed in
      const sec = this.F.initializeApp(this.cfg, 'sec-' + Date.now()); const a2 = this.F.getAuth(sec);
      try { await this.F.createUserWithEmailAndPassword(a2, u.email, password); } catch (e) { if (e.code !== 'auth/email-already-in-use') throw e; }
      await this.F.signOut(a2);
    }
    await this.F.setDoc(this.F.doc(this.db, 'users', u.email), u, { merge: true });
  }
  async removeUser(email) { await this.F.deleteDoc(this.F.doc(this.db, 'users', email)); }
  async portal() { const s = await this.F.getDoc(this.F.doc(this.db, 'portals', this.user.clientId)); return s.exists() ? s.data() : null; }
  async resetDemo() { }
}

window.Store = window.FIREBASE_CONFIG ? new FirebaseAdapter(window.FIREBASE_CONFIG) : new LocalAdapter();
