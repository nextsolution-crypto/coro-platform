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

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', '*'); res.setHeader('Access-Control-Allow-Methods', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const route = req.url.split('?')[0];
  if (req.method === 'POST' && route === '/api/auth/login') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ user, access_token: 'bench-token', refresh_token: 'bench-refresh' }));
  }
  const act = route.match(/^\/api\/projects\/(p\d+)\/activities$/);
  if (act) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(process.env.BENCH_ACTIVITIES === '1' ? (ACTIVITIES[act[1]] || []) : [])); }
  if (route === '/api/clients' && process.env.BENCH_FAIL_CLIENTS === '1') { res.writeHead(500, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ message: 'bench: erreur simulée' })); }
  if (route === '/api/clients' && delay) return setTimeout(() => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(routes[route])); }, delay);
  const body = routes[route];
  res.writeHead(body === undefined ? 404 : 200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body === undefined ? { message: 'bench: route non simulée' } : body));
}).listen(PORT, () => console.log(`faux API de test sur :${PORT}`));
