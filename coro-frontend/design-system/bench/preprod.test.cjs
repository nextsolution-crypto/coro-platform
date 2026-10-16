/* eslint-disable @typescript-eslint/no-require-imports */
// Tests des outils de préproduction (Phase 10B) : garde anti-production, comptes, permissions (auto-test contre le faux API),
// plan de campagne vs registre réel des scénarios, matrice de validation et document PREPROD.md. Aucun navigateur requis.
require('../test-loader.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const perm = require('./preprod-permissions.cjs');
const campaign = require('./campaign.cjs');
const matrix = require('./validation-matrix.cjs');
const beta = require('./beta-routes-check.cjs');
const doc = fs.readFileSync(path.join(ROOT, 'design-system', 'PREPROD.md'), 'utf8').replace(/\r\n/g, '\n');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ───────── Garde anti-production ─────────
test('hostPolicy : tout hôte de production est refusé, même déclaré dans PREPROD_ALLOWED_HOSTS', () => {
  const env = { PREPROD_ALLOWED_HOSTS: 'app.getcoro.io,api.getcoro.io,getcoro.io,client.getcoro.io,www.getcoro.io' };
  for (const host of ['https://app.getcoro.io', 'https://api.getcoro.io/api', 'https://client.getcoro.io', 'https://getcoro.io', 'https://www.getcoro.io', 'https://x.y.getcoro.io', 'https://APP.GETCORO.IO']) {
    const r = perm.hostPolicy(host, env); assert.equal(r.allowed, false, host); assert.match(r.reason, /PRODUCTION/, host);
  }
  assert.equal(perm.hostPolicy('https://notgetcoro.io', {}).allowed, false, 'domaine voisin non déclaré : refusé par défaut');
});

test('hostPolicy : hôtes locaux autorisés, hôtes distants seulement s’ils sont déclarés et en https', () => {
  for (const host of ['http://localhost:3010', 'http://127.0.0.1:3012/api', 'http://app.localhost:3000', 'http://preprod.test']) assert.equal(perm.hostPolicy(host, {}).allowed, true, host);
  assert.equal(perm.hostPolicy('https://preprod.example.org', {}).allowed, false);
  assert.equal(perm.hostPolicy('https://preprod.example.org', { PREPROD_ALLOWED_HOSTS: 'preprod.example.org' }).allowed, true);
  assert.equal(perm.hostPolicy('http://preprod.example.org', { PREPROD_ALLOWED_HOSTS: 'preprod.example.org' }).allowed, false, 'http distant refusé');
  assert.equal(perm.hostPolicy('ftp://localhost', {}).allowed, false);
  assert.equal(perm.hostPolicy('pas une url', {}).allowed, false);
});

// ───────── Comptes et secrets ─────────
test('loadAccounts : identifiants lus dans l’environnement seulement ; jeton prioritaire ; rôles manquants signalés', () => {
  const env = { PREPROD_CONSEILLER_EMAIL: 'a@x.test', PREPROD_CONSEILLER_PASSWORD: 'p', PREPROD_ADMIN_TOKEN: 't', PREPROD_ADMIN_EMAIL: 'b@x.test', PREPROD_ADMIN_PASSWORD: 'q' };
  const { accounts, missing } = perm.loadAccounts(env);
  assert.deepEqual(accounts.CONSEILLER, { email: 'a@x.test', password: 'p' });
  assert.deepEqual(accounts.ADMIN, { token: 't' });
  assert.deepEqual(missing, ['SUPER_ADMIN']);
  assert.deepEqual(perm.loadAccounts({}).missing, perm.ROLES);
});

test('aucun secret dans les outils : pas d’identifiant en dur (hors comptes fictifs du faux API), une seule écriture disque (--out)', () => {
  for (const file of ['preprod-permissions.cjs', 'campaign.cjs', 'beta-routes-check.cjs', 'validation-matrix.cjs']) {
    const src = fs.readFileSync(path.join(__dirname, file), 'utf8');
    assert.ok(!/@getcoro\.io|getcoro\.io\/api|password\s*[:=]\s*['"](?!bench-only)[^'"]{3,}['"]/i.test(src.replace(/PRODUCTION_DOMAINS = \['getcoro\.io'\]/, '')), file + ' : identifiant ou mot de passe en dur');
  }
  const permSrc = fs.readFileSync(path.join(__dirname, 'preprod-permissions.cjs'), 'utf8');
  assert.equal((permSrc.match(/writeFileSync/g) || []).length, 1, 'seule écriture : le rapport --out');
  assert.ok(!/localStorage\.setItem\([^)]*password/i.test(permSrc));
  // Le rapport (résultats) ne doit contenir ni courriel, ni mot de passe, ni jeton : vérifié plus bas sur une exécution réelle.
});

// ───────── Permissions : auto-test du harnais contre le faux API local ─────────
async function withMock(port, env, fn) {
  const child = spawn(process.execPath, [path.join(__dirname, 'mock-api.cjs')], { env: { ...process.env, BENCH_API_PORT: String(port), BENCH_STRICT_AUTH: '1', BENCH_RENDEMENT: '1', ...env }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 40; i++) { try { const r = await fetch(`http://localhost:${port}/api/clients`); if (r.ok) break; } catch { /* pas encore prêt */ } await sleep(250); }
    return await fn(`http://localhost:${port}/api`);
  } finally { child.kill(); await sleep(300); }
}
const FAKE = { PREPROD_CONSEILLER_EMAIL: 'conseiller@bench.test', PREPROD_CONSEILLER_PASSWORD: 'bench-only', PREPROD_ADMIN_EMAIL: 'admin@bench.test', PREPROD_ADMIN_PASSWORD: 'bench-only', PREPROD_SUPER_ADMIN_EMAIL: 'super@bench.test', PREPROD_SUPER_ADMIN_PASSWORD: 'bench-only' };
const range = { from: '2026-10-01', to: '2026-10-31' };

test('permissions : backend conforme au contrat documenté → tous les contrôles exécutables passent, le rapport ne fuit aucun secret', async () => {
  await withMock(3141, {}, async (api) => {
    const { accounts } = perm.loadAccounts(FAKE);
    const { sessions, notes } = await perm.openSessions(api, accounts);
    assert.deepEqual(Object.keys(sessions).sort(), ['ADMIN', 'CONSEILLER', 'SUPER_ADMIN'], notes.join(' | '));
    const results = await perm.runApiChecks({ api, sessions, ...range });
    const byId = Object.fromEntries(results.map((r) => [r.id, r]));
    for (const id of ['PERM-API-01', 'PERM-API-02', 'PERM-API-03', 'PERM-API-04', 'PERM-API-05', 'PERM-API-06', 'PERM-API-07', 'PERM-API-08', 'PERM-API-09', 'PERM-API-10', 'PERM-API-11', 'PERM-API-12', 'PERM-API-13']) assert.equal(byId[id].status, 'ok', `${id} : ${byId[id].detail}`);
    assert.equal(byId['PERM-API-14'].status, 'skip', 'sans PREPROD_OTHER_ORG_USER_ID : non exécuté, jamais « ok »');
    assert.equal(byId['PERM-API-15'].status, 'info');
    const dump = JSON.stringify(results);
    for (const secret of ['bench-only', '@bench.test', 'bench-token', 'bench-refresh']) assert.ok(!dump.includes(secret), 'le rapport contient : ' + secret);
  });
});

test('permissions : backend défaillant (restriction par rôle supprimée) → le harnais ÉCHOUE sur le périmètre du conseiller', async () => {
  await withMock(3142, { BENCH_LEAK_RENDEMENT: '1' }, async (api) => {
    const { accounts } = perm.loadAccounts(FAKE);
    const { sessions } = await perm.openSessions(api, accounts);
    const byId = Object.fromEntries((await perm.runApiChecks({ api, sessions, ...range })).map((r) => [r.id, r]));
    assert.equal(byId['PERM-API-04'].status, 'ko', 'un conseiller recevant les données de toute l’équipe doit être détecté');
    assert.equal(byId['PERM-API-06'].status, 'ko', 'userId étranger accepté pour un conseiller : à détecter');
    assert.equal(byId['PERM-API-07'].status, 'ko', 'financier ouvert à un conseiller : à détecter');
    assert.equal(byId['PERM-API-09'].status, 'ko', 'ancien chemin /rendement non filtré : à détecter');
  });
});

test('permissions : identifiants invalides ou rôle absent → session non ouverte, contrôles « non exécutés » (jamais « ok »)', async () => {
  await withMock(3143, {}, async (api) => {
    const { sessions, notes } = await perm.openSessions(api, { CONSEILLER: { email: 'conseiller@bench.test', password: 'mauvais' } });
    assert.deepEqual(sessions, {}); assert.match(notes.join(' '), /connexion refusée/);
    const results = await perm.runApiChecks({ api, sessions, ...range });
    assert.ok(results.filter((r) => !['PERM-API-01', 'PERM-API-02', 'PERM-API-03'].includes(r.id)).every((r) => r.status === 'skip'), JSON.stringify(results.map((r) => [r.id, r.status])));
  });
});

// ───────── Campagne ─────────
test('campagne : le plan couvre TOUS les scénarios enregistrés du Lot 1 et ne référence aucun scénario inexistant', () => {
  const registered = new Set(require('./scenarios.cjs').map((s) => s.name));
  const plan = campaign.buildPlan({ registered });
  const planned = new Set(plan.flatMap((g) => g.names));
  for (const name of planned) assert.ok(registered.has(name), 'scénario inconnu : ' + name);
  const lot1 = [...registered].filter((n) => /^(settings|portfolio|rendement-op|rendement-fin)-/.test(n));
  const missing = lot1.filter((n) => !planned.has(n));
  assert.deepEqual(missing, [], 'scénarios du Lot 1 absents du plan : ' + missing.join(', '));
  assert.ok(planned.size >= 118, 'au moins 118 scénarios attendus, trouvés : ' + planned.size);
});

test('campagne : états, variables du faux API et pages sont cohérents avec le faux API', () => {
  assert.deepEqual(Object.keys(campaign.PAGES).sort(), ['portfolio', 'rendement-fin', 'rendement-op', 'settings']);
  for (const [key, p] of Object.entries(campaign.PAGES)) assert.equal(p.beta, ['portfolio', 'settings'].includes(key), `${key} : seules /settings et /activities/portfolio sont bêta`);
  const plan = campaign.buildPlan({});
  const env = (page, state) => plan.find((g) => g.page === page && g.state === state).env;
  assert.deepEqual(env('rendement-fin', 'data'), { BENCH_RENDEMENT: '1' });
  assert.deepEqual(env('rendement-fin', 'error'), { BENCH_FAIL_RENDEMENT: '1' });
  assert.deepEqual(env('portfolio', 'error'), { BENCH_FAIL_CLIENTS: '1' });
  assert.deepEqual(env('rendement-op', 'loading'), { BENCH_DELAY_MS: '20000' });
  const mock = fs.readFileSync(path.join(__dirname, 'mock-api.cjs'), 'utf8');
  for (const variable of ['BENCH_RENDEMENT', 'BENCH_FAIL_RENDEMENT', 'BENCH_FAIL_CLIENTS', 'BENCH_DELAY_MS', 'BENCH_ACTIVITIES']) assert.ok(mock.includes(variable), variable);
  assert.throws(() => campaign.buildPlan({ pages: ['inconnue'] }), /page inconnue/);
});

test('campagne : les modes restreints produisent des noms de scénarios restreints (build avec jeton : sans « island »)', () => {
  const names = campaign.buildPlan({ pages: ['portfolio'], modes: ['legacy', 'glass-dark', 'glass-light'] }).flatMap((g) => g.names);
  assert.ok(names.length > 0 && names.every((n) => !n.endsWith('-island')));
});

// ───────── Vérification des routes bêta ─────────
test('beta-routes-check : attentes — sans jeton les 2 routes bêta restent Legacy ; avec jeton elles sont Glass seulement pour la préférence Glass ; le rendement reste Legacy', () => {
  const off = beta.expectations('off'); const on = beta.expectations('on');
  assert.deepEqual(beta.BETA_ROUTES, ['/settings', '/activities/portfolio']);
  for (const r of ['/profile/rendement', '/dashboard/rendement']) assert.ok(beta.CONTROL_ROUTES.includes(r), r + ' : route de contrôle (toujours Legacy)');
  assert.ok(off.every((r) => r.expected === 'legacy'));
  assert.deepEqual(on.filter((r) => r.expected === 'glass').map((r) => `${r.route}|${r.ui}`).sort(), beta.BETA_ROUTES.map((r) => `${r}|glass`).sort());
  assert.ok(on.filter((r) => beta.CONTROL_ROUTES.includes(r.route)).every((r) => r.expected === 'legacy'), 'routes de contrôle toujours Legacy');
  // Cohérence avec le registre réel : ce sont exactement les routes bêta.
  const { ROUTE_REGISTRY } = require('../routes/route-registry.ts');
  assert.deepEqual(ROUTE_REGISTRY.filter((e) => e.status === 'beta').map((e) => e.pattern).sort(), [...beta.BETA_ROUTES].sort());
  for (const c of beta.CONTROL_ROUTES) assert.equal(ROUTE_REGISTRY.find((e) => e.pattern === c).status, 'legacy-only', c);
});

// ───────── Matrice et document ─────────
test('matrice : identifiants uniques et continus, champs complets, rôles et routes valides, chaque domaine demandé couvert', () => {
  const ids = matrix.MATRIX.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, ids.map((_, i) => `M-${String(i + 1).padStart(2, '0')}`), 'numérotation continue');
  for (const m of matrix.MATRIX) {
    for (const key of ['domain', 'check', 'roles', 'routes', 'mode', 'tool', 'criterion']) assert.ok(m[key] && String(m[key]).trim(), `${m.id}.${key}`);
    assert.ok(['auto', 'manuel', 'mixte'].includes(m.mode), m.id);
    assert.ok(m.roles === '—' || m.roles.split(' ').every((r) => ['C', 'A', 'S'].includes(r)), m.id);
    assert.ok(m.routes === '—' || m.routes.split(' ').every((r) => matrix.ROUTE_NAMES[r]), m.id);
  }
  const domains = new Set(matrix.MATRIX.map((m) => m.domain));
  for (const d of ['Permissions', 'Accès direct', 'Données financières', 'Navigation', 'Périodes', 'Tableaux', 'Responsive', 'Clavier', 'Lecteur d’écran', 'Bêta', 'Production', 'Retour arrière']) assert.ok(domains.has(d), 'domaine manquant : ' + d);
  for (const role of ['C', 'A', 'S']) assert.ok(matrix.MATRIX.some((m) => m.roles.split(' ').includes(role)), 'rôle non couvert : ' + role);
  for (const route of Object.keys(matrix.ROUTE_NAMES)) assert.ok(matrix.MATRIX.some((m) => m.routes.split(' ').includes(route)), 'route non couverte : ' + route);
});

