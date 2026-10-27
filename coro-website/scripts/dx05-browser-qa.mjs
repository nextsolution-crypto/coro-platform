import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const BASE = 'http://127.0.0.1:3417';
const CDP = 'http://127.0.0.1:9337';
const OUTPUT = resolve('docs/diagnostic/evidence/dx05');
const DOWNLOADS = resolve('output/pdf/dx05/browser');
const widths = [320, 375, 390, 768, 1024, 1440, 1920];

class CdpSession {
  constructor(socket) { this.socket = socket; this.nextId = 1; this.pending = new Map(); this.events = new Map(); socket.addEventListener('message', ({ data }) => { const message = JSON.parse(data); if (message.id) { const pending = this.pending.get(message.id); if (!pending) return; this.pending.delete(message.id); message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result); return; } for (const listener of this.events.get(message.method) ?? []) listener(message.params); }); }
  send(method, params = {}) { const id = this.nextId++; return new Promise((resolvePromise, reject) => { this.pending.set(id, { resolve: resolvePromise, reject }); this.socket.send(JSON.stringify({ id, method, params })); }); }
  on(method, listener) { const listeners = this.events.get(method) ?? []; listeners.push(listener); this.events.set(method, listeners); }
}

const delay = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
const target = await fetch(`${CDP}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' }).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolvePromise, reject) => { socket.addEventListener('open', resolvePromise, { once: true }); socket.addEventListener('error', reject, { once: true }); });
const session = new CdpSession(socket);
await Promise.all([session.send('Page.enable'), session.send('Runtime.enable'), session.send('Network.enable'), session.send('Log.enable')]);
await mkdir(OUTPUT, { recursive: true }); await mkdir(DOWNLOADS, { recursive: true });
for (const filename of ['coro-diagnostic-express-fr.pdf', 'coro-diagnostic-express-en.pdf']) await rm(resolve(DOWNLOADS, filename), { force: true });
await session.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DOWNLOADS, eventsEnabled: true });
const consoleErrors = []; const failedRequests = []; const requests = [];
session.on('Runtime.consoleAPICalled', (event) => { if (event.type === 'error') consoleErrors.push(event.args.map((arg) => arg.value ?? arg.description ?? '').join(' ')); });
session.on('Log.entryAdded', ({ entry }) => { if (entry.level === 'error') consoleErrors.push(entry.text); });
session.on('Network.loadingFailed', (event) => { if (!event.canceled) failedRequests.push({ error: event.errorText, url: event.url ?? null }); });
session.on('Network.requestWillBeSent', ({ request }) => { requests.push({ url: request.url, method: request.method }); });

async function evaluate(expression) { const response = await session.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (response.exceptionDetails) throw new Error(response.exceptionDetails.text ?? 'Evaluation failed'); return response.result.value; }
async function viewport(width) { await session.send('Emulation.setDeviceMetricsOverride', { width, height: width <= 390 ? 844 : 1000, deviceScaleFactor: 1, mobile: width < 768, screenWidth: width, screenHeight: width <= 390 ? 844 : 1000 }); }
async function navigate(path) { await session.send('Page.navigate', { url: `${BASE}${path}` }); for (let i = 0; i < 100; i += 1) { await delay(50); if (await evaluate('document.readyState === "complete"')) break; } await delay(250); }
async function dismissCookieNotice() { await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find((node) => node.textContent?.includes('Compris') || node.textContent?.includes('Got it')); button?.click(); })()`); await delay(40); }
async function screenshot(name) { const result = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true }); await writeFile(resolve(OUTPUT, name), Buffer.from(result.data, 'base64')); }
async function clickContaining(selector, text) { const clicked = await evaluate(`(() => { const node = [...document.querySelectorAll(${JSON.stringify(selector)})].find((item) => item.textContent?.includes(${JSON.stringify(text)})); if (!node) return false; node.click(); return true; })()`); if (!clicked) throw new Error(`Unable to click ${text}`); await delay(80); }
async function complete(answers, locale = 'fr') { await clickContaining('button', locale === 'fr' ? 'Commencer' : 'Start'); for (let index = 0; index < answers.length; index += 1) { const selected = await evaluate(`(() => { const input = document.querySelector('input[value=${JSON.stringify(answers[index])}]'); if (!input) return false; input.click(); return true; })()`); if (!selected) throw new Error(`Answer missing at ${index + 1}`); await clickContaining('button', index === 7 ? (locale === 'fr' ? 'Terminer' : 'Finish') : (locale === 'fr' ? 'Suivant' : 'Next')); } }
async function revealActions() { const found = await evaluate(`(() => { document.documentElement.style.scrollBehavior = 'auto'; const button = [...document.querySelectorAll('button')].find((node) => /PDF|Share|Partager/.test(node.textContent ?? '')); if (!button) return false; button.scrollIntoView({ block: 'center', behavior: 'auto' }); return true; })()`); if (!found) throw new Error('DX-05 actions missing'); await delay(250); }
async function waitForFile(filename) { const path = resolve(DOWNLOADS, filename); for (let i = 0; i < 100; i += 1) { try { const info = await stat(path); if (info.size > 1000) return { path, size: info.size, signature: (await readFile(path)).subarray(0, 5).toString() }; } catch {} await delay(100); } throw new Error(`Download missing: ${filename}`); }

