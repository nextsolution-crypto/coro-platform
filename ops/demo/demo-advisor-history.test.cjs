'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const h = require('./demo-advisor-history.cjs');

test('builds a deterministic, realistic two-month history', () => {
  const a = h.build();
  const b = h.build();
  assert.deepStrictEqual(a.taskTime.map((e) => e.id), b.taskTime.map((e) => e.id));
  assert.strictEqual(a.mandates.length, 57);
  const types = a.mandates.reduce((acc, m) => ({ ...acc, [m.type]: (acc[m.type] || 0) + 1 }), {});
  assert.deepStrictEqual(types, { PMU: 32, PSI: 19, PCA: 6 });
  assert.strictEqual(new Set(a.mandates.map((m) => m.name)).size, a.mandates.length);
  for (const m of a.mandates) {
    assert.ok(m.rate >= 120 && m.rate <= 170);
    if (m.type === 'PSI') assert.strictEqual(m.budget, 20);
    if (m.type === 'PMU') assert.ok(m.budget >= 30 && m.budget <= 120);
  }
  for (const adv of h.ADVISORS) assert.ok(adv.cost >= 30 && adv.cost <= 40);
  // Au plus 8 h par jour et par conseiller, rien dans le futur.
  const daily = {};
  for (const e of [...a.taskTime, ...a.timelog]) {
    assert.ok(e.date.toISOString().slice(0, 10) <= h.AS_OF);
    const k = `${e.userId}|${e.date.toISOString().slice(0, 10)}`;
    daily[k] = (daily[k] || 0) + e.heures;
  }
  assert.ok(Math.max(...Object.values(daily)) <= 8.5);
  // Non facturable : 6 h au plus par semaine et par conseiller.
  const weekly = {};
  for (const e of a.timelog) {
    const w = Math.floor((e.date - new Date('2026-09-07T00:00:00Z')) / 6048e5);
    weekly[`${e.userId}|${w}`] = (weekly[`${e.userId}|${w}`] || 0) + e.heures;
  }
  assert.ok(Math.max(...Object.values(weekly)) <= 6);
  assert.deepStrictEqual(h.CLOSED_PERIODS, ['2026-09', '2026-10']);
  assert.strictEqual(h.AS_OF, '2026-11-24');
  // Tous les noms de la démo sont fictifs et identifiés comme tels.
  for (const x of [...h.CLIENTS, ...h.BUILDINGS]) assert.match(x.name, /Démo/);
  for (const adv of h.ADVISORS) assert.match(adv.email, /@demo-coro\.invalid$/);
});

test('every write is scoped to the demo organization', () => {
  const src = fs.readFileSync(path.join(__dirname, 'demo-advisor-history.cjs'), 'utf8');
  assert.match(src, /organizationId: '916f54ec-af22-45e0-99db-a369d9630002'/);
  const deletes = src.match(/deleteMany\(\{ where: \{[^}]*/g) || [];
  for (const d of deletes) assert.ok(/organizationId: org|task: \{ projectId|schedule: \{ userId|bookingId: \{ in: bookingIds/.test(d), d);
  assert.doesNotMatch(src, /\$executeRawUnsafe\((?!'SET TRANSACTION READ ONLY')/);
});

test('lot 2 adds observations, comments, audit trail and live booking requests', () => {
  const lot = h.buildLot2(h.build());
  assert.ok(lot.observations.length > 20 && lot.comments.length > 20 && lot.audit.length > 50);
  assert.strictEqual(lot.bookings.length, 4);
  for (const b of lot.bookings) assert.ok(b.requestedDate.toISOString().slice(0, 10) >= h.AS_OF);
  for (const u of lot.clientUsers) assert.match(u.email, /@example\.invalid$/);
});

