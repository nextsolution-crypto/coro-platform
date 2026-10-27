import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const BASE = 'http://127.0.0.1:3415';
const CDP = 'http://127.0.0.1:9335';
const OUTPUT = resolve('docs/diagnostic/evidence/dx04b');
const widths = [320, 375, 390, 768, 1024, 1440, 1920];

class CdpSession {
  constructor(socket) {
    this.socket = socket; this.nextId = 1; this.pending = new Map(); this.events = new Map();
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) { const pending = this.pending.get(message.id); if (!pending) return; this.pending.delete(message.id); message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result); return; }
      for (const listener of this.events.get(message.method) ?? []) listener(message.params);
    });
  }
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

async function evaluate(expression) { const response = await session.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (response.exceptionDetails) throw new Error(response.exceptionDetails.text ?? 'Browser evaluation failed'); return response.result.value; }
async function viewport(width) { await session.send('Emulation.setDeviceMetricsOverride', { width, height: width <= 390 ? 844 : 1000, deviceScaleFactor: 1, mobile: width < 768, screenWidth: width, screenHeight: width <= 390 ? 844 : 1000 }); }
async function navigate(path) { await session.send('Page.navigate', { url: `${BASE}${path}` }); for (let i = 0; i < 100; i += 1) { await delay(50); if (await evaluate('document.readyState === "complete"')) break; } await delay(300); }
async function screenshot(name) { const result = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false }); await writeFile(resolve(OUTPUT, name), Buffer.from(result.data, 'base64')); }
async function clickText(selector, text) { const clicked = await evaluate(`(() => { const node = [...document.querySelectorAll(${JSON.stringify(selector)})].find((item) => item.textContent?.trim().includes(${JSON.stringify(text)})); if (!node) return false; node.click(); return true; })()`); if (!clicked) throw new Error(`Could not click ${text}`); await delay(100); }
async function completeDiagnostic() { await clickText('button', documentLanguage === 'fr' ? 'Commencer le diagnostic' : 'Start the diagnostic'); for (let i = 0; i < 8; i += 1) { const selected = await evaluate(`(() => { const input = document.querySelector('input[value="A"]'); if (!input) return false; input.click(); return true; })()`); if (!selected) throw new Error(`Question ${i + 1} unavailable`); await delay(30); await clickText('button', i === 7 ? (documentLanguage === 'fr' ? 'Terminer' : 'Finish') : (documentLanguage === 'fr' ? 'Suivant' : 'Next')); } }
async function dismissCookieNotice() { await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find((node) => ['Compris', 'Got it'].some((label) => node.textContent?.includes(label))); if (!button) return false; button.click(); return true; })()`); await delay(100); }
async function revealConclusion() {
  const found = await evaluate(`(() => { document.documentElement.style.scrollBehavior = 'auto'; const image = document.querySelector('img[src*="coro-diagnostic-dimensions"]'); if (!image) return false; image.scrollIntoView({ block: 'center', behavior: 'auto' }); return true; })()`);
  if (!found) throw new Error('Conclusion image unavailable');
  for (let i = 0; i < 50; i += 1) { if (await evaluate(`(() => { const image = document.querySelector('img[src*="coro-diagnostic-dimensions"]'); return Boolean(image?.complete && image.naturalWidth > 0); })()`)) return; await delay(50); }
  throw new Error('Conclusion image did not finish loading');
}

await mkdir(OUTPUT, { recursive: true });
await viewport(1440); await navigate('/diagnostic'); await dismissCookieNotice();
const measurements = []; let documentLanguage = 'fr';
for (const width of widths) {
  await viewport(width); await navigate('/diagnostic');
  measurements.push(await evaluate(`(() => { const image = document.querySelector('img[src*="coro-diagnostic-hero"]'); const rect = image?.getBoundingClientRect(); return { width: ${width}, phase: 'hero', overflow: document.documentElement.scrollWidth > innerWidth + 1, documentWidth: document.documentElement.scrollWidth, image: rect ? { left: rect.left, right: rect.right, width: rect.width, height: rect.height, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, complete: image.complete } : null }; })()`));
  await completeDiagnostic();
  await revealConclusion();
  measurements.push(await evaluate(`(() => { const image = document.querySelector('img[src*="coro-diagnostic-dimensions"]'); const rect = image?.getBoundingClientRect(); return { width: ${width}, phase: 'conclusion', overflow: document.documentElement.scrollWidth > innerWidth + 1, documentWidth: document.documentElement.scrollWidth, image: rect ? { left: rect.left, right: rect.right, width: rect.width, height: rect.height, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, complete: image.complete } : null }; })()`));
}

await viewport(1440); documentLanguage = 'fr'; await navigate('/diagnostic'); await screenshot('01-hero-fr-desktop.png');
await navigate('/diagnostic?lang=en'); documentLanguage = 'en'; await screenshot('02-hero-en-desktop.png');
await viewport(390); await navigate('/diagnostic'); documentLanguage = 'fr'; await screenshot('03-hero-fr-mobile.png');
await navigate('/diagnostic?lang=en'); documentLanguage = 'en'; await screenshot('04-hero-en-mobile.png');

await viewport(1440); await navigate('/diagnostic'); documentLanguage = 'fr'; await completeDiagnostic(); await revealConclusion(); await screenshot('05-conclusion-fr-desktop.png');
await clickText('button', 'View result in English'); await revealConclusion(); await screenshot('06-conclusion-en-desktop.png');
await viewport(390); await navigate('/diagnostic'); documentLanguage = 'fr'; await completeDiagnostic(); await revealConclusion(); await screenshot('07-conclusion-fr-mobile.png');
await clickText('button', 'View result in English'); await revealConclusion(); await screenshot('08-conclusion-en-mobile.png');

const resources = await evaluate(`performance.getEntriesByType('resource').filter((entry) => entry.name.includes('coro-diagnostic')).map((entry) => ({ name: entry.name, transferSize: entry.transferSize, decodedBodySize: entry.decodedBodySize, duration: entry.duration }))`);
const report = { generatedAt: new Date().toISOString(), environment: { baseUrl: BASE, browserTarget: target.id }, measurements, resources, consoleErrors, failedRequests };
await writeFile(resolve(OUTPUT, 'dx04b-browser-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
socket.close(); await fetch(`${CDP}/json/close/${target.id}`);
