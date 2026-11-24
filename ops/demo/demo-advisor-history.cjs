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
  { key: 'cegep', name: 'Collège des Deux-Rives — Démo', sector: 'Enseignement', city: 'Sherbrooke' },
  { key: 'logistik', name: 'Logistique Nordet — Démo', sector: 'Entreposage', city: 'Mirabel' },
  { key: 'municipal', name: 'Ville de Val-Fictif — Démo', sector: 'Municipal', city: 'Val-Fictif' },
  { key: 'clinique', name: 'Cliniques Santé Plus — Démo', sector: 'Santé', city: 'Gatineau' },
].map((c) => ({ ...c, id: id(`client-${c.key}`) }));

const BUILDINGS = [
  ['laurentide', 'tour-cartier', 'Tour Cartier — Démo', 'Montréal', 'Bureaux', 45.4995, -73.5713, 24],
  ['laurentide', 'centre-saint-roch', 'Centre Saint-Roch — Démo', 'Québec', 'Bureaux', 46.8139, -71.2229, 9],
  ['laurentide', 'carrefour-laval', 'Carrefour Laval Est — Démo', 'Laval', 'Commercial', 45.5703, -73.7236, 3],
  ['laurentide', 'place-mercier', 'Place Mercier — Démo', 'Montréal', 'Bureaux', 45.5017, -73.5540, 18],
  ['laurentide', 'edifice-jacques', 'Édifice Jacques-Fictif — Démo', 'Montréal', 'Bureaux', 45.5080, -73.5680, 12],
  ['rivesud', 'hotel-fleuve', 'Hôtel du Fleuve — Démo', 'Longueuil', 'Hôtel', 45.5312, -73.5181, 12],
  ['rivesud', 'auberge-chambly', 'Auberge du Bassin — Démo', 'Chambly', 'Hôtel', 45.4486, -73.2876, 4],
  ['rivesud', 'hotel-boucherville', 'Hôtel des Îles — Démo', 'Boucherville', 'Hôtel', 45.5913, -73.4364, 6],
  ['boreales', 'usine-principale', 'Usine principale — Démo', 'Drummondville', 'Industriel', 45.8838, -72.4843, 2],
  ['boreales', 'entrepot-nord', 'Entrepôt Nord — Démo', 'Drummondville', 'Entrepôt', 45.9002, -72.5012, 1],
  ['boreales', 'usine-victoriaville', 'Usine de Victoriaville — Démo', 'Victoriaville', 'Industriel', 46.0571, -71.9598, 2],
  ['agedor', 'rpa-sillery', 'Résidence Sillery — Démo', 'Québec', 'RPA', 46.7781, -71.2470, 8],
  ['agedor', 'rpa-beauport', 'Résidence Beauport — Démo', 'Québec', 'RPA', 46.8590, -71.1906, 6],
  ['agedor', 'rpa-levis', 'Résidence du Vieux-Lévis — Démo', 'Lévis', 'RPA', 46.8033, -71.1779, 5],
  ['agedor', 'rpa-charlesbourg', 'Résidence Charlesbourg — Démo', 'Québec', 'RPA', 46.8600, -71.2700, 7],
  ['agedor', 'rpa-trois-rivieres', 'Résidence des Forges — Démo', 'Trois-Rivières', 'RPA', 46.3432, -72.5477, 6],
  ['cegep', 'pavillon-a', 'Pavillon principal — Démo', 'Sherbrooke', 'Enseignement', 45.4042, -71.8929, 5],
  ['cegep', 'pavillon-sport', 'Centre sportif — Démo', 'Sherbrooke', 'Sportif', 45.4060, -71.8950, 2],
  ['cegep', 'residence-etudiante', 'Résidence étudiante — Démo', 'Sherbrooke', 'Résidentiel', 45.4020, -71.8900, 6],
  ['logistik', 'centre-mirabel', 'Centre de distribution Mirabel — Démo', 'Mirabel', 'Entrepôt', 45.6500, -74.0800, 1],
  ['logistik', 'centre-boisbriand', 'Plateforme Boisbriand — Démo', 'Boisbriand', 'Entrepôt', 45.6200, -73.8400, 1],
  ['logistik', 'centre-levis', 'Entrepôt Lévis — Démo', 'Lévis', 'Entrepôt', 46.7600, -71.1900, 1],
  ['municipal', 'hotel-de-ville', 'Hôtel de ville — Démo', 'Val-Fictif', 'Municipal', 46.1000, -71.3000, 3],
  ['municipal', 'aréna', 'Aréna municipal — Démo', 'Val-Fictif', 'Sportif', 46.1020, -71.3050, 2],
  ['municipal', 'bibliotheque', 'Bibliothèque centrale — Démo', 'Val-Fictif', 'Culturel', 46.0990, -71.2980, 2],
  ['municipal', 'garage', 'Garage municipal — Démo', 'Val-Fictif', 'Industriel', 46.0950, -71.3100, 1],
  ['clinique', 'clinique-hull', 'Clinique Hull — Démo', 'Gatineau', 'Santé', 45.4280, -75.7130, 4],
  ['clinique', 'clinique-aylmer', 'Clinique Aylmer — Démo', 'Gatineau', 'Santé', 45.3950, -75.8450, 2],
  ['clinique', 'clinique-buckingham', 'Clinique Buckingham — Démo', 'Gatineau', 'Santé', 45.5880, -75.4150, 2],
  ['clinique', 'centre-imagerie', 'Centre d’imagerie — Démo', 'Gatineau', 'Santé', 45.4400, -75.7400, 3],
  ['laurentide', 'tour-sherbrooke', 'Tour Wellington — Démo', 'Sherbrooke', 'Bureaux', 45.4000, -71.8900, 10],
  ['rivesud', 'hotel-saint-jean', 'Hôtel du Richelieu — Démo', 'Saint-Jean-sur-Richelieu', 'Hôtel', 45.3070, -73.2620, 5],
  ['cegep', 'pavillon-sciences', 'Pavillon des sciences — Démo', 'Sherbrooke', 'Enseignement', 45.4070, -71.8970, 4],
  ['municipal', 'caserne', 'Caserne de pompiers — Démo', 'Val-Fictif', 'Municipal', 46.1040, -71.2950, 2],
  ['clinique', 'clinique-gatineau', 'Clinique du Plateau — Démo', 'Gatineau', 'Santé', 45.4500, -75.7700, 3],
].map(([clientKey, key, name, city, type, lat, lng, floors], n) => ({
  clientKey, key, name, city, type, lat, lng, floors,
  address: `${100 + n * 25}, rue Fictive`,
  id: id(`building-${key}`), clientId: id(`client-${clientKey}`),
}));

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

/**
 * 45 mandats démarrés du 8 septembre au 20 novembre et 12 mandats signés qui démarrent
 * entre fin novembre et la mi-janvier (55 % PMU, 35 % PSI, 10 % PCA).
 */