const measurements = [];
for (const width of widths) {
  await viewport(width); await navigate('/diagnostic'); await dismissCookieNotice(); await complete(['A', 'A', 'A', 'A', 'A', 'B', 'B', 'C']); await revealActions();
  measurements.push(await evaluate(`(() => { const buttons = [...document.querySelectorAll('button')].filter((node) => /PDF|Partager/.test(node.textContent ?? '')).map((node) => { const r = node.getBoundingClientRect(); return { text: node.textContent, left: r.left, right: r.right, width: r.width, height: r.height }; }); return { width: ${width}, overflow: document.documentElement.scrollWidth > innerWidth + 1, documentWidth: document.documentElement.scrollWidth, buttons }; })()`));
}

await viewport(1440); await navigate('/diagnostic'); await dismissCookieNotice(); await complete(['A', 'A', 'A', 'A', 'A', 'B', 'B', 'C']); await revealActions(); await screenshot('01-dx05-fr-desktop.png');
const frStarted = performance.now(); await clickContaining('button', 'Télécharger le rapport PDF'); const frDownload = await waitForFile('coro-diagnostic-express-fr.pdf'); frDownload.durationMs = Math.round(performance.now() - frStarted);
await evaluate(`Object.defineProperty(navigator, 'share', { configurable: true, value: async (payload) => { window.__dx05Share = payload; } })`); await clickContaining('button', 'Partager le diagnostic'); const frShare = await evaluate('window.__dx05Share');
await clickContaining('button', 'View result in English'); await revealActions(); await screenshot('02-dx05-en-desktop.png');
const enStarted = performance.now(); await clickContaining('button', 'Download PDF report'); const enDownload = await waitForFile('coro-diagnostic-express-en.pdf'); enDownload.durationMs = Math.round(performance.now() - enStarted);
await evaluate(`Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value) => { window.__dx05Clipboard = value; } } })`); await clickContaining('button', 'Share the diagnostic'); const enClipboard = await evaluate('window.__dx05Clipboard');

await viewport(390); await navigate('/diagnostic'); await dismissCookieNotice(); await complete(['A', 'A', 'A', 'A', 'A', 'B', 'B', 'C']); await revealActions(); await screenshot('03-dx05-fr-mobile.png'); await clickContaining('button', 'View result in English'); await revealActions(); await screenshot('04-dx05-en-mobile.png');

const externalRequests = requests.filter(({ url }) => !url.startsWith(BASE) && !url.startsWith('data:') && !url.startsWith('blob:'));
const mutatingRequests = requests.filter(({ method }) => !['GET', 'HEAD', 'OPTIONS'].includes(method));
const report = { generatedAt: new Date().toISOString(), environment: { baseUrl: BASE, browserTarget: target.id }, measurements, downloads: { fr: frDownload, en: enDownload }, sharing: { fr: frShare, enClipboard }, privacy: { externalRequests, mutatingRequests }, consoleErrors, failedRequests };
await writeFile(resolve(OUTPUT, 'dx05-browser-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8'); console.log(JSON.stringify(report, null, 2));
socket.close(); await fetch(`${CDP}/json/close/${target.id}`);
