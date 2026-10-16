/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Banc de validation Liquid Glass — couche navigateur.
 * Pilote un Chrome réel (headless) via le protocole DevTools. Aucune dépendance : WebSocket natif de Node 22.
 * Variables d'environnement : CHROME_PATH, BENCH_BASE_URL (défaut http://localhost:3010), BENCH_API_PORT (défaut 3002).
 * BENCH_TMPDIR : dossier parent des profils Chrome jetables (défaut : répertoire temporaire du système) ; chaque profil est supprimé à la fermeture, à la sortie et à l'interruption.
 */
const { spawn, spawnSync } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BENCH_BASE_URL || 'http://localhost:3010';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getJson(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({ host: u.hostname, port: u.port, path: u.pathname + u.search, method }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(body); } });
    });
    req.on('error', reject);
    req.end();
  });
}

/** Viewports normalisés du banc. */
const VIEWPORTS = {
  320: { width: 320, height: 640, deviceScaleFactor: 2, mobile: true },
  390: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
  768: { width: 768, height: 1024, deviceScaleFactor: 2, mobile: true },
  1600: { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false },
};

/**
 * Répertoire parent des profils jetables : BENCH_TMPDIR si défini (p. ex. D:\CORO-Workspace\temp), sinon le répertoire temporaire du système.
 * Ne jamais y placer autre chose que des profils créés par ce module : seuls les dossiers « cg-bench-* » créés par l'exécution courante sont supprimés.
 */
function profileBase() { return process.env.BENCH_TMPDIR || os.tmpdir(); }

/** Instances Chrome lancées par CE processus (seules concernées par le nettoyage de sortie). */
const LIVE = new Set();

/**
 * Arrête Chrome. Le processus lancé par spawn() est un lanceur qui peut se terminer après avoir démarré le vrai navigateur (re-parentage) :
 * tuer son arbre ne suffit pas (mesuré : profils verrouillés et Chrome orphelins). On arrête donc aussi, par ligne de commande, les processus
 * qui référencent le profil unique créé par CETTE exécution (« cg-bench-XXXXXX ») : jamais d'autre processus Chrome. Synchrone (sortie du processus).
 */
function killTree(proc, dir) {
  const name = dir ? path.basename(dir) : '';
  try {
    if (proc && proc.pid && process.platform === 'win32') spawnSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    else if (proc && proc.pid) process.kill(proc.pid, 'SIGKILL');
  } catch { /* déjà arrêté */ }
  if (!/^cg-bench-[A-Za-z0-9]+$/.test(name)) return;
  try {
    if (process.platform === 'win32') {
      const ps = "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like ('*' + $env:CG_BENCH_PROFILE + '*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
      spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { stdio: 'ignore', windowsHide: true, env: { ...process.env, CG_BENCH_PROFILE: name } });
    } else spawnSync('pkill', ['-9', '-f', name], { stdio: 'ignore' });
  } catch { /* ignoré */ }
}

/** Supprime le profil de cette instance (uniquement s'il a été créé par elle) ; réessaie tant que Chrome libère ses verrous. */
function removeProfile(inst, attempts = 20) {
  const dir = inst.dir;
  if (!dir || !path.basename(dir).startsWith('cg-bench-') || path.dirname(dir) !== inst.base) return false;
  for (let i = 0; i < attempts; i++) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* verrou : nouvel essai */ }
    if (!fs.existsSync(dir)) return true;
    try { spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},150)'], { stdio: 'ignore' }); } catch { /* ignoré */ }
  }
  return !fs.existsSync(dir);
}

/** Nettoyage synchrone d'une instance : processus puis profil. Idempotent. */
function disposeSync(inst) {
  if (inst.disposed) return;
  inst.disposed = true;
  killTree(inst.proc, inst.dir);
  removeProfile(inst);
  LIVE.delete(inst);
}

