/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Banc de validation Liquid Glass — couche navigateur.
 * Pilote un Chrome réel (headless) via le protocole DevTools. Aucune dépendance : WebSocket natif de Node 22.
 * Variables d'environnement : CHROME_PATH, BENCH_BASE_URL (défaut http://localhost:3010), BENCH_API_PORT (défaut 3002).
 */
const { spawn } = require('node:child_process');
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

/** Lance Chrome avec un profil jetable ; renvoie { close(), port }. */
async function launch() {
  const port = 9300 + Math.floor(Math.random() * 600);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-bench-'));
  const proc = spawn(CHROME, [`--headless=new`, `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`,
    '--hide-scrollbars', '--no-first-run', '--disable-gpu-vsync', 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { await getJson(`http://127.0.0.1:${port}/json/version`); break; } catch { await sleep(250); } }
  return {
    port,
    async close() { try { proc.kill(); } catch { /* déjà arrêté */ } await sleep(300); try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* profil verrouillé : sans importance */ } },
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
    async close() { try { ws.close(); } catch { /* ignoré */ } },
  };
  return session;
}

module.exports = { launch, openSession, sleep, VIEWPORTS, BASE };
