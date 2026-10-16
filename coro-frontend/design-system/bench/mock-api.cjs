/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * FAUX API LOCAL — OUTIL DE TEST UNIQUEMENT. Aucune donnée réelle, aucune base, aucun secret.
 * Remplace le backend (port 3002 par défaut) pour que les pages se rendent dans le banc de validation.
 * Les routes inconnues répondent 404 (les pages gèrent déjà ce cas via leurs `catch`).
 */
const http = require('node:http');
const PORT = Number(process.env.BENCH_API_PORT || 3002);

const user = { id: 'bench-user', email: 'bench@example.test', firstName: 'Alex', lastName: 'Démo', role: 'SUPER_ADMIN', organizationId: 'bench-org' };
const project = (id, name, status, type, progress, client, building, updatedAt) => ({ id, name, status, documentType: type, progress, updatedAt, client: { id: 'c-' + id, name: client }, building: { id: 'b-' + id, name: building } });
const projects = [
  project('p1', 'Plan de continuité — Démo A', 'IN_PROGRESS', 'PCA', 50, 'Organisation Démo A', 'Bâtiment A', '2026-09-13T12:00:00Z'),
  project('p2', 'Plan des mesures d’urgence', 'DRAFT', 'PMU', 0, 'Organisation Démo B', 'Bâtiment B', '2026-09-10T12:00:00Z'),
  project('p3', 'Plan de sécurité incendie', 'REVIEW', 'PSI', 80, 'Organisation Démo A', 'Bâtiment C', '2026-08-21T12:00:00Z'),
];
const routes = {
  '/api/projects': { projects },
  '/api/projects/upcoming-updates': [],
  // BENCH_PENDING=1 : une approbation en attente, pour mesurer l'état « urgent » de la pastille de notification.
  '/api/projects/pending-approval': process.env.BENCH_PENDING === '1' ? [{ id: 'p1', name: 'Plan de continuité — Démo A', documentType: 'PCA', client: { name: 'Organisation Démo A' }, submittedBy: { firstName: 'Sam', lastName: 'Exemple' } }] : [],
  '/api/activities/recurring-to-renew': [],
  '/api/activities/upcoming': [],
  '/api/notifications/mandate-delays': [],
  '/api/notifications/unread-count': { count: 3 },
  '/api/notifications': [],
  '/api/clients': [{ id: 'c-p1', name: 'Organisation Démo A', city: 'Montréal' }, { id: 'c-p2', name: 'Organisation Démo B', city: 'Québec' }, { id: 'c-p3', name: 'Organisation Démo C', city: 'Laval' }],
  '/api/users/me': user, '/api/auth/me': user,
};

// ───────── États simulables pour /activities/portfolio (variables d'environnement, tout désactivé par défaut) ─────────
//  BENCH_ACTIVITIES=1   : activités fictives représentatives (statuts, modes, types, libellé long, date manquante)
//  BENCH_FAIL_CLIENTS=1 : /api/clients répond 500 (état d'erreur)
//  BENCH_DELAY_MS=n     : /api/clients répond après n ms (état de chargement prolongé)
const activity = (id, label, type, status, mode, duration, scheduledDate, extra = {}) => ({ id, label, type, status, mode, duration, scheduledDate, ...extra });
const ACTIVITIES = {
  p1: [
    activity('a1', 'Visite de validation du plan', 'visite_validation', 'termine', 'presentiel', '2 h', '2026-09-18'),
    activity('a2', 'Mise à jour annuelle du plan', 'mise_a_jour', 'a_faire', 'teams', '1 h 30', '2026-10-21'),
    activity('a3', 'Formation du personnel', 'formation', 'reporte', 'presentiel', '3 h', '2026-11-04', { customLabel: 'Formation du personnel — groupe B' }),
  ],
  p2: [
    activity('a4', 'Exercice annuel avec une description volontairement très longue pour vérifier la troncature dans le tableau', 'exercice', 'a_faire', 'presentiel', '4 h', '2026-10-30'),
    activity('a5', 'Rencontre de suivi', 'rencontre', 'fait', 'teams', '45 min', '2026-10-02'),
  ],
  p3: [
    activity('a6', 'Révision du contenu', 'revision', 'annule', 'teams', '', '2026-08-12'),
    activity('a7', 'Activité sans date prévue', 'rencontre', 'a_faire', 'presentiel', '', null),
  ],
};
const delay = Number(process.env.BENCH_DELAY_MS || 0);