let hooksInstalled = false;
function installExitHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;
  // Sortie normale, process.exit() ou exception non gérée : l'événement « exit » est toujours émis.
  process.on('exit', () => { for (const inst of [...LIVE]) disposeSync(inst); });
  // Interruption contrôlée (Ctrl+C, arrêt demandé) : nettoyer puis quitter avec le code conventionnel.
  for (const [sig, code] of [['SIGINT', 130], ['SIGTERM', 143], ['SIGBREAK', 149]]) {
    try { process.on(sig, () => { for (const inst of [...LIVE]) disposeSync(inst); process.exit(code); }); } catch { /* signal non pris en charge */ }
  }
}

/** Lance Chrome avec un profil jetable ; renvoie { close(), port, dir, pid }. Le profil et tous les processus sont supprimés par close(), à la sortie, ou à l'interruption. */
async function launch() {
  const port = 9300 + Math.floor(Math.random() * 600);
  const base = profileBase();
  fs.mkdirSync(base, { recursive: true });
  const dir = fs.mkdtempSync(path.join(base, 'cg-bench-'));
  const proc = spawn(CHROME, [`--headless=new`, `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`,
    '--hide-scrollbars', '--no-first-run', '--disable-gpu-vsync', 'about:blank'], { stdio: 'ignore', windowsHide: true });
  const inst = { proc, dir, base, disposed: false };
  let spawnError = null; proc.on('error', (e) => { spawnError = e; });
  LIVE.add(inst);
  installExitHooks();
  try {
    let ready = false;
    for (let i = 0; i < 60 && !ready && !spawnError; i++) { try { await getJson(`http://127.0.0.1:${port}/json/version`); ready = true; } catch { await sleep(250); } }
    if (!ready) throw new Error(spawnError ? `Chrome n'a pas pu démarrer : ${spawnError.message}` : `Chrome n'a pas répondu sur le port ${port}`);
  } catch (e) { disposeSync(inst); throw e; }
  return {
    port, dir, pid: proc.pid,
    async close() { disposeSync(inst); },
  };
}