test('matrice : chaque contrôle automatique de l’API et chaque famille de contrôles navigateur est référencé', () => {
  const tools = matrix.MATRIX.map((m) => m.tool).join(' | ');
  for (const id of ['PERM-API-01', 'PERM-API-04', 'PERM-API-07', 'PERM-API-08', 'PERM-API-14', 'PERM-BRW-01', 'PERM-BRW-03', 'PERM-BRW-04', 'PERM-BRW-05', 'PERM-BRW-06', 'PERM-BRW-07']) assert.ok(tools.includes(id), id);
  assert.deepEqual(perm.API_CHECKS.map((c) => c.id), Array.from({ length: 15 }, (_, i) => `PERM-API-${String(i + 1).padStart(2, '0')}`));
});

test('PREPROD.md : contient la matrice générée (sans dérive), toutes les sections demandées et aucun secret', () => {
  assert.ok(doc.includes(matrix.toMarkdown()), 'la matrice du document diffère de validation-matrix.cjs : relancer `node design-system/bench/validation-matrix.cjs --markdown`');
  for (const heading of ['Matrice de validation', 'Environnement de préproduction', 'Tests de permissions', 'Campagne reproductible', 'Build de test', 'Plan de retour arrière', 'Critères Go / No-Go', 'Pull Request', 'Points à transmettre à Codex']) assert.ok(doc.includes(heading), 'section manquante : ' + heading);
  for (const cmd of ['glass:campaign', 'glass:preprod-permissions', 'glass:preprod-build', 'glass:verify-production']) assert.ok(doc.includes(cmd), cmd);
  assert.ok(!/_PASSWORD=[^<\s][^\s]*/.test(doc), 'aucun mot de passe littéral dans le document (utiliser des <valeurs> de substitution)');
  assert.ok(!/eyJ[A-Za-z0-9_-]{10,}/.test(doc), 'aucun jeton');
});