// ───────── États simulables pour le rendement (Phase 11D : modèle gouverné « operational » / « financial » de main) ─────────
//  GET /api/rendement/operational : { period, advisors[] } — heures, activités et participations, AUCUNE donnée financière.
//                                   Un non-admin ne reçoit que lui-même ; ADMIN et SUPER_ADMIN peuvent cibler userId.
//  GET /api/rendement/financial   : { scope, mandates[], totals[] } — réservé à ADMIN et SUPER_ADMIN (403 sinon), montants en chaînes décimales.
//  GET /api/rendement             : ancien chemin ; le backend de main y renvoie désormais la forme OPÉRATIONNELLE (reproduit ici).
//  BENCH_RENDEMENT=1       : données représentatives ; sinon réponses vides.
//  BENCH_FAIL_RENDEMENT=1  : les trois chemins répondent 500 (état d'erreur).
//  BENCH_DELAY_MS=n        : les trois chemins répondent après n ms (état de chargement prolongé).
//  BENCH_FINANCIAL_UNKNOWN_CURRENCY=1 : un mandat sans devise de vente (groupe « UNKNOWN » : déclenche un défaut connu de la page financière de main).
//  La période change la réponse opérationnelle : ≤ 10 jours → un seul mandat, 12,0 h ; > 300 jours → 480,0 h ; sinon → 42,5 h.
//  Ces réponses reproduisent la FORME du contrat (types, champs, raisons d'incomplétude) ; elles ne valident AUCUN calcul financier du backend.
const TIME_ZONE = 'America/Toronto';
const MANDATE_NAMES = {
  p1: ['Organisation Démo A', 'Plan de mesures d’urgence 2026'],
  p2: ['Organisation Démo B', 'Plan de sécurité incendie'],
  p3: ['Organisation Démo A', 'Mandat avec un nom volontairement très long pour vérifier le retour à la ligne dans le tableau et dans les cartes'],
  p4: ['Organisation Démo C', 'Plan de continuité'],
  p5: ['Organisation Démo D', 'Plan particulier d’intervention'],
  p6: ['Organisation Démo B', 'Suivi sans facturation'],
};
const participation = (projectId, mandateId) => ({ mandateId, projectId, projectName: MANDATE_NAMES[projectId][1] });
const OPERATIONAL_ADVISORS = (hours, short) => [
  { userId: 'u1', userName: 'Sophie Martin', hours,
    activities: short ? [{ id: 'act-1', label: 'Visite de validation du plan' }] : [{ id: 'act-1', label: 'Visite de validation du plan' }, { id: 'act-2', label: 'Formation du personnel' }, { id: 'act-3', label: 'Rencontre de suivi' }],
    participatedMandates: short ? [participation('p1', 'm1')] : [participation('p1', 'm1'), participation('p2', 'm2'), participation('p3', 'm3'), participation('p4', null)] },
  ...(short ? [] : [
    { userId: 'u2', userName: 'Jean-Philippe Tremblay-Lavoie', hours: 10, activities: [{ id: 'act-4', label: 'Exercice annuel' }], participatedMandates: [participation('p5', 'm5')] },
    { userId: 'u3', userName: 'Zoé Roy', hours: 2.5, activities: [], participatedMandates: [] },
  ]),
];
function operationalBody(url) {
  const q = new URL(url, 'http://bench').searchParams; const from = q.get('from'); const to = q.get('to');
  const nextDay = to ? new Date(Date.parse(to) + 864e5).toISOString().slice(0, 10) : null;
  const period = { from: from || null, to: to || null, timeZone: TIME_ZONE, upperBoundExclusive: nextDay };
  if (process.env.BENCH_RENDEMENT !== '1') return { period, advisors: [] };
  const days = from && to ? (Date.parse(to) - Date.parse(from)) / 864e5 + 1 : 31;
  if (days <= 10) return { period, advisors: OPERATIONAL_ADVISORS(12, true) };
  return { period, advisors: OPERATIONAL_ADVISORS(days > 300 ? 480 : 42.5, false) };
}
const FM = (id, projectId, soldAmount, soldCurrency, knownLaborCost, margin, pct, completeness, reasons, lossMaking) => ({
  mandateId: id, projectId, projectName: MANDATE_NAMES[projectId][1], clientName: MANDATE_NAMES[projectId][0],
  soldAmount, soldCurrency, soldAt: soldAmount ? '2026-09-01' : null, knownLaborCost, coveredTimeEntries: completeness === 'COMPLETE' ? 5 : 3, totalTimeEntries: 5,
  completeness, incompleteReasons: reasons, contributionMargin: margin, contributionMarginPercent: pct, lossMaking,
});
// Cas déclencheur d'un défaut de main : un mandat SANS devise de vente. Le service regroupe alors les totaux sous la clé « UNKNOWN » et la page
// appelle Intl.NumberFormat avec cette devise (RangeError : Invalid currency code), ce qui fait planter tout l'écran financier.
//  BENCH_FINANCIAL_UNKNOWN_CURRENCY=1 : reproduit ce cas (scénarios « known-defect-… »). Par défaut, aucun mandat sans devise.
const UNKNOWN_CURRENCY = process.env.BENCH_FINANCIAL_UNKNOWN_CURRENCY === '1';
const FINANCIAL_MANDATES = [
  FM('m1', 'p1', '4200.00', 'CAD', '1850.00', '2350.00', '55.95', 'COMPLETE', [], false),
  UNKNOWN_CURRENCY
    ? FM('m3', 'p3', null, null, '800.00', null, null, 'INCOMPLETE', ['MISSING_SOLD_AMOUNT', 'MISSING_SOLD_CURRENCY'], null)
    : FM('m3', 'p3', null, 'CAD', '800.00', null, null, 'INCOMPLETE', ['MISSING_SOLD_AMOUNT'], null),
  FM('m4', 'p4', '1000.00', 'CAD', '1500.00', '-500.00', '-50.00', 'COMPLETE', [], true),
  FM('m5', 'p5', '3000.00', 'USD', '1000.00', '2000.00', '66.67', 'COMPLETE', [], false),
  FM('m2', 'p2', '2600.00', 'CAD', '1200.00', '1400.00', '53.85', 'COMPLETE', [], false),
  FM('m6', 'p6', '500.00', 'CAD', '900.00', null, null, 'INCOMPLETE', ['MISSING_ADVISOR_COST_RATE', 'PARTIAL_LABOR_COST'], null),
];
const FINANCIAL_TOTALS = UNKNOWN_CURRENCY ? [
  { currency: 'CAD', soldAmount: '8300.00', knownLaborCost: '5450.00', contributionMargin: '3250.00', completeMandates: 3, incompleteMandates: 1, uniqueLossMakingMandates: 1 },
  { currency: 'UNKNOWN', soldAmount: '0.00', knownLaborCost: '800.00', contributionMargin: '0.00', completeMandates: 0, incompleteMandates: 1, uniqueLossMakingMandates: 0 },
  { currency: 'USD', soldAmount: '3000.00', knownLaborCost: '1000.00', contributionMargin: '2000.00', completeMandates: 1, incompleteMandates: 0, uniqueLossMakingMandates: 0 },
] : [
  { currency: 'CAD', soldAmount: '8300.00', knownLaborCost: '6250.00', contributionMargin: '3250.00', completeMandates: 3, incompleteMandates: 2, uniqueLossMakingMandates: 1 },
  { currency: 'USD', soldAmount: '3000.00', knownLaborCost: '1000.00', contributionMargin: '2000.00', completeMandates: 1, incompleteMandates: 0, uniqueLossMakingMandates: 0 },
];