/** Ouvre un onglet et renvoie une session { send, eval, key, click, goto, ... }. */
async function openSession(port, { ui, theme, viewport, colorScheme = 'light', width, beta = false, role = 'SUPER_ADMIN' }) {
  const target = await getJson(`http://127.0.0.1:${port}/json/new?about:blank`, 'PUT');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => (ws.onopen = resolve));
  let id = 0; const pending = new Map(); const consoleErrors = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); return; }
    if (d.method === 'Runtime.exceptionThrown') consoleErrors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
  };
  const send = (method, params = {}) => new Promise((resolve) => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable'); await send('Runtime.enable');
  // Sans cela, un onglet ouvert en arrière-plan peut ne recevoir aucun événement clavier (mesuré) : le clavier doit être fiable.
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Page.bringToFront');
  const vp = viewport ? VIEWPORTS[viewport] : { width: width || 1600, height: 900, deviceScaleFactor: 1, mobile: false };
  await send('Emulation.setDeviceMetricsOverride', vp);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: colorScheme }] });
  // Le jeton porte le rôle simulé (« bench-token:role:<RÔLE> ») : le faux API le respecte dans /users/me, comme le backend de main, dont
  // initAuth remplace l'utilisateur stocké par la réponse du serveur. Sans cela, un rôle semé dans le stockage serait écrasé.
  // Préférences et session factice posées avant tout script de l'application (déterminisme : le résultat ne dépend
  // ni de l'ordre des routes ni d'une connexion antérieure partagée par le profil Chrome). Faux API local uniquement.
  const fakeUser = { id: 'bench-user', email: 'bench@example.test', firstName: 'Alex', lastName: 'Démo', role, organizationId: 'bench-org' };
  const seed = `try{` +
    `var u=${JSON.stringify(JSON.stringify(fakeUser))};` +
    `localStorage.setItem('coro_token','bench-token:role:${role}');localStorage.setItem('coro_user',u);` +
    `sessionStorage.setItem('coro_token','bench-token:role:${role}');sessionStorage.setItem('coro_user',u);` +
    (ui ? `localStorage.setItem('coro-ui-generation','${ui}');` : '') +
    (theme ? `localStorage.setItem('coro-theme-preference','${theme}');` : '') +
    (beta ? `localStorage.setItem('coro-glass-beta','on');` : '') +
    `}catch(e){}`;
  await send('Page.addScriptToEvaluateOnNewDocument', { source: seed });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'erreur Runtime.evaluate');
    return r.result?.result?.value;
  };
  const session = {
    send, eval: evaluate, consoleErrors, viewport: vp,
    async key(key, code, vk, shift = false) {
      const modifiers = shift ? 8 : 0;
      // Entrée et Espace activent un bouton via leur caractère : sans `text`, le navigateur ne déclenche pas le clic (mesuré).
      const text = key === 'Enter' ? '\r' : key === ' ' ? ' ' : undefined;
      await send('Input.dispatchKeyEvent', text
        ? { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, modifiers, text, unmodifiedText: text }
        : { type: 'rawKeyDown', key, code, windowsVirtualKeyCode: vk, modifiers });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, modifiers });
      await sleep(250);
    },
    async wheel(x, y, deltaY) { await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY }); await sleep(300); },
    async screenshot(file) { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, Buffer.from(r.result.data, 'base64')); },
    /** Connexion via le formulaire réel (faux API local) puis attente du tableau de bord. */
    async login() {
      // Si l'application nous a déjà redirigés vers /login, on reste sur ce document : une seconde navigation vers la
      // même URL coupe l'entrée clavier du pilote (mesuré), ce qui rendrait les scénarios clavier trompeurs.
      if ((await evaluate('location.pathname')) !== '/login') { await send('Page.navigate', { url: BASE + '/login' }); await sleep(4000); }
      await evaluate(`(()=>{const set=(el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));};const i=[...document.querySelectorAll('input')];set(i[0],'bench@example.test');set(i[1],'bench');setTimeout(()=>[...document.querySelectorAll('button')].find(b=>/Se connecter/.test(b.textContent)).click(),200)})()`);
      await sleep(4500);
    },
    /** Rejoint une route. Chargement à froid d'abord ; si l'application redirige vers /login (défaut connu), navigation côté client. */
    async goto(route) {
      await send('Page.navigate', { url: BASE + route }); await sleep(4500);
      let here = await evaluate('location.pathname');
      if (here === route) return 'froid';
      // Défaut connu de l'application : certaines pages redirigent vers /login au chargement à froid. Le chemin
      // « redirection + connexion » coupe l'entrée clavier du pilote (mesuré, y compris en Legacy). On entre donc par
      // une page qui ne redirige pas (session semée), puis on navigue côté client.
      await send('Page.navigate', { url: BASE + '/profile' }); await sleep(4500);
      if ((await evaluate('location.pathname')) !== '/profile') await session.login();
      await evaluate(`(()=>{const r=window.next&&window.next.router;if(r&&r.push){r.push(${JSON.stringify(route)});return 'router'}history.pushState({},'',${JSON.stringify(route)});window.dispatchEvent(new PopStateEvent('popstate'));return 'popstate'})()`);
      await sleep(4500);
      here = await evaluate('location.pathname');
      return here === route ? 'navigation-client' : 'ECHEC:' + here;
    },
    /** Fige transitions et animations pour des mesures déterministes. */
    async freeze() {
      await evaluate(`(()=>{const s=document.createElement('style');s.setAttribute('data-bench','freeze');s.textContent='*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}';document.head.appendChild(s)})()`);
      await sleep(400);
    },
    async close() { try { ws.close(); } catch { /* ignoré */ } try { await getJson(`http://127.0.0.1:${port}/json/close/${target.id}`); } catch { /* onglet déjà fermé */ } },
  };
  return session;
}

module.exports = { launch, openSession, sleep, VIEWPORTS, BASE, profileBase };
