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
  '/api/projects/pending-approval': [],
  '/api/activities/recurring-to-renew': [],
  '/api/activities/upcoming': [],
  '/api/notifications/mandate-delays': [],
  '/api/notifications/unread-count': { count: 3 },
  '/api/notifications': [],
  '/api/clients': [{ id: 'c1', name: 'Organisation Démo A', city: 'Montréal' }, { id: 'c2', name: 'Organisation Démo B', city: 'Québec' }],
  '/api/users/me': user, '/api/auth/me': user,
};

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', '*'); res.setHeader('Access-Control-Allow-Methods', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const route = req.url.split('?')[0];
  if (req.method === 'POST' && route === '/api/auth/login') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ user, access_token: 'bench-token', refresh_token: 'bench-refresh' }));
  }
  const body = routes[route];
  res.writeHead(body === undefined ? 404 : 200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body === undefined ? { message: 'bench: route non simulée' } : body));
}).listen(PORT, () => console.log(`faux API de test sur :${PORT}`));
