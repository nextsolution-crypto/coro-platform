import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const BASE = 'http://127.0.0.1:3416';
const CDP = 'http://127.0.0.1:9336';
const OUTPUT = resolve('docs/diagnostic/evidence/dx03b');
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
const consoleErrors = []; const failedRequests = [];
session.on('Runtime.consoleAPICalled', (event) => { if (event.type === 'error') consoleErrors.push(event.args.map((arg) => arg.value ?? arg.description ?? '').join(' ')); });
session.on('Log.entryAdded', ({ entry }) => { if (entry.level === 'error') consoleErrors.push(entry.text); });
session.on('Network.loadingFailed', (event) => { if (!event.canceled) failedRequests.push({ error: event.errorText, url: event.url ?? null }); });

async function evaluate(expression) { const response = await session.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (response.exceptionDetails) throw new Error(response.exceptionDetails.text ?? 'Evaluation failed'); return response.result.value; }
async function viewport(width) { await session.send('Emulation.setDeviceMetricsOverride', { width, height: width <= 390 ? 844 : 1000, deviceScaleFactor: 1, mobile: width < 768, screenWidth: width, screenHeight: width <= 390 ? 844 : 1000 }); }
async function navigate(path) { await session.send('Page.navigate', { url: `${BASE}${path}` }); for (let i = 0; i < 100; i += 1) { await delay(50); if (await evaluate('document.readyState === "complete"')) break; } await delay(250); }
async function screenshot(name) { const result = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false }); await writeFile(resolve(OUTPUT, name), Buffer.from(result.data, 'base64')); }
async function clickContaining(selector, text) { const clicked = await evaluate(`(() => { const node = [...document.querySelectorAll(${JSON.stringify(selector)})].find((item) => item.textContent?.includes(${JSON.stringify(text)})); if (!node) return false; node.click(); return true; })()`); if (!clicked) throw new Error(`Unable to click ${text}`); await delay(60); }
async function complete(answers, locale = 'fr') { await clickContaining('button', locale === 'fr' ? 'Commencer' : 'Start'); for (let index = 0; index < answers.length; index += 1) { const answer = answers[index]; const selected = await evaluate(`(() => { const input = document.querySelector('input[value=${JSON.stringify(answer)}]'); if (!input) return false; input.click(); return true; })()`); if (!selected) throw new Error(`Answer ${answer} missing at ${index + 1}`); await clickContaining('button', index === 7 ? (locale === 'fr' ? 'Terminer' : 'Finish') : (locale === 'fr' ? 'Suivant' : 'Next')); } }
async function revealPortrait() { const found = await evaluate(`(() => { document.documentElement.style.scrollBehavior = 'auto'; const title = [...document.querySelectorAll('h2')].find((node) => node.textContent?.includes('Portrait') || node.textContent?.includes('Resilience')); if (!title) return false; title.scrollIntoView({ block: 'start', behavior: 'auto' }); return true; })()`); if (!found) throw new Error('Portrait not found'); await delay(100); }

await mkdir(OUTPUT, { recursive: true });
await viewport(1440); await navigate('/diagnostic'); await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find((node) => node.textContent?.includes('Compris')); button?.click(); })()`);
const measurements = [];
for (const width of widths) {
  await viewport(width); await navigate('/diagnostic'); await complete(Array(8).fill('A')); await revealPortrait();
  measurements.push(await evaluate(`(() => { const section = document.querySelector('svg[role="img"]')?.closest('section'); const svg = section?.querySelector('svg')?.getBoundingClientRect(); const table = section?.querySelector('table')?.getBoundingClientRect(); return { width: ${width}, overflow: document.documentElement.scrollWidth > innerWidth + 1, documentWidth: document.documentElement.scrollWidth, svg: svg && { left: svg.left, right: svg.right, width: svg.width, height: svg.height }, table: table && { left: table.left, right: table.right, width: table.width }, rows: section?.querySelectorAll('tbody tr').length, circles: section?.querySelectorAll('circle').length, closedSurface: Boolean(section?.querySelector('polygon[class]')?.getAttribute('class')?.includes('surface')) }; })()`));
}

await viewport(1440); await navigate('/diagnostic'); await complete(Array(8).fill('A')); await revealPortrait(); await screenshot('01-portrait-fr-desktop.png');
await clickContaining('button', 'View result in English'); await revealPortrait(); await screenshot('02-portrait-en-desktop.png');
await viewport(390); await navigate('/diagnostic'); await complete(Array(8).fill('A')); await revealPortrait(); await screenshot('03-portrait-fr-mobile.png');
await clickContaining('button', 'View result in English'); await revealPortrait(); await screenshot('04-portrait-en-mobile.png');

await viewport(1024); await navigate('/diagnostic'); await complete(['A', 'D', 'C', 'E', 'B', 'D', 'A', 'E']); await revealPortrait();
const mixed = await evaluate(`(() => { const section = document.querySelector('svg[role="img"]')?.closest('section'); return { svg: Boolean(section?.querySelector('svg')), closedSurface: Boolean(section?.querySelector('polygon[class]')?.getAttribute('class')?.includes('surface')), circles: section?.querySelectorAll('circle').length, unknownMarkers: section?.querySelectorAll('[data-answer="D"]').length, notApplicableMarkers: section?.querySelectorAll('[data-answer="E"]').length, rows: section?.querySelectorAll('tbody tr').length }; })()`);
await navigate('/diagnostic'); await complete(['A', 'B', 'D', 'D', 'E', 'E', 'D', 'E']); await revealPortrait();
const insufficient = await evaluate(`(() => { const heading = [...document.querySelectorAll('h2')].find((node) => node.textContent?.includes('Portrait')); const section = heading?.closest('section'); return { svg: Boolean(section?.querySelector('svg')), note: section?.querySelector('[role="note"]')?.textContent, rows: section?.querySelectorAll('tbody tr').length }; })()`);
await navigate('/diagnostic'); await complete(Array(8).fill('D')); await revealPortrait();
const noScore = await evaluate(`(() => { const heading = [...document.querySelectorAll('h2')].find((node) => node.textContent?.includes('Portrait')); const section = heading?.closest('section'); return { svg: Boolean(section?.querySelector('svg')), rows: section?.querySelectorAll('tbody tr').length, scoreText: document.querySelector('dd')?.textContent }; })()`);

const report = { generatedAt: new Date().toISOString(), environment: { baseUrl: BASE, browserTarget: target.id }, measurements, mixed, insufficient, noScore, consoleErrors, failedRequests };
await writeFile(resolve(OUTPUT, 'dx03b-browser-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8'); console.log(JSON.stringify(report, null, 2));
socket.close(); await fetch(`${CDP}/json/close/${target.id}`);
