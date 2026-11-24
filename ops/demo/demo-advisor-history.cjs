'use strict';

/**
 * Historique conseiller de la démo (lot 1) : équipe, mandats, tâches, heures,
 * timelog, clôtures mensuelles et activités, du 8 septembre au 30 novembre 2026.
 *
 * - Déterministe : mêmes données et mêmes identifiants à chaque exécution.
 * - Limité à l'organisation de démo (vérifiée avant toute écriture).
 * - Les entités parentes sont inscrites dans DemoFixtureRecord ; « reset »
 *   retire tout ce que ce lot a créé, sans toucher au reste de la démo.
 * - Sortie : des nombres seulement (journaux GitHub publics).
 */

const crypto = require('node:crypto');

const TARGET = {
  organizationId: '916f54ec-af22-45e0-99db-a369d9630002',
  organizationName: 'CORO Démo',
  referenceEmail: 'demo@getcoro.io',
};
const NAMESPACE = 'coro-demo-advisor-history-v1';
const START = '2026-09-08';
const END = '2026-11-30';
const AS_OF = /^\d{4}-\d{2}-\d{2}$/.test(process.env.CORO_DEMO_HISTORY_AS_OF || '') ? process.env.CORO_DEMO_HISTORY_AS_OF : '2026-11-24';
if (AS_OF < '2026-11-01' || AS_OF > '2027-01-31') throw new Error('AS_OF_OUT_OF_RANGE');
// Mois entièrement écoulés avant la date de référence, depuis septembre.
const CLOSED_PERIODS = ['2026-09', '2026-10', '2026-11', '2026-12'].filter((p) => p < AS_OF.slice(0, 7));
const TIME_ZONE = 'America/Toronto';
const COMMANDS = new Set(['dry-run', 'prepare', 'verify', 'reset']);

function loadPrismaClient() {
  for (const candidate of ['/app/node_modules/@prisma/client', '../../coro-backend/node_modules/@prisma/client', '@prisma/client']) {
    try {
      return require(candidate).PrismaClient;
    } catch {
      /* essai suivant */
    }
  }
  throw new Error('PRISMA_CLIENT_UNAVAILABLE');
}

