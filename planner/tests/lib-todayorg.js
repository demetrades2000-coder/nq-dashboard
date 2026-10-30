// Shared seed for the Today-organizer test and the height measurement. A busy user: two jobs, bills, deals, trades, prop, worth, miles ...
const base = require('./lib-money');
const { wait, nqCache, trade } = base;
const PORT = process.env.PORT || 8789;
// Friday Sept 4 2026, 12:30 pm in New York (a Q3 tax date is 11 days away, so the Taxes card shows too)
const NOW = new Date('2026-09-04T12:30:00-04:00').getTime();
const TODAY = '2026-09-04';
const ev = (id, title, date, start, end, x = {}) => ({ id, title, cat: 'personal', date, allDay: false, start, end, endDate: '', repeat: 'none', until: '', notes: '', proj: '', ex: [], ...x });
const jobs = [{ id: 'job-outback', name: 'Outback Steakhouse', color: '#b91c1c', start: '16:00', end: '22:00', rate: 12, days: [] }, { id: 'job-electric', name: 'Electric', color: '#ca8a04', start: '07:00', end: '15:30', rate: 25, days: [] }];
// opts.clean = a quiet day: no clash, no shift today, no bill soon, no follow-up due
function fullState(o = {}) {
  const s = {
    v: 1, view: 'today', weekStart: 0, jobs,
    categories: [{ id: 'job-outback', name: 'Outback Steakhouse', color: '#b91c1c' }, { id: 'job-electric', name: 'Electric', color: '#ca8a04' }, { id: 'personal', name: 'Personal', color: '#64748b' }, { id: 'trading', name: 'Trading', color: '#2563eb' }],
    events: [
      ev('e1', 'Electric', '2026-08-31', '07:00', '15:30', { cat: 'job-electric', repeat: o.clean ? 'none' : 'weekdays' }),
      ev('e2', 'Dentist', TODAY, '14:00', '15:00'),
      ev('e4', 'Call Sam', '2026-09-05', '10:00', '10:30'),
      ev('e5', 'Gym', TODAY, '18:00', '19:00'),
    ],
    tasks: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({ id: 't' + i, title: 'Task number ' + i, date: i % 3 ? TODAY : '2026-09-02', done: i === 8, p: i % 4, created: i })),
    habits: [{ id: 'h1', name: 'Pre-market routine', color: '#2563eb', days: [0, 1, 2, 3, 4, 5, 6], done: [], created: '2026-08-01' }, { id: 'h2', name: 'Read', color: '#d97706', days: [0, 1, 2, 3, 4, 5, 6], done: [], created: '2026-08-01' }],
    goals: [{ id: 'g1', title: 'Fund the account', target: 5000, cur: 1200, due: '2026-12-31', created: 1, kind: 'manual' }],
    money: [
      { id: 'm1', kind: 'in', amt: 800, date: '2026-09-02', note: 'Clipper client', proj: 'clipper', created: 1 }, { id: 'm2', kind: 'out', amt: 120, date: '2026-09-03', note: 'Ads', proj: 'clipper', created: 2 },
      { id: 'm3', kind: 'in', amt: 40, date: TODAY, note: 'Outback tips', proj: '', created: 3 }, { id: 'm4', kind: 'in', amt: 1500, date: '2026-08-20', note: 'Payout', proj: 'nq', created: 4 },
    ],
    bills: [{ id: 'b1', name: 'Rent', amt: 1200, freq: 'monthly', day: 6, ymd: '2026-09-06' }, { id: 'b2', name: 'Phone', amt: 80, freq: 'monthly', day: 20, ymd: '2026-09-20' }],
    cashcfg: [{ id: 'cfg', bal: 2500, tax: 20 }],
    deals: [{ id: 'd1', name: 'Sam lead', kind: 'lead', stage: 'lead', value: 500, follow: '2026-09-02', notes: '', created: 1 }, { id: 'd2', name: 'Big sponsor', kind: 'lead', stage: 'lead', value: 3000, follow: '2026-09-20', notes: '', created: 2 }],
    waiting: [{ id: 'w1', who: 'Landlord', what: 'repair', since: '2026-08-28' }],
    incomegoal: [{ id: 'month', amt: 4000 }], budgets: [{ id: 'job-outback', hours: 24 }],
    tilt: [{ id: 'cfg', maxLoss: 3, stop: 300, cool: 30 }],
    propacct: [{ id: 'pa1', firm: 'MFFU', name: '50K Builder', size: 50000, start: '2026-08-01', end: '2026-08-20', status: 'paid', split: 90, acct: '', proj: 'nq', fees: [{ id: 'f1', kind: 'eval', amt: 150, date: '2026-08-01' }], payouts: [{ id: 'p1', amt: 900, date: '2026-08-25' }], created: 1 }],
    worth: [{ id: 'a:1', name: 'Checking', kind: 'cash', bal: 2500, c: 1, d: TODAY }, { id: 'a:2', name: 'Savings', kind: 'savings', bal: 9000, c: 2, d: TODAY }],
    miles: [{ id: 'mt1', kind: 'trip', date: '2026-09-01', from: 'Home', to: 'Site', job: 'Clipper', miles: 40, rate: 0.7 }],
    paycfg: [{ id: 'job-outback', freq: 'biweekly', first: '2026-09-11', lag: 5, on: true, set: true }],
    avreq: [], hub: [{ id: 'cfg', favs: ['earnings', 'bills'] }], alcfg: [], lastBackup: 0,
    planned: '',
  };
  if (!o.clean) {
    s.events.push(ev('e3', 'Outback Steakhouse', TODAY, '16:00', '22:00', { cat: 'job-outback', repeat: 'weekly' }));
    s.events.push(ev('e6', 'Podcast', TODAY, '16:30', '17:30')); // clashes with the shift
  } else {
    s.deals = [{ id: 'd2', name: 'Big sponsor', kind: 'lead', stage: 'lead', value: 3000, follow: '2026-09-20', notes: '', created: 2 }];
    s.bills = [{ id: 'b2', name: 'Phone', amt: 80, freq: 'monthly', day: 20, ymd: '2026-09-20' }];
    s.waiting = [];
    s.events = s.events.filter((e) => e.cat !== 'personal' || e.id !== 'e5');
  }
  return s;
}
function seedNq(o = {}) {
  const trades = [trade(TODAY, 1788000000, 1788000600, 120), trade('2026-09-03', 1787900000, 1787900600, -80), trade('2026-09-02', 1787800000, 1787800900, 200)];
  return nqCache(NOW, { trades, pnl: { '2026-09-03': -80, '2026-09-02': 200 }, news: o.news || [] });
}
async function open(browser, { now = NOW, state, seed, hash = '', width = 390, height = 844, local } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, timezoneId: 'America/New_York' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|net::ERR|Failed to load resource/.test(m.text())) errs.push('console ' + m.text()); });
  await p.clock.install({ time: now });
  await p.addInitScript(([seed, state, local]) => {
    try {
      if (localStorage.getItem('planner.seeded')) return;
      localStorage.setItem('planner.seeded', '1');
      if (seed) localStorage.setItem('planner.nq', JSON.stringify(seed));
      if (state) localStorage.setItem('planner.v1', JSON.stringify(state));
      if (local) Object.entries(local).forEach(([k, v]) => localStorage.setItem(k, v));
    } catch (e) { /* none */ }
  }, [seed || null, state || null, local || null]);
  await p.goto(`http://127.0.0.1:${PORT}/nq-dashboard/planner/index.html` + hash); await p.waitForSelector('.tdy'); await wait(700);
  return { ctx, p, errs };
}
const st = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')));
// Total height of the Today screen at the given width (scrollHeight of the scrolling container that holds .tdy)
const todayHeight = (p) => p.evaluate(() => { const t = document.querySelector('.tdy'); return Math.round(t.getBoundingClientRect().height); });
module.exports = { NOW, TODAY, PORT, wait, ev, jobs, fullState, seedNq, open, st, todayHeight };