function financialBody(url) {
  const q = new URL(url, 'http://bench').searchParams;
  const scope = { view: q.get('view') || 'cumulative', from: q.get('from'), to: q.get('to'), asOf: q.get('asOf'), timeZone: TIME_ZONE, upperBoundExclusive: null };
  if (process.env.BENCH_RENDEMENT !== '1') return { scope, mandates: [], totals: [] };
  return { scope, mandates: FINANCIAL_MANDATES, totals: FINANCIAL_TOTALS };
}

// ───────── Comptes de test LOCAUX et portée par rôle (Phase 10B, étendue en 11D) ─────────
//  Servent uniquement à AUTO-TESTER les scripts de permissions (bench/preprod-permissions.cjs) et à simuler un rôle sans backend : ils
//  reproduisent le contrat DOCUMENTÉ de main (opérationnel : un non-admin est limité à ses données ; financier : administrateurs seulement).
//  Ce n'est PAS le backend : ils ne prouvent rien sur le vrai serveur. Mots de passe fictifs, valables ici seulement.
//  BENCH_STRICT_AUTH=1    : jeton valide exigé (401 sinon) sur /rendement*, /auth/me, /users/me, et identifiants vérifiés à la connexion.
//  BENCH_LEAK_RENDEMENT=1 : supprime les restrictions par rôle (opérationnel non filtré ET financier ouvert) : le harnais DOIT alors échouer.
//  Jetons : `bench-token:<id>` (comptes ci-dessous), `bench-token:role:<RÔLE>` (rôle simulé pour la session du pilote : /users/me le respecte,
//  comme le fait le backend de main, dont initAuth remplace l'utilisateur stocké par la réponse de /users/me), `bench-token` (historique : SUPER_ADMIN).
const ACCOUNTS = {
  'conseiller@bench.test': { id: 'u1', email: 'conseiller@bench.test', firstName: 'Sophie', lastName: 'Martin', role: 'CONSEILLER', organizationId: 'bench-org' },
  'admin@bench.test': { id: 'bench-admin', email: 'admin@bench.test', firstName: 'Alex', lastName: 'Admin', role: 'ADMIN', organizationId: 'bench-org' },
  'super@bench.test': { id: 'bench-super', email: 'super@bench.test', firstName: 'Sam', lastName: 'Super', role: 'SUPER_ADMIN', organizationId: 'bench-org' },
};
const BENCH_PASSWORD = 'bench-only';
const strictAuth = process.env.BENCH_STRICT_AUTH === '1';
const leak = process.env.BENCH_LEAK_RENDEMENT === '1';
const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];
const accountByToken = (header) => {
  const simulated = /^Bearer bench-token:role:(CONSEILLER|ADMIN|SUPER_ADMIN)$/.exec(header || '');
  if (simulated) return { ...user, role: simulated[1] };
  const m = /^Bearer bench-token:(.+)$/.exec(header || '');
  return m ? Object.values(ACCOUNTS).find((a) => a.id === m[1]) || null : null;
};
function scopeOperational(body, account, queryUserId) {
  const effective = ADMIN_ROLES.includes(account.role) ? (queryUserId || undefined) : account.id;
  if (!effective || leak) return body;
  return { ...body, advisors: body.advisors.filter((a) => a.userId === effective) };
}
const readBody = (req) => new Promise((resolve) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch { resolve({}); } }); });
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
const RENDEMENT_ROUTES = ['/api/rendement', '/api/rendement/operational', '/api/rendement/financial'];

