import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const BASE = 'http://127.0.0.1:3418';
const CDP = 'http://127.0.0.1:9338';
const OUTPUT = resolve('docs/diagnostic/evidence/dx06');

class CdpSession {
  constructor(socket) { this.socket = socket; this.nextId = 1; this.pending = new Map(); this.events = new Map(); socket.addEventListener('message', ({ data }) => { const message = JSON.parse(data); if (message.id) { const pending = this.pending.get(message.id); if (!pending) return; this.pending.delete(message.id); if (message.error) pending.reject(new Error(message.error.message)); else pending.resolve(message.result); return; } for (const listener of this.events.get(message.method) ?? []) listener(message.params); }); }
  send(method, params = {}) { const id = this.nextId++; return new Promise((resolvePromise, reject) => { this.pending.set(id, { resolve: resolvePromise, reject }); this.socket.send(JSON.stringify({ id, method, params })); }); }
  on(method, listener) { const listeners = this.events.get(method) ?? []; listeners.push(listener); this.events.set(method, listeners); }
}

const delay = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
const target = await fetch(`${CDP}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' }).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolvePromise, reject) => { socket.addEventListener('open', resolvePromise, { once: true }); socket.addEventListener('error', reject, { once: true }); });
const session = new CdpSession(socket);
await Promise.all([session.send('Page.enable'), session.send('Runtime.enable'), session.send('Network.enable'), session.send('Log.enable'), session.send('Fetch.enable', { patterns: [{ urlPattern: 'https://formspree.io/*', requestStage: 'Request' }] })]);
const consoleErrors = []; const failedRequests = []; const formRequests = []; let responseStatus = 200;
session.on('Runtime.consoleAPICalled', (event) => { if (event.type === 'error') consoleErrors.push(event.args.map((arg) => arg.value ?? arg.description ?? '').join(' ')); });
session.on('Log.entryAdded', ({ entry }) => { if (entry.level === 'error') consoleErrors.push(entry.text); });
session.on('Network.loadingFailed', (event) => { if (!event.canceled && !event.blockedReason) failedRequests.push({ error: event.errorText, url: event.url ?? null }); });
session.on('Fetch.requestPaused', async (event) => { formRequests.push({ url: event.request.url, method: event.request.method, postData: event.request.postData ? JSON.parse(event.request.postData) : null }); const isPreflight = event.request.method === 'OPTIONS'; const body = Buffer.from(JSON.stringify(responseStatus === 200 ? { ok: true } : { error: 'simulated' })).toString('base64'); await session.send('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: isPreflight ? 204 : responseStatus, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: BASE }, { name: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' }, { name: 'Access-Control-Allow-Headers', value: 'Content-Type, Accept' }], body: isPreflight ? '' : body }); });

async function evaluate(expression) { const response = await session.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (response.exceptionDetails) throw new Error(response.exceptionDetails.text ?? 'Evaluation failed'); return response.result.value; }
async function viewport(width) { await session.send('Emulation.setDeviceMetricsOverride', { width, height: width <= 390 ? 844 : 1000, deviceScaleFactor: 1, mobile: width < 768, screenWidth: width, screenHeight: width <= 390 ? 844 : 1000 }); }
async function navigate(path) { await session.send('Page.navigate', { url: `${BASE}${path}` }); for (let i = 0; i < 100; i += 1) { await delay(50); if (await evaluate('document.readyState === "complete"')) break; } await delay(200); await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find((node) => /Compris|Got it/.test(node.textContent ?? '')); button?.click(); })()`); }
async function clickContaining(selector, text) { const clicked = await evaluate(`(() => { const node = [...document.querySelectorAll(${JSON.stringify(selector)})].find((item) => item.textContent?.includes(${JSON.stringify(text)})); if (!node) return false; node.click(); return true; })()`); if (!clicked) throw new Error(`Unable to click ${text}`); await delay(100); }
async function complete(answers, locale = 'fr') { await clickContaining('button', locale === 'fr' ? 'Commencer' : 'Start'); for (let index = 0; index < answers.length; index += 1) { await evaluate(`document.querySelector('input[value=${JSON.stringify(answers[index])}]')?.click()`); await clickContaining('button', index === 7 ? (locale === 'fr' ? 'Terminer' : 'Finish') : (locale === 'fr' ? 'Suivant' : 'Next')); } }
async function revealConversion() { const found = await evaluate(`(() => { document.documentElement.style.scrollBehavior='auto'; const title = document.querySelector('#commercial-conversion-title'); title?.scrollIntoView({ block: 'center' }); return Boolean(title); })()`); if (!found) throw new Error('Commercial conversion missing'); await delay(150); }
async function screenshot(name) { const result = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true }); await writeFile(resolve(OUTPUT, name), Buffer.from(result.data, 'base64')); }
async function fillForm(locale, includeSummary) { await evaluate(`(() => { const set = (id, value) => { const input = document.querySelector('[id$="-' + id + '"]'); if (!input) throw new Error('field '+id); const setter = Object.getOwnPropertyDescriptor(input instanceof HTMLInputElement ? HTMLInputElement.prototype : input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLSelectElement.prototype, 'value').set; setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); }; set('0','Ada'); set('1','Lovelace'); set('2','ada@example.test'); set('3','Synthetic Org'); set('7','12'); set('8','DETAILED_ASSESSMENT'); set('6','Synthetic QA request'); const checkbox=document.querySelector('[id$="-9"]'); if (${includeSummary} && checkbox) checkbox.click(); })()`); await delay(80); await clickContaining('button', locale === 'fr' ? 'Envoyer la demande' : 'Send request'); await delay(250); }