// ── Outils déterministes ────────────────────────────────────────────────
function id(key) {
  const h = crypto.createHash('sha256').update(`${NAMESPACE}:${key}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
function rng(seed) {
  let a = crypto.createHash('sha256').update(seed).digest().readUInt32LE(0);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const day = (iso) => new Date(`${iso}T00:00:00.000Z`);
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const isWeekday = (d) => d.getUTCDay() >= 1 && d.getUTCDay() <= 5;
const quarter = (h) => Math.round(h * 4) / 4;
// Heure locale de Montréal (novembre : UTC-5, septembre-octobre : UTC-4).
const local = (dateIso, hhmm) => {
  const offset = dateIso >= '2026-11-01' ? 5 : 4; // heure normale de l'Est à partir du 1er novembre
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(...dateIso.split('-').map((v, i) => (i === 1 ? Number(v) - 1 : Number(v))), h + offset, m));
};
const HOLIDAYS = new Set(['2026-10-12']); // Action de grâces

// ── Données de référence (toutes fictives) ──────────────────────────────
const ADVISORS = [
  { key: 'camille', firstName: 'Camille', lastName: 'Fortin', cost: 38, senior: true },
  { key: 'olivier', firstName: 'Olivier', lastName: 'Gagnon', cost: 35, senior: true },
  { key: 'lea', firstName: 'Léa', lastName: 'Bouchard', cost: 32, senior: false },
  { key: 'samuel', firstName: 'Samuel', lastName: 'Tremblay', cost: 34, senior: false },
  { key: 'ines', firstName: 'Inès', lastName: 'Lavoie', cost: 30, senior: false },
].map((a) => ({ ...a, id: id(`user-${a.key}`), email: `${a.key}.${a.lastName.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()}@demo-coro.invalid` }));

const CLIENTS = [
  { key: 'laurentide', name: 'Fiducie Laurentide — Démo', sector: 'Immobilier de bureaux', city: 'Montréal' },
  { key: 'rivesud', name: 'Hôtellerie Rive-Sud — Démo', sector: 'Hôtellerie', city: 'Longueuil' },
  { key: 'boreales', name: 'Industries Boréales — Démo', sector: 'Fabrication', city: 'Drummondville' },
  { key: 'agedor', name: 'Résidences Âge d’Or — Démo', sector: 'Résidences pour aînés', city: 'Québec' },
].map((c) => ({ ...c, id: id(`client-${c.key}`) }));

const BUILDINGS = [
  ['laurentide', 'tour-cartier', 'Tour Cartier — Démo', '1250, boulevard Fictif', 'Montréal', 'Bureaux', 45.4995, -73.5713, 24],
  ['laurentide', 'centre-saint-roch', 'Centre Saint-Roch — Démo', '400, rue Imaginaire', 'Québec', 'Bureaux', 46.8139, -71.2229, 9],
  ['laurentide', 'carrefour-laval', 'Carrefour Laval Est — Démo', '3000, avenue Modèle', 'Laval', 'Commercial', 45.5703, -73.7236, 3],
  ['rivesud', 'hotel-fleuve', 'Hôtel du Fleuve — Démo', '75, place Exemple', 'Longueuil', 'Hôtel', 45.5312, -73.5181, 12],
  ['rivesud', 'auberge-chambly', 'Auberge du Bassin — Démo', '18, rue du Modèle', 'Chambly', 'Hôtel', 45.4486, -73.2876, 4],
  ['boreales', 'usine-principale', 'Usine principale — Démo', '900, rue Industrielle Fictive', 'Drummondville', 'Industriel', 45.8838, -72.4843, 2],
  ['boreales', 'entrepot-nord', 'Entrepôt Nord — Démo', '120, chemin du Dépôt', 'Drummondville', 'Entrepôt', 45.9002, -72.5012, 1],
  ['agedor', 'rpa-sillery', 'Résidence Sillery — Démo', '2200, chemin Fictif', 'Québec', 'RPA', 46.7781, -71.2470, 8],
  ['agedor', 'rpa-beauport', 'Résidence Beauport — Démo', '55, avenue Exemple', 'Québec', 'RPA', 46.8590, -71.1906, 6],
  ['agedor', 'rpa-levis', 'Résidence du Vieux-Lévis — Démo', '10, côte du Modèle', 'Lévis', 'RPA', 46.8033, -71.1779, 5],
].map(([clientKey, key, name, address, city, type, lat, lng, floors]) => ({ clientKey, key, name, address, city, type, lat, lng, floors, id: id(`building-${key}`), clientId: id(`client-${clientKey}`) }));

const TASKS = {
  PSI: [
    ['Démarrage', 'Rencontre de démarrage avec le client', 0.08],
    ['Collecte', 'Collecte des plans et des registres du bâtiment', 0.12],
    ['Visite', 'Visite des lieux et relevé des équipements incendie', 0.2],
    ['Rédaction', 'Rédaction du plan de sécurité incendie', 0.35],
    ['Révision', 'Révision interne et correction', 0.1],
    ['Livraison', 'Présentation au client et transmission du plan', 0.15],
  ],
  PMU: [
    ['Démarrage', 'Rencontre de démarrage et définition des risques', 0.06],
    ['Collecte', 'Collecte des documents et des contacts d’urgence', 0.1],
    ['Visite', 'Visite du bâtiment et analyse des risques', 0.16],
    ['Rédaction', 'Rédaction des procédures d’urgence', 0.3],
    ['Rédaction', 'Composition de l’équipe d’urgence et des rôles', 0.08],
    ['Révision', 'Révision interne du plan', 0.1],
    ['Livraison', 'Présentation et approbation du client', 0.08],
    ['Formation', 'Formation de l’équipe d’urgence', 0.12],
  ],
  PCA: [
    ['Démarrage', 'Rencontre de démarrage et périmètre', 0.05],
    ['Analyse', 'Bilan d’impact sur les activités (BIA)', 0.25],
    ['Analyse', 'Analyse des risques et des dépendances', 0.15],
    ['Rédaction', 'Stratégies de continuité et plans de reprise', 0.3],
    ['Révision', 'Révision interne et validation', 0.1],
    ['Exercice', 'Exercice sur table avec la direction', 0.15],
  ],
};

/** 45 mandats (55 % PMU, 35 % PSI, 10 % PCA), démarrés entre le 8 septembre et le 20 novembre. */
function buildMandates() {
  const r = rng('mandates');
  const types = [...Array(25).fill('PMU'), ...Array(16).fill('PSI'), ...Array(4).fill('PCA')];
  for (let i = types.length - 1; i > 0; i -= 1) {
    const j = Math.floor(r() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  const now = day(AS_OF);
  return types.map((type, index) => {
    const building = BUILDINGS[index % BUILDINGS.length];
    const owner = ADVISORS[index % ADVISORS.length];
    const support = ADVISORS[(index + 2) % ADVISORS.length];
    const complex = type === 'PMU' && r() < 0.35;
    const budget = type === 'PSI' ? 20 : type === 'PCA' ? 60 + Math.round(r() * 30) : complex ? 40 + Math.round(r() * 80) : 30;
    const weeks = type === 'PSI' ? 3 + Math.floor(r() * 3) : type === 'PCA' ? 9 + Math.floor(r() * 4) : complex ? 6 + Math.floor(r() * 4) : 4 + Math.floor(r() * 3);
    const start = addDays(day('2026-09-08'), Math.floor((index / types.length) * 70 + r() * 3));
    const plannedEnd = addDays(start, weeks * 7);
    const rate = 120 + Math.round(r() * 10) * 5; // 120 à 170 $/h
    // Consommation d'heures : les mandats terminés oscillent autour du budget, quelques-uns le dépassent.
    const finalRatio = 0.82 + r() * 0.35 + (complex && r() < 0.5 ? 0.15 : 0);
    const elapsed = Math.max(0, Math.min(1, (now - start) / (plannedEnd - start)));
    const finished = now >= plannedEnd;
    const status = finished ? (r() < 0.6 ? 'VALIDATED' : 'EXPORTED') : elapsed > 0.8 ? 'REVIEW' : elapsed > 0.08 ? 'IN_PROGRESS' : 'DRAFT';
    const progress = finished ? 100 : Math.max(5, Math.round(elapsed * 95 / 5) * 5);
    const label = { PMU: 'Plan de mesures d’urgence', PSI: 'Plan de sécurité incendie', PCA: 'Plan de continuité des activités' }[type];
    return {
      key: `mandate-${String(index + 1).padStart(2, '0')}`,
      index, type, complex, budget, weeks, rate, status, progress, finished, elapsed,
      start, plannedEnd, finalRatio,
      soldAmount: Math.round((budget * rate) / 50) * 50,
      typeMandat: type === 'PSI' || r() < 0.75 ? 'FORFAITAIRE' : 'ANNUEL',
      deadlineDays: weeks * 7 + 14,
      building, owner, support,
      projectId: id(`project-${index}`),
      mandateId: id(`mandate-${index}`),
      name: `${type} — ${building.name.replace(' — Démo', '')} 2026${complex ? ' (complexe)' : ''}`,
      description: `${label} — mandat fictif de démonstration${complex ? ', bâtiment complexe' : ''}.`,
    };
  });
}

function workdays() {
  const out = [];
  for (let d = day(START); d <= day(AS_OF); d = addDays(d, 1)) {
    if (isWeekday(d) && !HOLIDAYS.has(iso(d))) out.push(iso(d));
  }
  return out;
}

const ABSENCES = [
  { key: 'camille-vacances', advisor: 'camille', from: '2026-10-19', to: '2026-10-23', type: 'VACATION' },
  { key: 'olivier-formation', advisor: 'olivier', from: '2026-10-06', to: '2026-10-07', type: 'TRAINING' },
  { key: 'lea-conge', advisor: 'lea', from: '2026-11-13', to: '2026-11-13', type: 'PERSONAL' },
  { key: 'samuel-vacances', advisor: 'samuel', from: '2026-12-21', to: '2026-12-31', type: 'VACATION' },
  { key: 'ines-formation', advisor: 'ines', from: '2026-11-26', to: '2026-11-26', type: 'TRAINING' },
];
const absent = (advisorKey, date) => ABSENCES.some((a) => a.advisor === advisorKey && date >= a.from && date <= a.to);

/** Génère tout le lot en mémoire (aucune écriture). */
function build() {
  const mandates = buildMandates();
  const days = workdays();
  const tasks = [];
  const taskEntries = [];
  const activities = [];
  const timelog = [];
  const r = rng('time');

  for (const m of mandates) {
    const def = TASKS[m.type];
    const span = Math.max(1, Math.round((m.plannedEnd - m.start) / 86400000));
    let cursor = 0;
    def.forEach(([category, title, share], t) => {
      const due = addDays(m.start, Math.round(span * (cursor + share)));
      const doneBy = cursor + share;
      const status = m.finished || m.elapsed >= doneBy ? 'terminee' : m.elapsed >= cursor ? 'en_cours' : 'a_faire';
      const assignee = category === 'Formation' || category === 'Visite' ? m.support : m.owner;
      tasks.push({
        key: `${m.key}-task-${t}`, id: id(`${m.key}-task-${t}`), projectId: m.projectId, category, title,
        order: t, status, dueDate: new Date(due.getTime() + 17 * 3600000), assigneeId: assignee.id, assignee,
        share, from: addDays(m.start, Math.round(span * cursor)), to: due,
      });
      cursor += share;
    });
    // Activités du mandat (visite, formation ou exercice).
    const acts = [
      { suffix: 'visite', type: 'inspection', label: 'Visite du bâtiment', duration: '3 h', at: 0.25 },
      ...(m.type === 'PMU' ? [{ suffix: 'formation', type: 'formation_equipe_urgence', label: 'Formation de l’équipe d’urgence', duration: '3 h', at: 0.95 }] : []),
      ...(m.type === 'PMU' && m.complex ? [{ suffix: 'exercice', type: 'exercice_evacuation', label: 'Exercice d’évacuation', duration: '3 h', at: 1.15 }] : []),
      ...(m.type === 'PCA' ? [{ suffix: 'table', type: 'exercice_table', label: 'Exercice sur table', duration: '2 h', at: 0.9 }] : []),
      ...(m.type === 'PSI' ? [{ suffix: 'livraison', type: 'revision', label: 'Présentation du plan au client', duration: '1 h 30', at: 0.95 }] : []),
    ];
    for (const a of acts) {
      const when = addDays(m.start, Math.round(span * a.at));
      const whenIso = iso(isWeekday(when) ? when : addDays(when, when.getUTCDay() === 6 ? 2 : 1));
      const past = whenIso < AS_OF;
      activities.push({
        key: `${m.key}-${a.suffix}`, id: id(`${m.key}-${a.suffix}`), projectId: m.projectId, type: a.type, label: a.label,
        duration: a.duration, scheduledDate: local(whenIso, a.type === 'inspection' ? '09:30' : '13:30'),
        status: past ? 'fait' : 'a_faire', assigneeEmail: (a.type === 'inspection' ? m.support : m.owner).email,
        mode: a.type === 'revision' ? 'teams' : 'presentiel', dureeHeures: Number.parseFloat(a.duration.replace(' 30', '.5')),
      });
    }
  }

  const load = {}; // advisor|date -> heures saisies
  // Temps non facturable : 3 à 4 h par semaine, 6 h au plus.
  for (const a of ADVISORS) {
    for (const d of days) {
      if (absent(a.key, d)) continue;
      const dow = day(d).getUTCDay();
      const entries = [];
      if (dow === 1) entries.push(['rencontre_hebdo_smu', 1, 'Rencontre d’équipe du lundi']);
      if (dow === 2 || dow === 4) entries.push(['lecture_email', 0.5, null]);
      if (dow === 3 && r() < 0.5) entries.push(['echange_collegue', 0.5, null]);
      if (dow === 5) entries.push(['deplacement_autre', r() < 0.4 ? 0.75 : 0, null]);
      if (d.endsWith('-30') || d.endsWith('-31') || d === '2026-10-29' || d === '2026-11-26') entries.push(['feuille_depenses', 0.5, 'Feuille de dépenses mensuelle']);
      if (['2026-09-24', '2026-10-22', '2026-11-19'].includes(d)) entries.push(['clinique_dev', 1.5, 'Clinique mensuelle de développement']);
      if (dow === 3 && a.senior && r() < 0.3) entries.push(['appel_prospect', 0.5, null]);
      for (const [category, heures, note] of entries) {
        if (heures <= 0) continue;
        load[`${a.key}|${d}`] = (load[`${a.key}|${d}`] || 0) + heures;
        timelog.push({ id: id(`timelog-${a.key}-${d}-${category}`), userId: a.id, date: day(d), heures, category, note, isBillable: false });
      }
    }
  }
  // Heures sur les tâches : chaque tâche reçoit sa part du budget (consommation finale du mandat),
  // répartie sur les jours ouvrables de sa fenêtre, jusqu'à aujourd'hui.
  for (const task of tasks) {
    const m = mandates.find((x) => x.projectId === task.projectId);
    const total = m.budget * m.finalRatio * task.share;
    const window = days.filter((d) => d >= iso(task.from) && d <= iso(task.to) && !absent(task.assignee.key, d));
    if (!window.length) continue;
    const doneRatio = task.status === 'terminee' ? 1 : task.status === 'en_cours' ? Math.max(0.2, Math.min(0.9, (day(AS_OF) - task.from) / Math.max(1, task.to - task.from))) : 0;
    let remaining = quarter(total * doneRatio);
    const usable = window.filter((d) => d <= AS_OF);
    let i = 0;
    while (remaining > 0 && usable.length) {
      const d = usable[i % usable.length];
      const k = `${task.assignee.key}|${d}`;
      const free = 8 - (load[k] || 0);
      const chunk = Math.min(remaining, free, quarter(1 + r() * 2.5));
      if (chunk >= 0.25) {
        load[k] = (load[k] || 0) + chunk;
        taskEntries.push({ taskId: task.id, userId: task.assignee.id, date: day(d), heures: quarter(chunk), note: null });
        remaining = quarter(remaining - chunk);
      }
      i += 1;
      if (i > usable.length * 6) break;
    }
  }
  // Regroupe les saisies d'une même tâche et d'un même jour.
  const merged = new Map();
  for (const e of taskEntries) {
    const k = `${e.taskId}|${e.userId}|${iso(e.date)}`;
    const prev = merged.get(k);
    if (prev) prev.heures = quarter(prev.heures + e.heures);
    else merged.set(k, { ...e });
  }
  const taskTime = [...merged.values()].map((e, n) => ({ ...e, id: id(`task-time-${e.taskId}-${iso(e.date)}`), n }));

  return { mandates, tasks, taskTime, activities, timelog };
}

// ── Accès base ──────────────────────────────────────────────────────────
async function assertTarget(tx) {
  const identity = await tx.user.findUnique({
    where: { email: TARGET.referenceEmail },
    select: { id: true, organizationId: true, role: true, isActive: true, organization: { select: { name: true, isActive: true, isInternal: true } } },
  });
  if (!identity || identity.organizationId !== TARGET.organizationId || identity.organization.name !== TARGET.organizationName ||
    identity.role !== 'ADMIN' || !identity.isActive || !identity.organization.isActive || identity.organization.isInternal) {
    throw new Error('TARGET_NOT_VERIFIED_NO_WRITES');
  }
  const env = await tx.demoEnvironment.findUnique({ where: { organizationId: TARGET.organizationId }, select: { status: true } });
  if (!env) throw new Error('DEMO_ENVIRONMENT_MISSING');
  return identity;
}

async function register(tx, key, entityType, entityId) {
  const where = { organizationId_fixtureNamespace_fixtureKey: { organizationId: TARGET.organizationId, fixtureNamespace: NAMESPACE, fixtureKey: key } };
  const existing = await tx.demoFixtureRecord.findUnique({ where });
  if (existing && (existing.entityType !== entityType || existing.entityId !== entityId)) throw new Error('FIXTURE_REGISTRY_COLLISION');
  await tx.demoFixtureRecord.upsert({
    where,
    create: { organizationId: TARGET.organizationId, fixtureNamespace: NAMESPACE, fixtureKey: key, entityType, entityId, baseline: { lot: 1 } },
    update: { state: 'ACTIVE' },
  });
}

async function counts(tx) {
  const where = { organizationId: TARGET.organizationId };
  const advisorIds = ADVISORS.map((a) => a.id);
  const projectIds = buildMandates().map((m) => m.projectId);
  const [users, projects, mandates, tasks, taskTime, timelog, activities, closures, records] = await Promise.all([
    tx.user.count({ where: { ...where, id: { in: advisorIds }, isActive: true } }),
    tx.project.count({ where: { ...where, id: { in: projectIds } } }),
    tx.projectMandate.count({ where: { ...where, projectId: { in: projectIds } } }),
    tx.projectTask.count({ where: { ...where, projectId: { in: projectIds } } }),
    tx.taskTimeEntry.aggregate({ where: { ...where, userId: { in: advisorIds } }, _count: true, _sum: { heures: true } }),
    tx.timelogEntry.aggregate({ where: { ...where, userId: { in: advisorIds } }, _count: true, _sum: { heures: true } }),
    tx.projectActivity.count({ where: { ...where, projectId: { in: projectIds } } }),
    tx.timePeriodClosure.findMany({ where: { ...where, period: { in: CLOSED_PERIODS }, reopenedAt: null }, select: { period: true } }),
    tx.demoFixtureRecord.count({ where: { ...where, fixtureNamespace: NAMESPACE, state: 'ACTIVE' } }),
  ]);
  return {
    advisors: users, projects, mandates, tasks,
    taskTimeEntries: taskTime._count, taskHours: Math.round((taskTime._sum.heures || 0) * 100) / 100,
    timelogEntries: timelog._count, timelogHours: Math.round((timelog._sum.heures || 0) * 100) / 100,
    activities, closedPeriods: closures.map((c) => c.period).sort(), registeredRecords: records,
  };
}

function summary(command, data, extra = {}) {
  return { schemaVersion: 1, command, namespace: NAMESPACE, ...data, ...extra };
}

async function dryRun(prisma) {
  const plan = build();
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    await assertTarget(tx);
    return summary('dry-run', {
      planned: {
        advisors: ADVISORS.length, clients: CLIENTS.length, buildings: BUILDINGS.length, mandates: plan.mandates.length,
        byType: plan.mandates.reduce((acc, m) => ({ ...acc, [m.type]: (acc[m.type] || 0) + 1 }), {}),
        byStatus: plan.mandates.reduce((acc, m) => ({ ...acc, [m.status]: (acc[m.status] || 0) + 1 }), {}),
        tasks: plan.tasks.length, taskTimeEntries: plan.taskTime.length,
        taskHours: Math.round(plan.taskTime.reduce((s, e) => s + e.heures, 0)),
        timelogEntries: plan.timelog.length, timelogHours: Math.round(plan.timelog.reduce((s, e) => s + e.heures, 0)),
        activities: plan.activities.length, closedPeriods: CLOSED_PERIODS,
      },
      current: await counts(tx),
    }, { mutation: false });
  });
}

async function prepare(prisma) {
  const plan = build();
  const admin = await prisma.$transaction(async (tx) => assertTarget(tx));
  const org = TARGET.organizationId;
  const password = `disabled-${crypto.randomUUID()}`; // compte fictif : connexion impossible

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`demo-history:${org}`}, 0))`;
    await assertTarget(tx);
    for (const a of ADVISORS) {
      const row = await tx.user.upsert({
        where: { email: a.email },
        create: { id: a.id, email: a.email, password, firstName: a.firstName, lastName: a.lastName, role: 'OPERATOR', organizationId: org, isActive: true, horaireBase: 40, timeZone: TIME_ZONE, timeZoneVerified: true },
        update: { isActive: true },
      });
      if (row.id !== a.id || row.organizationId !== org) throw new Error('FIXTURE_COLLISION_USER');
      await register(tx, `user-${a.key}`, 'User', a.id);
      const scheduleId = id(`schedule-${a.key}`);
      await tx.userWorkSchedule.upsert({
        where: { id: scheduleId },
        create: { id: scheduleId, organizationId: org, userId: a.id, timeZone: TIME_ZONE, effectiveFrom: day('2026-09-01'), verifiedAt: day('2026-09-01'), verifiedByUserId: admin.id },
        update: {},
      });
      for (let dow = 1; dow <= 5; dow += 1) {
        for (const [s, e, k] of [[510, 720, 'am'], [750, 1020, 'pm']]) {
          await tx.userWorkScheduleInterval.upsert({ where: { id: id(`interval-${a.key}-${dow}-${k}`) }, create: { id: id(`interval-${a.key}-${dow}-${k}`), scheduleId, dayOfWeek: dow, startTime: s, endTime: e }, update: {} });
        }
      }
      await tx.advisorInternalCostRate.upsert({
        where: { id: id(`rate-${a.key}`) },
        create: { id: id(`rate-${a.key}`), organizationId: org, userId: a.id, currency: 'CAD', hourlyCost: a.cost, effectiveFrom: day('2026-01-01'), status: 'APPROVED', proposedByUserId: admin.id, proposedAt: day('2026-08-25'), approvedByUserId: admin.id, approvedAt: day('2026-08-26') },
        update: {},
      });
    }
    for (const ab of ABSENCES) {
      const advisor = ADVISORS.find((a) => a.key === ab.advisor);
      await tx.userUnavailability.upsert({
        where: { id: id(`absence-${ab.key}`) },
        create: { id: id(`absence-${ab.key}`), organizationId: org, userId: advisor.id, startAt: local(ab.from, '00:00'), endAt: local(iso(addDays(day(ab.to), 1)), '00:00'), allDay: true, localStartDate: day(ab.from), localEndDate: day(ab.to), timeZone: TIME_ZONE, type: ab.type, createdByUserId: admin.id },
        update: {},
      });
    }
    for (const c of CLIENTS) {
      const row = await tx.client.upsert({ where: { id: c.id }, create: { id: c.id, organizationId: org, name: c.name, sector: c.sector, city: c.city, province: 'QC', contactEmail: `${c.key}@example.invalid`, regulatoryRequirements: [] }, update: {} });
      if (row.organizationId !== org) throw new Error('FIXTURE_COLLISION_CLIENT');
      await register(tx, `client-${c.key}`, 'Client', c.id);
    }
    for (const b of BUILDINGS) {
      const row = await tx.building.upsert({
        where: { id: b.id },
        create: { id: b.id, organizationId: org, clientId: b.clientId, name: b.name, address: b.address, city: b.city, province: 'QC', postalCode: 'H0H 0H0', buildingType: b.type, latitude: b.lat, longitude: b.lng, floors: b.floors, timeZone: TIME_ZONE, timeZoneVerified: true },
        update: {},
      });
      if (row.organizationId !== org) throw new Error('FIXTURE_COLLISION_BUILDING');
      await register(tx, `building-${b.key}`, 'Building', b.id);
    }
    for (const m of plan.mandates) {
      const row = await tx.project.upsert({
        where: { id: m.projectId },
        create: { id: m.projectId, organizationId: org, clientId: m.building.clientId, buildingId: m.building.id, userId: m.owner.id, name: m.name, documentType: m.type, status: m.status, year: 2026, progress: m.progress, configData: { demo: true, fixtureNamespace: NAMESPACE }, createdAt: m.start },
        update: {},
      });
      if (row.organizationId !== org) throw new Error('FIXTURE_COLLISION_PROJECT');
      await register(tx, `project-${m.index}`, 'Project', m.projectId);
      await tx.projectMandate.upsert({
        where: { projectId: m.projectId },
        create: {
          id: m.mandateId, projectId: m.projectId, organizationId: org, ownerId: m.owner.id, description: m.description,
          montantVendu: m.soldAmount, soldAmountDecimal: m.soldAmount, soldCurrency: 'CAD', soldAt: addDays(m.start, -10),
          soldValidatedByUserId: admin.id, soldValidatedAt: addDays(m.start, -8), soldValidationReason: 'Montant fictif de démonstration',
          tauxHoraire: m.rate, heuresBudgetees: m.budget, typeMandat: m.typeMandat,
          dateDebutDelai: m.typeMandat === 'FORFAITAIRE' ? m.start : null,
          delaiJours: m.typeMandat === 'FORFAITAIRE' ? m.deadlineDays : null,
          dateLimite: m.typeMandat === 'FORFAITAIRE' ? addDays(m.start, m.deadlineDays) : null,
          typeDelai: m.typeMandat === 'FORFAITAIRE' ? 'STANDARD' : null,
          alerteActive: !m.finished,
          createdAt: addDays(m.start, -10),
        },
        update: {},
      });
    }
  }, { timeout: 120000 });

  // Activités, tâches et heures : en lots, sans doublon (identifiants déterministes).
  await prisma.$transaction(async (tx) => {
    await assertTarget(tx);
    await tx.projectActivity.createMany({
      data: plan.activities.map((a) => ({ id: a.id, projectId: a.projectId, organizationId: org, type: a.type, label: a.label, duration: a.duration, dureeHeures: a.dureeHeures, scheduledDate: a.scheduledDate, status: a.status, assigneeEmail: a.assigneeEmail, mode: a.mode, clientVisible: true, clientBookable: false })),
      skipDuplicates: true,
    });
    await tx.projectTask.createMany({
      data: plan.tasks.map((t) => ({ id: t.id, projectId: t.projectId, organizationId: org, categoryName: t.category, taskTitle: t.title, status: t.status, dueDate: t.dueDate, order: t.order, assigneeId: t.assigneeId })),
      skipDuplicates: true,
    });
    await tx.projectTaskAssignee.createMany({
      data: plan.tasks.map((t) => ({ id: id(`assignee-${t.key}`), taskId: t.id, userId: t.assigneeId })),
      skipDuplicates: true,
    });
    for (let i = 0; i < plan.taskTime.length; i += 500) {
      await tx.taskTimeEntry.createMany({ data: plan.taskTime.slice(i, i + 500).map(({ n, ...e }) => ({ ...e, organizationId: org })), skipDuplicates: true });
    }
    for (let i = 0; i < plan.timelog.length; i += 500) {
      await tx.timelogEntry.createMany({ data: plan.timelog.slice(i, i + 500).map((e) => ({ ...e, organizationId: org })), skipDuplicates: true });
    }
    for (const period of CLOSED_PERIODS) {
      const existing = await tx.timePeriodClosure.findUnique({ where: { organizationId_period: { organizationId: org, period } } });
      if (!existing) {
        const row = await tx.timePeriodClosure.create({ data: { organizationId: org, period, closedByUserId: admin.id, closedAt: local({ '2026-09': '2026-10-02', '2026-10': '2026-11-03', '2026-11': '2026-12-02', '2026-12': '2027-01-05' }[period], '16:00') } });
        await register(tx, `closure-${period}`, 'TimePeriodClosure', row.id);
      }
    }
  }, { timeout: 180000 });

  return summary('prepare', { current: await prisma.$transaction((tx) => counts(tx)) }, { mutation: true });
}