test('package.json : scripts de préproduction nommés glass:*, aucun dans build/start/dev, test dans la chaîne design-system', () => {
  const scripts = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts;
  for (const name of ['glass:campaign', 'glass:preprod-permissions', 'glass:preprod-build']) assert.ok(scripts[name], name);
  for (const name of ['build', 'start', 'dev']) assert.ok(!/bench|preprod|campaign/.test(scripts[name]), name);
  assert.match(scripts['test:design-system'], /bench\/preprod\.test\.cjs/);
});

// ───────── Rendement : pages de main conservées, aucune vue Glass, aucun ancien modèle ─────────
test('rendement : /profile/rendement et /dashboard/rendement restent les pages de main (contrats operational / financial), sans vue Glass ni ancien modèle', () => {
  const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
  const op = read('app/profile/rendement/page.tsx'); const fin = read('app/dashboard/rendement/page.tsx');
  assert.match(op, /\/rendement\/operational/); assert.doesNotMatch(op, /\/rendement\/financial|soldAmount|knownLaborCost|contributionMargin/, 'la page personnelle n’affiche aucune donnée financière');
  assert.match(fin, /\/rendement\/financial/); assert.match(fin, /SUPER_ADMIN/); assert.match(fin, /router\.replace\("\/profile\/rendement"\)/, 'garde de rôle : redirection d’un non-administrateur');
  for (const [name, source] of [['profile', op], ['dashboard', fin]]) {
    assert.doesNotMatch(source, /GLASS:begin|GLASS:end|useTheme|RendementGlassView|RendementEquipeGlassView|design-system/, name + ' : aucun bloc ni vue Glass');
    assert.doesNotMatch(source, /conseillers|teamStats|heuresTotal|revenusTotal|montantVendu|mandatsList|heuresBudgetees/, name + ' : aucun vestige de l’ancien modèle');
  }
  for (const gone of ['app/profile/rendement/RendementGlassView.tsx', 'app/profile/rendement/rendement-glass.contract.test.cjs', 'app/dashboard/rendement/RendementEquipeGlassView.tsx', 'app/dashboard/rendement/rendement-equipe-glass.contract.test.cjs', 'design-system/bench/scenarios-rendement-equipe.cjs'])
    assert.ok(!fs.existsSync(path.join(ROOT, gone)), 'fichier de l’ancien modèle encore présent : ' + gone);
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts;
  assert.ok(!Object.keys(pkg).some((k) => /rendement.*glass|glass.*rendement/.test(k)) && !/rendement-(equipe-)?glass/.test(JSON.stringify(pkg)), 'aucun script npm de l’ancienne vue Glass de rendement');
  const mock = fs.readFileSync(path.join(__dirname, 'mock-api.cjs'), 'utf8');
  for (const needle of ['/api/rendement/operational', '/api/rendement/financial', 'advisors', 'knownLaborCost', 'contributionMarginPercent']) assert.ok(mock.includes(needle), 'le faux API ne reproduit pas le contrat : ' + needle);
  assert.ok(!/teamStats|heuresTotal|conseillers/.test(mock), 'le faux API ne renvoie plus l’ancien modèle');
});

test('PREPROD.md : décrit le modèle actuel (operational / financial, workflow manuel, images par digest) et aucune affirmation périmée', () => {
  for (const needle of ['/rendement/operational', '/rendement/financial', 'workflow_dispatch', 'DEPLOY_PRODUCTION', 'digest', 'legacy-only']) assert.ok(doc.includes(needle), 'PREPROD.md ne mentionne pas : ' + needle);
  assert.ok(!/Seule l.étiquette`? ?`?:latest/i.test(doc) && !/tout push vers `main` \*\*déploie|Fusionner dans `main` équivaut donc à déployer/.test(doc), 'affirmation périmée sur le déploiement automatique');
  assert.ok(!/teamStats|revenusTotal|conseillers\[0\]/.test(doc.replace(/ancien (modèle|chemin)[^\n]*/gi, '')), 'vocabulaire de l’ancien modèle hors mentions explicites');
});