await mkdir(OUTPUT, { recursive: true });
await viewport(1440); await navigate('/diagnostic'); await complete(['A','A','A','A','A','B','B','C']); await revealConversion();
const closed = await evaluate(`(() => ({ form: Boolean(document.querySelector('#diagnostic-commercial-form')), pdf: [...document.querySelectorAll('button')].some((node) => node.textContent?.includes('PDF')), recommendations: Boolean(document.querySelector('#recommendations-title')), overflow: document.documentElement.scrollWidth > innerWidth + 1 }))()`); await screenshot('01-dx06-fr-invitation.png');
await clickContaining('button', 'Demander une évaluation approfondie'); await evaluate(`document.querySelector('#diagnostic-commercial-form')?.scrollIntoView({ block: 'start', behavior: 'auto' })`); await delay(100); await screenshot('02-dx06-fr-form.png');
const beforeInvalid = formRequests.length; await clickContaining('button', 'Envoyer la demande'); await delay(100); const invalid = { requestCreated: formRequests.length > beforeInvalid, invalidControls: await evaluate(`document.querySelectorAll(':invalid').length`) };
await fillForm('fr', false); const withoutSummary = formRequests.filter((request) => request.method === 'POST').at(-1);

await navigate('/diagnostic'); await complete(['A','B','C','D','D','E','E','E']); await clickContaining('button', 'Demander une évaluation approfondie'); await fillForm('fr', true); const withSummary = formRequests.filter((request) => request.method === 'POST').at(-1);

responseStatus = 500; await navigate('/diagnostic?lang=en'); await complete(['A','A','A','A','A','B','B','C'], 'en'); await clickContaining('button', 'Request an in-depth assessment'); await fillForm('en', true); const errorState = await evaluate(`(() => ({ alert: document.querySelector('[role="alert"]')?.textContent, formStillAvailable: Boolean(document.querySelector('#diagnostic-commercial-form form')) }))()`);
await viewport(390); await navigate('/diagnostic?lang=en'); await complete(['A','A','A','A','A','B','B','C'], 'en'); await revealConversion(); await screenshot('03-dx06-en-mobile-invitation.png'); await clickContaining('button', 'Request an in-depth assessment'); await evaluate(`document.querySelector('#diagnostic-commercial-form')?.scrollIntoView({ block: 'start', behavior: 'auto' })`); await delay(100); await screenshot('04-dx06-en-mobile-form.png');
const mobile = await evaluate(`(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, width: innerWidth, formWidth: document.querySelector('#diagnostic-commercial-form')?.getBoundingClientRect().width }))()`);

const report = { generatedAt: new Date().toISOString(), environment: { baseUrl: BASE, browserTarget: target.id }, closed, invalid, withoutSummary, withSummary, errorState, mobile, formRequests, consoleErrors, failedRequests };
await writeFile(resolve(OUTPUT, 'dx06-browser-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8'); console.log(JSON.stringify(report, null, 2));
socket.close(); await fetch(`${CDP}/json/close/${target.id}`);