async function verify(prisma) {
  const plan = build();
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    await assertTarget(tx);
    const current = await counts(tx);
    const ok = current.advisors === ADVISORS.length && current.projects === plan.mandates.length && current.mandates === plan.mandates.length &&
      current.tasks === plan.tasks.length && current.taskTimeEntries === plan.taskTime.length && current.timelogEntries === plan.timelog.length &&
      current.activities === plan.activities.length && CLOSED_PERIODS.every((p) => current.closedPeriods.includes(p));
    return summary('verify', { current }, { mutation: false, verified: ok });
  });
}

async function reset(prisma) {
  const org = TARGET.organizationId;
  const plan = build();
  const advisorIds = ADVISORS.map((a) => a.id);
  const projectIds = plan.mandates.map((m) => m.projectId);
  await prisma.$transaction(async (tx) => {
    await assertTarget(tx);
    const closureIds = (await tx.demoFixtureRecord.findMany({ where: { organizationId: org, fixtureNamespace: NAMESPACE, entityType: 'TimePeriodClosure' }, select: { entityId: true } })).map((r) => r.entityId);
    await tx.timePeriodClosure.deleteMany({ where: { organizationId: org, id: { in: closureIds } } });
    await tx.taskTimeEntry.deleteMany({ where: { organizationId: org, userId: { in: advisorIds } } });
    await tx.timelogEntry.deleteMany({ where: { organizationId: org, userId: { in: advisorIds } } });
    await tx.projectTaskAssignee.deleteMany({ where: { task: { projectId: { in: projectIds } } } });
    await tx.projectTask.deleteMany({ where: { organizationId: org, projectId: { in: projectIds } } });
    await tx.projectActivity.deleteMany({ where: { organizationId: org, projectId: { in: projectIds } } });
    await tx.projectMandate.deleteMany({ where: { organizationId: org, projectId: { in: projectIds } } });
    await tx.project.deleteMany({ where: { organizationId: org, id: { in: projectIds } } });
    await tx.building.deleteMany({ where: { organizationId: org, id: { in: BUILDINGS.map((b) => b.id) }, projects: { none: {} } } });
    await tx.client.deleteMany({ where: { organizationId: org, id: { in: CLIENTS.map((c) => c.id) }, buildings: { none: {} }, projects: { none: {} } } });
    await tx.userUnavailability.deleteMany({ where: { organizationId: org, userId: { in: advisorIds } } });
    await tx.userWorkScheduleInterval.deleteMany({ where: { schedule: { userId: { in: advisorIds } } } });
    await tx.userWorkSchedule.deleteMany({ where: { organizationId: org, userId: { in: advisorIds } } });
    await tx.advisorInternalCostRate.deleteMany({ where: { organizationId: org, userId: { in: advisorIds } } });
    await tx.user.updateMany({ where: { organizationId: org, id: { in: advisorIds } }, data: { isActive: false } });
    await tx.demoFixtureRecord.updateMany({ where: { organizationId: org, fixtureNamespace: NAMESPACE, state: 'ACTIVE' }, data: { state: 'RETIRED' } });
  }, { timeout: 180000 });
  return summary('reset', { current: await prisma.$transaction((tx) => counts(tx)) }, { mutation: true });
}

async function run(prisma, command) {
  if (!COMMANDS.has(command)) throw new Error('UNKNOWN_COMMAND');
  return ({ 'dry-run': dryRun, prepare, verify, reset })[command](prisma);
}

async function main() {
  if (process.env.CORO_DEMO_HISTORY_RUN !== 'true') throw new Error('EXPLICIT_RUNTIME_SWITCH_REQUIRED');
  const PrismaClient = loadPrismaClient();
  const prisma = new PrismaClient();
  try {
    process.stdout.write(`${JSON.stringify(await run(prisma, process.argv[2] || 'dry-run'))}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { AS_OF, ADVISORS, BUILDINGS, CLIENTS, CLOSED_PERIODS, build, buildMandates, id, run };

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(`${JSON.stringify({ schemaVersion: 1, command: process.argv[2] || 'dry-run', execution: 'FAILED', reason: String(error.message).replace(/[^\w :.,-]/g, '').slice(0, 160) })}\n`);
    process.exitCode = 1;
  });
}