function buildMandates() {
  const r = rng('mandates');
  const types = [...Array(32).fill('PMU'), ...Array(19).fill('PSI'), ...Array(6).fill('PCA')];
  for (let i = types.length - 1; i > 0; i -= 1) {
    const j = Math.floor(r() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  const now = day(AS_OF);
  const usedPairs = new Set();
  return types.map((type, index) => {
    let slot = (index * 7) % BUILDINGS.length;
    for (let guard = 0; usedPairs.has(`${slot}|${type}`) && guard < BUILDINGS.length; guard += 1) slot = (slot + 1) % BUILDINGS.length;
    usedPairs.add(`${slot}|${type}`);
    const building = BUILDINGS[slot];
    const owner = ADVISORS[index % ADVISORS.length];
    const support = ADVISORS[(index + 2) % ADVISORS.length];
    const complex = type === 'PMU' && r() < 0.35;
    const budget = type === 'PSI' ? 20 : type === 'PCA' ? 60 + Math.round(r() * 30) : complex ? 40 + Math.round(r() * 80) : 30;
    const weeks = type === 'PSI' ? 3 + Math.floor(r() * 3) : type === 'PCA' ? 9 + Math.floor(r() * 4) : complex ? 6 + Math.floor(r() * 4) : 4 + Math.floor(r() * 3);
    const start = index < 45
      ? addDays(day('2026-09-08'), Math.floor((index / 45) * 70 + r() * 3))
      : addDays(day('2026-11-25'), Math.floor(((index - 45) / 12) * 50 + r() * 3));
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
      name: `${type} — ${building.name.replace(' — Démo', '')} ${start >= day('2027-01-01') ? 2027 : 2026}${complex ? ' (complexe)' : ''}`,
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
      const linked = { visite: 'Visite', formation: 'Formation', table: 'Exercice', livraison: 'Livraison' }[a.suffix];
      if (linked) {
        const task = tasks.find((t) => t.projectId === m.projectId && t.category === linked);
        if (task) task.activityId = id(`${m.key}-${a.suffix}`);
      }
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
  // Une entrée retirée par « reset » peut être réutilisée pour une nouvelle entité.
  if (existing && existing.state === 'ACTIVE' && (existing.entityType !== entityType || existing.entityId !== entityId)) throw new Error('FIXTURE_REGISTRY_COLLISION');
  await tx.demoFixtureRecord.upsert({
    where,
    create: { organizationId: TARGET.organizationId, fixtureNamespace: NAMESPACE, fixtureKey: key, entityType, entityId, baseline: { lot: 1 } },
    update: { state: 'ACTIVE', entityType, entityId },
  });
}


// ── Lot 2 : interactions clients et circuit d'approbation ───────────────
const OBSERVATIONS = [
  ['Module 2', 'Préciser le point de rassemblement secondaire en cas de vent dominant.'],
  ['Module 3', 'Ajouter le numéro du centre antipoison dans les contacts d’urgence.'],
  ['Module 4', 'La procédure d’évacuation des personnes à mobilité réduite doit nommer un responsable par étage.'],
  ['Module 5', 'Mettre à jour la liste des membres de l’équipe d’urgence après les départs de l’été.'],
  ['Annexes', 'Joindre le plan d’étage révisé du rez-de-chaussée.'],
];
const COMMENTS_INTERNAL = [
  'Visite faite, relevé des équipements complété. Il manque le registre d’inspection des extincteurs.',
  'Client relancé pour la liste à jour des responsables d’étage.',
  'Brouillon des procédures prêt pour la révision interne.',
  'Rencontre de présentation fixée avec la direction du bâtiment.',
];
const COMMENTS_CLIENT = [
  'Merci, nous transmettons le registre d’inspection d’ici vendredi.',
  'La direction a validé les dates proposées pour la formation.',
  'Pouvez-vous ajouter notre nouveau gestionnaire d’immeuble comme contact ?',
];

function buildLot2(plan) {
  const r = rng('lot2');
  const clientUsers = CLIENTS.map((c) => ({
    id: id(`client-user-${c.key}`), clientId: c.id,
    email: `contact.${c.key}@example.invalid`, firstName: 'Responsable', lastName: c.name.replace(' — Démo', ''),
  }));
  const observations = [];
  const comments = [];
  const audit = [];
  for (const m of plan.mandates) {
    const cu = clientUsers.find((u) => u.clientId === m.building.clientId);
    const labels = { DRAFT: 'Brouillon', IN_PROGRESS: 'En cours', REVIEW: 'En révision', VALIDATED: 'Validé', EXPORTED: 'Exporté' };
    const steps = ['DRAFT', 'IN_PROGRESS', 'REVIEW', 'VALIDATED', 'EXPORTED'];
    const reached = steps.slice(0, steps.indexOf(m.status) + 1);
    const span = Math.max(1, (m.plannedEnd - m.start) / 86400000);
    const at = (ratio) => new Date(Math.min(m.start.getTime() + span * ratio * 86400000, day(AS_OF).getTime() + 16 * 3600000));
    const when = { IN_PROGRESS: 0.05, REVIEW: 0.8, VALIDATED: 0.92, EXPORTED: 0.97 };
    for (let i = 1; i < reached.length; i += 1) {
      const to = reached[i];
      audit.push({
        id: id(`audit-${m.key}-${to}`), action: to === 'EXPORTED' ? 'EXPORT' : 'STATUS_CHANGE', entityType: 'Project', entityId: m.projectId,
        projectId: m.projectId, userId: to === 'VALIDATED' ? null : m.owner.id, adminApproval: to === 'VALIDATED',
        description: to === 'EXPORTED' ? 'Export du document (FR et EN)' : `Statut : ${labels[reached[i - 1]]} → ${labels[to]}`,
        createdAt: local(iso(at(when[to])), '15:20'),
      });
    }
    if (['REVIEW', 'VALIDATED', 'EXPORTED'].includes(m.status)) {
      const n = 2 + Math.floor(r() * 2);
      for (let k = 0; k < n; k += 1) {
        const [module, texte] = OBSERVATIONS[(m.index + k) % OBSERVATIONS.length];
        observations.push({
          id: id(`obs-${m.key}-${k}`), projectId: m.projectId, module, texte,
          statut: m.status === 'REVIEW' && k === 0 ? 'OUVERTE' : 'TRAITEE',
          ownerId: m.owner.id, createdAt: at(0.82),
        });
      }
    }
    if (m.status !== 'DRAFT') {
      comments.push({ id: id(`comment-${m.key}-0`), projectId: m.projectId, actorType: 'INTERNAL_USER', userId: m.owner.id, clientUserId: null, contenu: COMMENTS_INTERNAL[m.index % COMMENTS_INTERNAL.length], createdAt: at(0.3) });
      if (cu && r() < 0.6) comments.push({ id: id(`comment-${m.key}-1`), projectId: m.projectId, actorType: 'CLIENT_USER', userId: null, clientUserId: cu.id, contenu: COMMENTS_CLIENT[m.index % COMMENTS_CLIENT.length], createdAt: at(0.35) });
    }
  }
  // Demandes de réservation des clients, à confirmer en direct pendant la présentation.
  const future = plan.activities.filter((a) => a.status === 'a_faire' && ['formation_equipe_urgence', 'exercice_evacuation', 'exercice_table'].includes(a.type));
  const bookings = future.slice(0, 4).map((a, k) => {
    const m = plan.mandates.find((x) => x.projectId === a.projectId);
    const cu = clientUsers.find((u) => u.clientId === m.building.clientId);
    return {
      key: `booking-${k}`, id: id(`booking-${k}`), activityId: a.id, projectId: m.projectId, buildingId: m.building.id,
      clientUserId: cu.id, advisorId: m.owner.id, activityType: a.type.startsWith('formation') ? 'formation' : 'exercice', requestedDate: a.scheduledDate, duration: 180,
      participants: 8 + k * 4, comment: ['Nous aimerions inclure les nouveaux employés.', 'Prévoir une salle pour 15 personnes.', 'Merci de confirmer la date avec notre direction.', 'Possible de tenir l’exercice en fin d’après-midi ?'][k],
    };
  });
  return { clientUsers, observations, comments, audit, bookings };
}

async function prepareLot2(prisma, plan, admin) {
  const org = TARGET.organizationId;
  const lot = buildLot2(plan);
  const { createCommitmentVersion } = require('/app/dist/src/bookings/booking-commitment.js');
  await prisma.$transaction(async (tx) => {
    await assertTarget(tx);
    for (const u of lot.clientUsers) {
      const row = await tx.clientUser.upsert({
        where: { email: u.email },
        create: { id: u.id, email: u.email, password: `disabled-${crypto.randomUUID()}`, firstName: u.firstName, lastName: u.lastName, clientId: u.clientId, organizationId: org, isActive: true },
        update: {},
      });
      if (row.id !== u.id || row.organizationId !== org) throw new Error('FIXTURE_COLLISION_CLIENT_USER');
      await register(tx, `client-user-${u.clientId}`, 'ClientUser', u.id);
    }
    await tx.reviewObservation.createMany({
      data: lot.observations.map((o) => ({ id: o.id, projectId: o.projectId, organizationId: org, module: o.module, texte: o.texte, statut: o.statut, createdById: admin.id, treatedById: o.statut === 'TRAITEE' ? o.ownerId : null, createdAt: o.createdAt })),
      skipDuplicates: true,
    });
    await tx.projectComment.createMany({
      data: lot.comments.map((c) => ({ ...c, organizationId: org })),
      skipDuplicates: true,
    });
    await tx.auditLog.createMany({
      data: lot.audit.map(({ adminApproval, ...a }) => ({ ...a, userId: adminApproval ? admin.id : a.userId, organizationId: org })),
      skipDuplicates: true,
    });
    // Admissibilité des conseillers et activités réservables par le client.
    for (const m of plan.mandates) {
      for (const advisor of [m.owner, m.support]) {
        await tx.projectAdvisorEligibility.upsert({
          where: { id: id(`eligibility-${m.key}-${advisor.key}`) },
          create: { id: id(`eligibility-${m.key}-${advisor.key}`), organizationId: org, projectId: m.projectId, advisorUserId: advisor.id, priority: advisor.id === m.owner.id ? 10 : 50, authorizedByUserId: admin.id },
          update: {},
        });
      }
    }
    await tx.projectActivity.updateMany({
      where: { organizationId: org, projectId: { in: plan.mandates.map((m) => m.projectId) }, status: 'a_faire', type: { in: ['formation_equipe_urgence', 'exercice_evacuation', 'exercice_table'] } },
      data: { clientBookable: true },
    });
    for (const b of lot.bookings) {
      if (await tx.booking.findUnique({ where: { id: b.id } })) continue;
      await tx.booking.create({ data: { id: b.id, projectId: b.projectId, activityId: b.activityId, organizationId: org, clientUserId: b.clientUserId, assignedUserId: b.advisorId, activityType: b.activityType, requestedDate: b.requestedDate, duration: b.duration, participants: b.participants, comment: b.comment, status: 'DEMANDEE' } });
      const commitment = await createCommitmentVersion(tx, {
        bookingId: b.id, projectId: b.projectId, activityId: b.activityId, buildingId: b.buildingId, advisorId: b.advisorId,
        startAt: b.requestedDate, durationMinutes: b.duration, changeType: 'INITIAL_REQUEST',
        proposedByActorType: 'CLIENT', proposedByActorId: b.clientUserId, customerRequested: true,
      });
      await tx.bookingAssignment.create({ data: { id: id(`assignment-${b.key}`), bookingId: b.id, userId: b.advisorId, role: 'LEAD', status: 'PENDING', commitmentVersionId: commitment.id } });
      await tx.booking.update({ where: { id: b.id }, data: { pendingCommitmentVersionId: commitment.id, commitmentLockVersion: { increment: 1 } } });
    }
  }, { timeout: 180000 });
}

// ── Lot 3 : Centre d'aide et rapports d'exercice ────────────────────────
const TICKETS = [
  { type: 'QUESTION', impact: 'MINOR', status: 'CLOSED', subject: 'Où trouver la version signée de notre plan ?', ask: 'Bonjour, nous ne retrouvons plus la version signée du plan de l’an dernier. Où la télécharger ?', answer: 'Bonjour, elle se trouve dans Documents, sur la fiche du plan : bouton Télécharger (FR ou EN). Bonne journée !', days: [3, 3, 4] },
  { type: 'QUESTION', impact: 'DISRUPTIVE', status: 'RESOLVED', subject: 'Ajouter notre nouveau gestionnaire comme contact d’urgence', ask: 'Notre gestionnaire d’immeuble a changé. Comment le mettre à jour dans le plan ?', answer: 'C’est noté, nous mettons à jour la liste des contacts et nous vous envoyons la nouvelle version pour signature.', days: [9, 9, 10] },
  { type: 'OTHER', impact: 'MINOR', status: 'WAITING_REQUESTER', subject: 'Date de l’exercice d’évacuation du printemps', ask: 'Pouvons-nous déjà réserver l’exercice d’évacuation du printemps ?', answer: 'Oui, avec plaisir. Avez-vous une préférence entre la semaine du 13 et celle du 20 avril ?', days: [2, 2, null] },
  { type: 'QUESTION', impact: 'DISRUPTIVE', status: 'IN_PROGRESS', subject: 'Formation des nouveaux secouristes', ask: 'Cinq nouveaux employés doivent être formés secouristes. Quelles sont les options ?', answer: null, days: [1, 1, null] },
  { type: 'QUESTION', impact: 'MINOR', status: 'NEW', subject: 'Question sur le registre des présences', ask: 'Les visiteurs doivent-ils pointer à la sortie, ou la sortie est-elle automatique ?', answer: null, days: [0, null, null] },
];

function buildLot3(plan, lot2) {
  const tickets = TICKETS.map((t, k) => {
    const m = plan.mandates[(k * 11) % plan.mandates.length];
    const cu = lot2.clientUsers.find((u) => u.clientId === m.building.clientId);
    const created = local(iso(addDays(day(AS_OF), -t.days[0])), '10:15');
    return { ...t, key: `ticket-${k}`, id: id(`ticket-${k}`), clientUser: cu, clientId: m.building.clientId, buildingId: m.building.id, agent: m.owner, created };
  });
  const reports = plan.activities
    .filter((a) => a.type.startsWith('exercice') && a.status === 'fait')
    .slice(0, 2)
    .map((a, k) => {
      const m = plan.mandates.find((x) => x.projectId === a.projectId);
      return { key: `exercise-${k}`, id: id(`exercise-${k}`), activity: a, mandate: m, type: a.type === 'exercice_table' ? 'TABLETOP' : 'EVACUATION', status: k === 0 ? 'IN_REVIEW' : 'DRAFT' };
    });
  return { tickets, reports };
}

async function prepareLot3(prisma, plan, admin) {
  const org = TARGET.organizationId;
  const lot = buildLot3(plan, buildLot2(plan));
  const { firstResponseDueAt, supportPriority } = require('/app/dist/src/support/support-sla.js');
  await prisma.$transaction(async (tx) => {
    await assertTarget(tx);
    for (const t of lot.tickets) {
      if (await tx.supportTicket.findUnique({ where: { id: t.id } })) continue;
      const priority = supportPriority(t.type, t.impact);
      const responded = t.answer ? local(iso(addDays(day(AS_OF), -(t.days[1] ?? 0))), '14:40') : null;
      await tx.supportTicket.create({
        data: {
          id: t.id, organizationId: org, channel: 'CLIENT_PORTAL', queue: 'ADVISOR', type: t.type, impact: t.impact, priority,
          status: t.status, subject: t.subject, requesterClientUserId: t.clientUser.id, clientId: t.clientId, buildingId: t.buildingId,
          assignedUserId: t.status === 'NEW' ? null : t.agent.id, firstResponseDueAt: firstResponseDueAt(priority, t.created),
          firstRespondedAt: responded, lastRequesterActivityAt: t.created, lastAgentActivityAt: responded,
          resolvedAt: ['RESOLVED', 'CLOSED'].includes(t.status) ? local(iso(addDays(day(AS_OF), -(t.days[2] ?? 0) + 1)), '09:00') : null,
          closedAt: t.status === 'CLOSED' ? local(iso(addDays(day(AS_OF), -(t.days[2] ?? 0) + 2)), '09:00') : null,
          createdAt: t.created,
        },
      });
      const messages = [{ authorKind: 'REQUESTER', authorClientUserId: t.clientUser.id, authorName: `${t.clientUser.firstName} ${t.clientUser.lastName}`, body: t.ask, createdAt: t.created }];
      if (t.status === 'IN_PROGRESS') messages.push({ authorKind: 'AGENT', authorUserId: t.agent.id, authorName: `${t.agent.firstName} ${t.agent.lastName}`, body: 'Vérifier les dates de la prochaine formation RCR avec le formateur avant de répondre.', internal: true, createdAt: new Date(t.created.getTime() + 3 * 3600000) });
      if (t.answer) messages.push({ authorKind: 'AGENT', authorUserId: t.agent.id, authorName: `${t.agent.firstName} ${t.agent.lastName}`, body: t.answer, createdAt: responded });
      if (t.status === 'CLOSED') messages.push({ authorKind: 'REQUESTER', authorClientUserId: t.clientUser.id, authorName: `${t.clientUser.firstName} ${t.clientUser.lastName}`, body: 'Parfait, merci !', createdAt: new Date(responded.getTime() + 20 * 3600000) });
      await tx.supportTicketMessage.createMany({ data: messages.map((msg, n) => ({ id: id(`${t.key}-msg-${n}`), ticketId: t.id, internal: false, ...msg })) });
    }
    for (const rep of lot.reports) {
      if (await tx.exerciseReport.findUnique({ where: { id: rep.id } })) continue;
      const m = rep.mandate;
      const occurred = rep.activity.scheduledDate;
      const adviser = `${m.owner.firstName} ${m.owner.lastName}`;
      await tx.exerciseReport.create({
        data: {
          id: rep.id, organizationId: org, projectId: m.projectId, activityId: rep.activity.id, clientId: m.building.clientId, buildingId: m.building.id,
          type: rep.type, status: rep.status, activityLabel: rep.activity.label, scheduledAt: occurred, occurredAt: occurred, startedAt: occurred,
          durationMinutes: rep.type === 'TABLETOP' ? 120 : 45, zones: rep.type === 'EVACUATION' ? ['Rez-de-chaussée', 'Étages 1 à 3'] : [],
          mandateName: m.name, providerName: 'Firme-conseil de démonstration', adviserName: adviser,
          buildingName: m.building.name, buildingAddress: `${m.building.address}, ${m.building.city}`,
          level: rep.type === 'TABLETOP' ? 'Direction' : 'Tous les occupants', difficulty: 'Intermédiaire',
          scenario: rep.type === 'TABLETOP' ? 'Panne prolongée du centre de données pendant la période de pointe.' : 'Alarme incendie déclenchée au 2e étage, escalier est inaccessible.',
          positiveIntro: 'L’équipe a réagi rapidement et la communication a été claire.', globalRating: 'Satisfaisant',
          summaryTitle: rep.type === 'TABLETOP' ? 'Exercice sur table — continuité des activités' : 'Exercice d’évacuation complet',
          conclusion: 'Les objectifs principaux sont atteints. Trois améliorations sont recommandées avant le prochain exercice.',
          preparedBy: adviser, recipient: 'Direction du bâtiment', conclusionDate: addDays(occurred, 2), createdById: m.owner.id,
          reviewSubmittedById: rep.status === 'IN_REVIEW' ? m.owner.id : null, reviewSubmittedAt: rep.status === 'IN_REVIEW' ? addDays(occurred, 2) : null,
        },
      });
      await tx.exerciseParticipant.createMany({ data: ['Coordonnateur d’urgence', 'Responsable d’étage', 'Responsable du point de rassemblement', 'Agent de sécurité'].map((name, n) => ({ id: id(`${rep.key}-p-${n}`), key: `p${n}`, reportId: rep.id, name })) });
      await tx.exerciseTimelineEntry.createMany({
        data: [['INPUT', 'Déclenchement du scénario'], ['RESPONSE', 'Appel au 911 et mobilisation de l’équipe'], ['RESPONSE', rep.type === 'TABLETOP' ? 'Activation de la cellule de crise' : 'Évacuation complète en 7 min 40 s'], ['INPUT', 'Fin de l’exercice et débriefing']]
          .map(([type, event], n) => ({ id: id(`${rep.key}-t-${n}`), key: `t${n}`, reportId: rep.id, type, event })),
      });
      const findings = [
        ['POSITIVE', 'Mobilisation rapide de l’équipe d’urgence.'],
        ['GAP', 'Le point de rassemblement secondaire n’était pas connu de tous.'],
        ['GAP', 'Deux personnes à mobilité réduite n’avaient pas d’accompagnateur désigné.'],
      ];
      for (const [n, [type, description]] of findings.entries()) {
        await tx.exerciseFinding.create({ data: { id: id(`${rep.key}-f-${n}`), key: `f${n}`, reportId: rep.id, type, description, order: n } });
        if (type === 'GAP') await tx.exerciseRecommendation.create({ data: { id: id(`${rep.key}-r-${n}`), key: `r${n}`, reportId: rep.id, findingId: id(`${rep.key}-f-${n}`), text: n === 1 ? 'Afficher le point de rassemblement secondaire et le rappeler à chaque formation.' : 'Désigner un accompagnateur et un substitut pour chaque personne à mobilité réduite.' } });
      }
    }
  }, { timeout: 120000 });
}

// ── Lot 4 : Poste de sécurité du portail (Tour Prémont) ─────────────────
const SITE = { clientName: 'Groupe Immobilier Prémont', buildingName: 'Tour Prémont', post: 'Poste principal — hall' };
const SITE_IDENTITIES = { agent: 'demo-client@getcoro.io', supervisor: 'demo-clientcorp@getcoro.io' };
const AGENT_PERMISSIONS = ['OPERATIONAL_LOG_READ', 'OPERATIONAL_LOG_CREATE', 'OPERATIONAL_LOG_EDIT', 'OPERATIONAL_SHIFT_READ', 'OPERATIONAL_SHIFT_OPEN', 'OPERATIONAL_SHIFT_EDIT_OWN', 'OPERATIONAL_HANDOVER_PREPARE', 'OPERATIONAL_HANDOVER_ACKNOWLEDGE', 'OPERATIONAL_DIRECTIVE_READ', 'OPERATIONAL_DIRECTIVE_ACKNOWLEDGE', 'OPERATIONAL_FOLLOWUP_READ', 'OPERATIONAL_FOLLOWUP_CREATE', 'OPERATIONAL_FOLLOWUP_EXECUTE'];
const SUPERVISOR_PERMISSIONS = [...AGENT_PERMISSIONS, 'OPERATIONAL_LOG_ADMIN', 'OPERATIONAL_SHIFT_SUPERVISE', 'OPERATIONAL_SHIFT_EXCEPTION_CLOSE', 'OPERATIONAL_DIRECTIVE_CREATE', 'OPERATIONAL_DIRECTIVE_EDIT', 'OPERATIONAL_DIRECTIVE_REVIEW', 'OPERATIONAL_DIRECTIVE_APPROVE', 'OPERATIONAL_DIRECTIVE_PUBLISH', 'OPERATIONAL_DIRECTIVE_REVOKE', 'OPERATIONAL_FOLLOWUP_ASSIGN', 'OPERATIONAL_FOLLOWUP_VERIFY', 'OPERATIONAL_FOLLOWUP_CLOSE'];
const SITE_FEATURES = ['OPERATIONAL_LOG', 'OPERATIONAL_SHIFTS', 'OPERATIONAL_DIRECTIVES', 'OPERATIONAL_FOLLOWUPS', 'SECURITY_WORKSTATION'];
const GUARDS = [
  { key: 'garde-roy', firstName: 'Julien', lastName: 'Roy' },
  { key: 'garde-cote', firstName: 'Nadia', lastName: 'Côté' },
  { key: 'garde-pelletier', firstName: 'Marc', lastName: 'Pelletier' },
].map((g) => ({ ...g, id: id(`guard-${g.key}`), email: `${g.key}@example.invalid` }));
const SITE_START = '2026-09-28';
const LOG_TEMPLATES = [
  ['ronde', 'Ronde', 'NORMAL', 'Ronde complète des étages 1 à 12, rien à signaler.', 'Étages 1 à 12'],
  ['acces', 'Accès', 'NORMAL', 'Livraison de fournitures acceptée au quai, bon de livraison vérifié.', 'Quai de chargement'],
  ['acces', 'Accès', 'LOW', 'Entrepreneur en électricité inscrit au registre, badge temporaire remis.', 'Hall'],
  ['alarme', 'Alarme', 'HIGH', 'Alarme intrusion porte stationnement P2 : vérification sur place, porte mal fermée, réarmée.', 'Stationnement P2'],
  ['technique', 'Technique', 'HIGH', 'Fuite d’eau signalée au 7e (salle de bain des femmes), concierge avisé, eau coupée.', '7e étage'],
  ['assistance', 'Assistance', 'NORMAL', 'Locataire assistée pour l’ouverture de son bureau (clé oubliée), identité vérifiée.', '4e étage'],
  ['ronde', 'Ronde', 'NORMAL', 'Ronde extérieure : éclairage du stationnement fonctionnel, deux ampoules à remplacer côté est.', 'Extérieur'],
  ['securite', 'Sécurité', 'CRITICAL', 'Personne non autorisée dans l’escalier B, raccompagnée à la sortie. Description consignée.', 'Escalier B'],
  ['acces', 'Accès', 'NORMAL', 'Remise des clés au service d’entretien de nuit.', 'Hall'],
  ['technique', 'Technique', 'NORMAL', 'Ascenseur 3 en arrêt, technicien appelé, ascenseur remis en service à l’arrivée du technicien.', 'Ascenseurs'],
];

function buildLot4() {
  const r = rng('lot4');
  const shifts = [];
  const logs = [];
  const handovers = [];
  const followUps = [];
  let n = 0;
  for (let d = day(SITE_START); d <= day(AS_OF); d = addDays(d, 1)) {
    const date = iso(d);
    for (const [slot, start, end] of [['jour', '07:00', '19:00'], ['nuit', '19:00', '07:00']]) {
      const startAt = local(date, start);
      const endAt = slot === 'jour' ? local(date, end) : local(iso(addDays(d, 1)), end);
      const guard = GUARDS[n % GUARDS.length]; // relève toujours entre deux agents différents
      const isCurrent = startAt <= new Date(`${AS_OF}T16:00:00Z`) && endAt > new Date(`${AS_OF}T16:00:00Z`);
      const isFuture = startAt > new Date(`${AS_OF}T16:00:00Z`);
      const key = `shift-${date}-${slot}`;
      const shift = { key, id: id(key), date, slot, startAt, endAt, guard, status: isFuture ? 'PLANNED' : isCurrent ? 'OPEN' : 'CLOSED' };
      shifts.push(shift);
      n += 1;
      if (isFuture) continue;
      const count = 2 + Math.floor(r() * 4);
      for (let k = 0; k < count; k += 1) {
        const [activityType, category, priority, description, location] = LOG_TEMPLATES[Math.floor(r() * LOG_TEMPLATES.length)];
        const eventAt = new Date(startAt.getTime() + ((k + 1) / (count + 1)) * (endAt - startAt));
        if (eventAt > new Date(`${AS_OF}T16:00:00Z`)) continue;
        const late = r() < 0.06;
        const lkey = `${key}-log-${k}`;
        const needsFollow = priority === 'HIGH' && r() < 0.6;
        logs.push({ key: lkey, id: id(lkey), shiftId: shift.id, guard, eventAt, recordedAt: new Date(eventAt.getTime() + (late ? 95 : 4) * 60000), activityType, category, priority, description, location, followUp: needsFollow });
        if (needsFollow) followUps.push({ key: `${lkey}-fu`, id: id(`${lkey}-fu`), sourceId: id(lkey), description: `Suite à donner : ${description.split(',')[0].toLowerCase()}.`, priority: 'IMPORTANT', created: eventAt, guard });
      }
    }
  }
  // Relève entre chaque quart terminé et le suivant.
  for (let i = 0; i < shifts.length - 1; i += 1) {
    const out = shifts[i];
    const next = shifts[i + 1];
    if (out.status !== 'CLOSED') continue;
    const snapshot = { summary: 'Quart sans événement majeur; consignes en vigueur relues.', openFollowUps: 0, keysCount: 12, capturedAt: out.endAt.toISOString() };
    handovers.push({ key: `${out.key}-handover`, id: id(`${out.key}-handover`), out, next, snapshot, snapshotHash: crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'), submittedAt: new Date(out.endAt.getTime() - 10 * 60000), decidedAt: new Date(out.endAt.getTime() + 5 * 60000) });
  }
  // État des suivis selon leur ancienneté.
  const now = new Date(`${AS_OF}T16:00:00Z`);
  for (const f of followUps) {
    const ageDays = (now - f.created) / 86400000;
    f.status = ageDays > 10 ? 'CLOSED' : ageDays > 5 ? 'VERIFIED' : ageDays > 2 ? 'IN_PROGRESS' : 'OPEN';
    f.dueAt = new Date(f.created.getTime() + 3 * 86400000);
  }
  const closedSources = new Set(followUps.filter((f) => f.status === 'CLOSED').map((f) => f.sourceId));
  for (const l of logs) l.status = l.followUp && !closedSources.has(l.id) ? 'FOLLOW_UP' : 'RESOLVED';
  const directives = [
    { key: 'dir-1', title: 'Contrôle des accès après 18 h', type: 'PERMANENT', priority: 'IMPORTANT', status: 'PUBLISHED', ack: true, text: 'Après 18 h, toute personne doit présenter une carte d’accès ou être inscrite au registre. Aucun accès sans vérification d’identité.', published: '2026-09-25' },
    { key: 'dir-2', title: 'Procédure d’alarme incendie — appel au 911', type: 'PERMANENT', priority: 'CRITICAL', status: 'PUBLISHED', ack: true, text: 'Au déclenchement d’une alarme, confirmer l’appel au 911, ouvrir l’accès aux pompiers et remettre la liste des présences.', published: '2026-09-25' },
    { key: 'dir-3', title: 'Travaux de toiture — accès restreint', type: 'TEMPORARY', priority: 'IMPORTANT', status: 'PUBLISHED', ack: true, text: 'Du 16 novembre au 18 décembre, l’accès au toit est réservé à l’entrepreneur inscrit. Vérifier le permis de travail chaque matin.', published: '2026-11-15', expires: '2026-12-19' },
    { key: 'dir-4', title: 'Fermeture du stationnement P3 pour peinture', type: 'TEMPORARY', priority: 'NORMAL', status: 'EXPIRED', ack: false, text: 'Le P3 est fermé du 19 au 23 octobre. Rediriger les usagers vers le P2.', published: '2026-10-17', expires: '2026-10-24' },
    { key: 'dir-5', title: 'Nouvelle procédure de remise des clés', type: 'SHIFT_DIRECTIVE', priority: 'NORMAL', status: 'SUBMITTED', ack: true, text: 'Chaque remise de clé est inscrite dans la main courante avec le numéro de la clé et le nom de la personne.', published: null },
  ].map((dv) => ({ ...dv, id: id(dv.key), versionId: id(`${dv.key}-v1`) }));
  return { shifts, logs, handovers, followUps, directives };
}

async function prepareLot4(prisma, admin) {
  const org = TARGET.organizationId;
  const lot = buildLot4();
  const ctx = await prisma.$transaction(async (tx) => {
    await assertTarget(tx);
    const building = await tx.building.findFirst({ where: { organizationId: org, name: SITE.buildingName, client: { name: SITE.clientName } }, select: { id: true, clientId: true, timeZone: true } });
    if (!building) throw new Error('SITE_BUILDING_NOT_FOUND');
    const agent = await tx.clientUser.findFirst({ where: { organizationId: org, email: SITE_IDENTITIES.agent, clientId: building.clientId }, select: { id: true, firstName: true, lastName: true, operationalPermissions: true } });
    const supervisor = await tx.clientUser.findFirst({ where: { organizationId: org, email: SITE_IDENTITIES.supervisor, clientId: building.clientId }, select: { id: true, firstName: true, lastName: true, operationalPermissions: true } });
    if (!agent || !supervisor) throw new Error('SITE_IDENTITIES_NOT_FOUND');
    // Droits des comptes de démonstration du portail (ajout seulement; l'état d'origine est gardé pour reset).
    for (const [who, row, perms] of [['agent', agent, AGENT_PERMISSIONS], ['supervisor', supervisor, SUPERVISOR_PERMISSIONS]]) {
      const key = `site-permissions-${who}`;
      const existing = await tx.demoFixtureRecord.findUnique({ where: { organizationId_fixtureNamespace_fixtureKey: { organizationId: org, fixtureNamespace: NAMESPACE, fixtureKey: key } } });
      const baseline = existing && existing.state === 'ACTIVE' ? existing.baseline : { before: row.operationalPermissions };
      const merged = [...new Set([...row.operationalPermissions, ...perms])];
      await tx.clientUser.update({ where: { id: row.id }, data: { operationalPermissions: merged } });
      await tx.demoFixtureRecord.upsert({
        where: { organizationId_fixtureNamespace_fixtureKey: { organizationId: org, fixtureNamespace: NAMESPACE, fixtureKey: key } },
        create: { organizationId: org, fixtureNamespace: NAMESPACE, fixtureKey: key, entityType: 'ClientUserPermissions', entityId: row.id, baseline },
        update: { state: 'ACTIVE', entityType: 'ClientUserPermissions', entityId: row.id, baseline },
      });
    }
    for (const g of GUARDS) {
      const row = await tx.clientUser.upsert({
        where: { email: g.email },
        create: { id: g.id, email: g.email, password: `disabled-${crypto.randomUUID()}`, firstName: g.firstName, lastName: g.lastName, clientId: building.clientId, organizationId: org, isActive: true, operationalPermissions: AGENT_PERMISSIONS },
        update: {},
      });
      if (row.id !== g.id) throw new Error('FIXTURE_COLLISION_GUARD');
      await register(tx, `guard-${g.key}`, 'ClientUser', g.id);
    }
    await tx.coroActorIdentity.upsert({ where: { organizationId_actorType_actorId: { organizationId: org, actorType: 'USER', actorId: admin.id } }, create: { organizationId: org, actorType: 'USER', actorId: admin.id, userId: admin.id }, update: {} });
    for (const cu of [agent.id, supervisor.id, ...GUARDS.map((g) => g.id)]) {
      await tx.coroActorIdentity.upsert({ where: { organizationId_actorType_actorId: { organizationId: org, actorType: 'CLIENT_USER', actorId: cu } }, create: { organizationId: org, actorType: 'CLIENT_USER', actorId: cu, clientUserId: cu }, update: {} });
      const existing = await tx.clientOperationalBuildingAssignment.findUnique({ where: { organizationId_buildingId_clientUserId: { organizationId: org, buildingId: building.id, clientUserId: cu } } });
      if (!existing) {
        const row = await tx.clientOperationalBuildingAssignment.create({ data: { organizationId: org, buildingId: building.id, clientUserId: cu, grantedByUserId: admin.id, grantReason: 'Démonstration du Poste de sécurité', effectiveFrom: day('2026-09-01') } });
        await register(tx, `site-assignment-${cu}`, 'ClientOperationalBuildingAssignment', row.id);
      }
    }
    // Droits contractuels du site (essai), comme pour CORO Report.
    const until = new Date('2027-06-30T00:00:00Z');
    for (const code of SITE_FEATURES) {
      const capability = await tx.commercialCapability.findUnique({ where: { code } });
      if (!capability) throw new Error(`CAPABILITY_MISSING_${code}`);
      const existing = await tx.capabilityEntitlement.findFirst({ where: { organizationId: org, capabilityId: capability.id, scope: 'SITE', clientId: building.clientId, buildingId: building.id }, include: { revisions: { orderBy: { versionNumber: 'desc' }, take: 1 } } });
      if (existing && existing.revisions[0]?.lifecycle === 'GRANTED' && existing.revisions[0]?.enabled) continue;
      if (existing) {
        await tx.capabilityEntitlementRevision.create({ data: { entitlementId: existing.id, versionNumber: existing.revisions[0].versionNumber + 1, lifecycle: 'GRANTED', enabled: true, distributable: false, decisionAt: new Date(), effectiveFrom: day('2026-09-01'), effectiveUntil: until, reason: 'Démonstration du Poste de sécurité', createdByUserId: admin.id, createdByDisplayName: 'Démonstration CORO' } });
        await register(tx, `site-entitlement-${code}`, 'CapabilityEntitlement', existing.id);
      } else {
        const row = await tx.capabilityEntitlement.create({ data: { organizationId: org, capabilityId: capability.id, scope: 'SITE', clientId: building.clientId, buildingId: building.id, source: 'TRIAL', provenanceReason: 'Démonstration du Poste de sécurité', createdByUserId: admin.id, createdByDisplayName: 'Démonstration CORO', revisions: { create: { versionNumber: 1, lifecycle: 'GRANTED', enabled: true, distributable: false, decisionAt: new Date(), effectiveFrom: day('2026-09-01'), effectiveUntil: until, reason: 'Démonstration du Poste de sécurité', createdByUserId: admin.id, createdByDisplayName: 'Démonstration CORO' } } } });
        await register(tx, `site-entitlement-${code}`, 'CapabilityEntitlement', row.id);
      }
    }
    return { building, agent, supervisor };
  }, { timeout: 120000 });

  const { building, supervisor } = ctx;
  const tz = building.timeZone || TIME_ZONE;
  const actor = (g) => ({ actorType: 'CLIENT_USER', actorId: g.id });
  await prisma.$transaction(async (tx) => {
    await assertTarget(tx);
    await tx.operationalShift.createMany({
      data: lot.shifts.map((s) => ({
        id: s.id, organizationId: org, buildingId: building.id, securityPost: SITE.post, teamName: s.slot === 'jour' ? 'Équipe de jour' : 'Équipe de nuit',
        responsibleActorType: 'CLIENT_USER', responsibleActorId: s.guard.id, plannedStartAt: s.startAt, plannedEndAt: s.endAt,
        actualStartAt: s.status === 'PLANNED' ? null : new Date(s.startAt.getTime() + 3 * 60000),
        actualEndAt: s.status === 'CLOSED' ? new Date(s.endAt.getTime() + 6 * 60000) : null,
        buildingTimeZone: tz, status: s.status, creationIdempotencyKey: `demo:${s.key}`,
        createdByActorType: 'CLIENT_USER', createdByActorId: supervisor.id,
        closedByActorType: s.status === 'CLOSED' ? 'CLIENT_USER' : null, closedByActorId: s.status === 'CLOSED' ? s.guard.id : null,
      })),
      skipDuplicates: true,
    });
    for (let i = 0; i < lot.logs.length; i += 500) {
      await tx.operationalLogEntry.createMany({
        data: lot.logs.slice(i, i + 500).map((l) => ({
          id: l.id, organizationId: org, buildingId: building.id, eventAt: l.eventAt, recordedAt: l.recordedAt, ...{ authorActorType: 'CLIENT_USER', authorActorId: l.guard.id },
          shiftId: l.shiftId, locationLabel: l.location, activityType: l.activityType, category: l.category, priority: l.priority, description: l.description,
          status: l.status, followUpRequired: l.followUp, creationIdempotencyKey: `demo:${l.key}`, createdAt: l.recordedAt,
        })),
        skipDuplicates: true,
      });
    }
    await tx.operationalHandover.createMany({
      data: lot.handovers.map((h) => ({
        id: h.id, organizationId: org, buildingId: building.id, outgoingShiftId: h.out.id, incomingShiftId: h.next.id,
        outgoingActorType: 'CLIENT_USER', outgoingActorId: h.out.guard.id, incomingActorType: 'CLIENT_USER', incomingActorId: h.next.guard.id,
        status: 'ACKNOWLEDGED', snapshot: h.snapshot, snapshotHash: h.snapshotHash, creationIdempotencyKey: `demo:${h.key}`,
        submittedAt: h.submittedAt, decidedAt: h.decidedAt, createdAt: h.submittedAt,
      })),
      skipDuplicates: true,
    });
    await tx.operationalFollowUp.createMany({
      data: lot.followUps.map((f) => ({
        id: f.id, organizationId: org, buildingId: building.id, sourceType: 'OPERATIONAL_LOG', sourceId: f.sourceId, description: f.description, priority: f.priority,
        responsibleActorType: 'CLIENT_USER', responsibleActorId: f.guard.id, dueAt: f.dueAt, status: f.status,
        completedAt: ['VERIFIED', 'CLOSED'].includes(f.status) ? new Date(f.created.getTime() + 2 * 86400000) : null,
        verifiedAt: ['VERIFIED', 'CLOSED'].includes(f.status) ? new Date(f.created.getTime() + 3 * 86400000) : null,
        verifiedByActorType: ['VERIFIED', 'CLOSED'].includes(f.status) ? 'CLIENT_USER' : null, verifiedByActorId: ['VERIFIED', 'CLOSED'].includes(f.status) ? supervisor.id : null,
        closedAt: f.status === 'CLOSED' ? new Date(f.created.getTime() + 4 * 86400000) : null,
        creationIdempotencyKey: `demo:${f.key}`, createdByActorType: 'CLIENT_USER', createdByActorId: f.guard.id, createdAt: f.created,
      })),
      skipDuplicates: true,
    });
    for (const dv of lot.directives) {
      const published = dv.published ? local(dv.published, '09:00') : null;
      // Les versions de consigne sont immuables : après un reset, la consigne est seulement réactivée.
      if (await tx.operationalDirective.findUnique({ where: { id: dv.id } })) {
        await tx.operationalDirective.update({ where: { id: dv.id }, data: { status: dv.status } });
        continue;
      }
      const content = { title: dv.title, description: dv.text, type: dv.type, priority: dv.priority };
      await tx.operationalDirective.create({ data: {
        id: dv.id, organizationId: org, buildingId: building.id, securityPost: SITE.post, title: dv.title, type: dv.type, priority: dv.priority, status: dv.status,
        effectiveAt: published, expiresAt: dv.expires ? local(dv.expires, '00:00') : null, targetCriteria: { securityPost: SITE.post }, acknowledgementRequired: dv.ack,
        creationIdempotencyKey: `demo:${dv.key}`, createdByActorType: 'CLIENT_USER', createdByActorId: supervisor.id,
        approvedByActorType: published ? 'USER' : null, approvedByActorId: published ? admin.id : null, approvedByUserId: published ? admin.id : null,
        approvedAt: published, publishedAt: published, createdAt: published ? new Date(published.getTime() - 86400000) : local(AS_OF, '08:00'),
      } });
      await tx.operationalDirectiveVersion.create({ data: { id: dv.versionId, organizationId: org, buildingId: building.id, directiveId: dv.id, versionNumber: 1, title: dv.title, description: dv.text, targetSnapshot: { securityPost: SITE.post }, contentHash: crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex'), authorActorType: 'CLIENT_USER', authorActorId: supervisor.id } });
      if (dv.status === 'PUBLISHED' && dv.ack) {
        for (const g of GUARDS) {
          await tx.operationalDirectiveReceipt.create({ data: { id: id(`${dv.key}-receipt-${g.key}`), organizationId: org, buildingId: building.id, directiveId: dv.id, versionId: dv.versionId, recipientActorType: 'CLIENT_USER', recipientActorId: g.id, status: g.key === 'garde-pelletier' && dv.key === 'dir-3' ? 'VIEWED' : 'CONFIRMED', publishedAt: published, viewedAt: new Date(published.getTime() + 3600000), confirmedAt: g.key === 'garde-pelletier' && dv.key === 'dir-3' ? null : new Date(published.getTime() + 2 * 3600000) } });
        }
      }
    }
  }, { timeout: 180000 });
  return { shifts: lot.shifts.length, logs: lot.logs.length, handovers: lot.handovers.length, followUps: lot.followUps.length, directives: lot.directives.length };
}

async function resetLot4(tx, org) {
  const guardIds = GUARDS.map((g) => g.id);
  const lot = buildLot4();
  const shiftIds = lot.shifts.map((s) => s.id);
  const directiveIds = lot.directives.map((d) => d.id);
  // Versions de consigne immuables (aucune suppression possible) : les consignes sont archivées.
  await tx.operationalDirective.updateMany({ where: { organizationId: org, id: { in: directiveIds } }, data: { status: 'ARCHIVED' } });
  await tx.operationalFollowUp.deleteMany({ where: { organizationId: org, id: { in: lot.followUps.map((f) => f.id) } } });
  await tx.operationalHandover.deleteMany({ where: { organizationId: org, id: { in: lot.handovers.map((h) => h.id) } } });
  await tx.operationalLogEntry.deleteMany({ where: { organizationId: org, id: { in: lot.logs.map((l) => l.id) } } });
  await tx.operationalShift.deleteMany({ where: { organizationId: org, id: { in: shiftIds } } });
  const records = await tx.demoFixtureRecord.findMany({ where: { organizationId: org, fixtureNamespace: NAMESPACE, state: 'ACTIVE' } });
  for (const r of records) {
    if (r.entityType === 'ClientUserPermissions') await tx.clientUser.update({ where: { id: r.entityId }, data: { operationalPermissions: r.baseline?.before ?? [] } });
    if (r.entityType === 'ClientOperationalBuildingAssignment') await tx.clientOperationalBuildingAssignment.updateMany({ where: { organizationId: org, id: r.entityId }, data: { status: 'REVOKED', revokedAt: new Date(), revocationReason: 'Fin de la démonstration' } });
    if (r.entityType === 'CapabilityEntitlement') {
      const e = await tx.capabilityEntitlement.findUnique({ where: { id: r.entityId }, include: { revisions: { orderBy: { versionNumber: 'desc' }, take: 1 } } });
      if (e && e.revisions[0]?.lifecycle !== 'REVOKED') await tx.capabilityEntitlementRevision.create({ data: { entitlementId: e.id, versionNumber: e.revisions[0].versionNumber + 1, lifecycle: 'REVOKED', enabled: false, distributable: false, decisionAt: new Date(), effectiveFrom: new Date(), effectiveUntil: null, reason: 'Fin de la démonstration', createdByUserId: e.createdByUserId, createdByDisplayName: 'Démonstration CORO' } });
    }
  }
  await tx.clientUser.updateMany({ where: { organizationId: org, id: { in: guardIds } }, data: { isActive: false } });
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
  const [tickets, exerciseReports] = await Promise.all([
    tx.supportTicket.count({ where: { ...where, requesterClientUserId: { in: CLIENTS.map((c) => id(`client-user-${c.key}`)) } } }),
    tx.exerciseReport.count({ where: { ...where, projectId: { in: projectIds } } }),
  ]);
  const siteBuilding = await tx.building.findFirst({ where: { ...where, name: SITE.buildingName, client: { name: SITE.clientName } }, select: { id: true } });
  const siteWhere = { ...where, buildingId: siteBuilding?.id ?? '00000000-0000-0000-0000-000000000000' };
  const lot4 = buildLot4();
  const [siteShifts, siteLogs, siteHandovers, siteFollowUps, siteDirectives] = await Promise.all([
    tx.operationalShift.count({ where: { ...siteWhere, id: { in: lot4.shifts.map((x) => x.id) } } }),
    tx.operationalLogEntry.count({ where: { ...siteWhere, id: { in: lot4.logs.map((x) => x.id) } } }),
    tx.operationalHandover.count({ where: { ...siteWhere, id: { in: lot4.handovers.map((x) => x.id) } } }),
    tx.operationalFollowUp.count({ where: { ...siteWhere, id: { in: lot4.followUps.map((x) => x.id) } } }),
    tx.operationalDirective.count({ where: { ...siteWhere, id: { in: lot4.directives.map((x) => x.id) }, status: { not: 'ARCHIVED' } } }),
  ]);
  const [observations, comments, auditLogs, bookings, clientUsers] = await Promise.all([
    tx.reviewObservation.count({ where: { ...where, projectId: { in: projectIds } } }),
    tx.projectComment.count({ where: { ...where, projectId: { in: projectIds } } }),
    tx.auditLog.count({ where: { ...where, projectId: { in: projectIds } } }),
    tx.booking.count({ where: { ...where, projectId: { in: projectIds } } }),
    tx.clientUser.count({ where: { ...where, id: { in: CLIENTS.map((c) => id(`client-user-${c.key}`)) } } }),
  ]);
  return {
    advisors: users, projects, mandates, tasks,
    taskTimeEntries: taskTime._count, taskHours: Math.round((taskTime._sum.heures || 0) * 100) / 100,
    timelogEntries: timelog._count, timelogHours: Math.round((timelog._sum.heures || 0) * 100) / 100,
    activities, closedPeriods: closures.map((c) => c.period).sort(), registeredRecords: records,
    observations, comments, auditLogs, bookings, clientUsers, tickets, exerciseReports,
    siteShifts, siteLogs, siteHandovers, siteFollowUps, siteDirectives,
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
        create: { id: id(`rate-${a.key}`), organizationId: org, userId: a.id, currency: 'CAD', hourlyCost: a.cost, effectiveFrom: day('2026-01-01'), status: 'APPROVED', proposedByUserId: a.id, proposedAt: day('2026-08-25'), approvedByUserId: admin.id, approvedAt: day('2026-08-26') },
        update: {},
      });
    }
    for (const ab of ABSENCES) {
      const advisor = ADVISORS.find((a) => a.key === ab.advisor);
      await tx.userUnavailability.upsert({
        where: { id: id(`absence-${ab.key}`) },
        create: { id: id(`absence-${ab.key}`), organizationId: org, userId: advisor.id, startAt: local(ab.from, '00:00'), endAt: local(iso(addDays(day(ab.to), 1)), '00:00'), allDay: true, localStartDate: day(ab.from), localEndDate: addDays(day(ab.to), 1) /* fin exclusive */, timeZone: TIME_ZONE, type: ab.type, createdByUserId: admin.id },
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
      data: plan.tasks.map((t) => ({ id: t.id, projectId: t.projectId, organizationId: org, categoryName: t.category, taskTitle: t.title, status: t.status, dueDate: t.dueDate, order: t.order, assigneeId: t.assigneeId, activityId: t.activityId ?? null })),
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

  await prepareLot2(prisma, plan, admin);
  await prepareLot3(prisma, plan, admin);
  await prepareLot4(prisma, admin);
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
    await resetLot4(tx, org);
    const closureIds = (await tx.demoFixtureRecord.findMany({ where: { organizationId: org, fixtureNamespace: NAMESPACE, entityType: 'TimePeriodClosure' }, select: { entityId: true } })).map((r) => r.entityId);
    await tx.timePeriodClosure.deleteMany({ where: { organizationId: org, id: { in: closureIds } } });
    await tx.taskTimeEntry.deleteMany({ where: { organizationId: org, userId: { in: advisorIds } } });
    await tx.timelogEntry.deleteMany({ where: { organizationId: org, userId: { in: advisorIds } } });
    const ticketIds = (await tx.supportTicket.findMany({ where: { organizationId: org, requesterClientUserId: { in: CLIENTS.map((c) => id(`client-user-${c.key}`)) } }, select: { id: true } })).map((t) => t.id);
    await tx.supportTicketAttachment.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await tx.supportTicket.deleteMany({ where: { organizationId: org, id: { in: ticketIds } } });
    await tx.exerciseReport.deleteMany({ where: { organizationId: org, projectId: { in: projectIds } } });
    const bookingIds = (await tx.booking.findMany({ where: { organizationId: org, projectId: { in: projectIds } }, select: { id: true } })).map((b) => b.id);
    await tx.booking.updateMany({ where: { organizationId: org, id: { in: bookingIds } }, data: { pendingCommitmentVersionId: null, currentCommitmentVersionId: null } });
    await tx.bookingAssignment.deleteMany({ where: { booking: { organizationId: org, id: { in: bookingIds } } } });
    await tx.bookingCommitmentVersion.deleteMany({ where: { booking: { organizationId: org, id: { in: bookingIds } } } });
    await tx.bookingNotification.deleteMany({ where: { bookingId: { in: bookingIds } } });
    await tx.booking.deleteMany({ where: { organizationId: org, id: { in: bookingIds } } });
    await tx.projectAdvisorEligibility.deleteMany({ where: { organizationId: org, projectId: { in: projectIds } } });
    await tx.reviewObservation.deleteMany({ where: { organizationId: org, projectId: { in: projectIds } } });
    await tx.projectComment.deleteMany({ where: { organizationId: org, projectId: { in: projectIds } } });
    await tx.auditLog.deleteMany({ where: { organizationId: org, projectId: { in: projectIds } } });
    await tx.notification.deleteMany({ where: { organizationId: org, projectId: { in: projectIds } } });
    await tx.projectTaskAssignee.deleteMany({ where: { task: { projectId: { in: projectIds } } } });
    await tx.projectTask.deleteMany({ where: { organizationId: org, projectId: { in: projectIds } } });
    await tx.projectActivity.deleteMany({ where: { organizationId: org, projectId: { in: projectIds } } });
    await tx.projectMandate.deleteMany({ where: { organizationId: org, projectId: { in: projectIds } } });
    await tx.project.deleteMany({ where: { organizationId: org, id: { in: projectIds } } });
    await tx.building.deleteMany({ where: { organizationId: org, id: { in: BUILDINGS.map((b) => b.id) }, projects: { none: {} } } });
    await tx.clientUser.deleteMany({ where: { organizationId: org, id: { in: CLIENTS.map((c) => id(`client-user-${c.key}`)) } } });
    await tx.client.deleteMany({ where: { organizationId: org, id: { in: CLIENTS.map((c) => c.id) }, buildings: { none: {} }, projects: { none: {} } } });
    await tx.userUnavailability.deleteMany({ where: { organizationId: org, userId: { in: advisorIds } } });
    await tx.userWorkScheduleInterval.deleteMany({ where: { schedule: { userId: { in: advisorIds } } } });
    await tx.userWorkSchedule.deleteMany({ where: { organizationId: org, userId: { in: advisorIds } } });
    // Les taux approuvés sont immuables (aucune suppression possible) : ils restent, rattachés à des comptes désactivés.
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

module.exports = { buildLot4, buildLot3, buildLot2, AS_OF, ADVISORS, BUILDINGS, CLIENTS, CLOSED_PERIODS, build, buildMandates, id, run };

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(`${JSON.stringify({ schemaVersion: 1, command: process.argv[2] || 'dry-run', execution: 'FAILED', reason: String(error.message).replace(/[^\w :.,-]/g, '').slice(0, 160) })}\n`);
    process.exitCode = 1;
  });
}