http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', '*'); res.setHeader('Access-Control-Allow-Methods', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const route = req.url.split('?')[0];
  if (req.method === 'POST' && route === '/api/auth/login') {
    const credentials = await readBody(req);
    const account = ACCOUNTS[String(credentials.email || '').toLowerCase()];
    if (account && credentials.password === BENCH_PASSWORD) return json(res, 200, { user: account, access_token: `bench-token:${account.id}`, refresh_token: 'bench-refresh' });
    if (strictAuth) return json(res, 401, { message: 'bench: identifiants invalides' });
    return json(res, 200, { user, access_token: 'bench-token', refresh_token: 'bench-refresh' });
  }
  const caller = accountByToken(req.headers.authorization);
  if (strictAuth && [...RENDEMENT_ROUTES, '/api/auth/me', '/api/users/me'].includes(route) && !caller) return json(res, 401, { message: 'bench: jeton requis' });
  if (caller && (route === '/api/auth/me' || route === '/api/users/me')) return json(res, 200, caller);
  const act = route.match(/^\/api\/projects\/(p\d+)\/activities$/);
  if (act) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(process.env.BENCH_ACTIVITIES === '1' ? (ACTIVITIES[act[1]] || []) : [])); }
  if (route === '/api/clients' && process.env.BENCH_FAIL_CLIENTS === '1') { res.writeHead(500, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ message: 'bench: erreur simulée' })); }
  if (route === '/api/clients' && delay) return setTimeout(() => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(routes[route])); }, delay);
  if (RENDEMENT_ROUTES.includes(route)) {
    if (process.env.BENCH_FAIL_RENDEMENT === '1') return json(res, 500, { message: 'bench: erreur simulée' });
    const financial = route === '/api/rendement/financial';
    if (financial && caller && !ADMIN_ROLES.includes(caller.role) && !leak) return json(res, 403, { message: 'bench: réservé aux administrateurs' });
    const send = () => {
      if (financial) return json(res, 200, financialBody(req.url));
      const full = operationalBody(req.url);
      const queryUserId = new URL(req.url, 'http://bench').searchParams.get('userId') || '';
      json(res, 200, caller ? scopeOperational(full, caller, queryUserId) : full);
    };
    return delay ? setTimeout(send, delay) : send();
  }
  const body = routes[route];
  res.writeHead(body === undefined ? 404 : 200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body === undefined ? { message: 'bench: route non simulée' } : body));
}).listen(PORT, () => console.log(`faux API de test sur :${PORT}`));
