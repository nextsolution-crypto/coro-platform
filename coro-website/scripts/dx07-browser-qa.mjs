import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const BASE = 'http://127.0.0.1:3419';
const CDP = 'http://127.0.0.1:9339';
const OUTPUT = resolve('docs/diagnostic/evidence/dx07');
const widths = [320, 375, 390, 768, 1024, 1440, 1920];

class CdpSession {
  constructor(socket) {
    this.socket = socket; this.nextId = 1; this.pending = new Map(); this.events = new Map();
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) { const pending = this.pending.get(message.id); if (!pending) return; this.pending.delete(message.id); if (message.error) pending.reject(new Error(message.error.message)); else pending.resolve(message.result); return; }
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
await session.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__dx07Perf={lcp:[],cls:0}; try { new PerformanceObserver((list)=>{ window.__dx07Perf.lcp.push(...list.getEntries().map((entry)=>({startTime:entry.startTime,size:entry.size}))); }).observe({type:'largest-contentful-paint',buffered:true}); new PerformanceObserver((list)=>{ for(const entry of list.getEntries()) if(!entry.hadRecentInput) window.__dx07Perf.cls += entry.value; }).observe({type:'layout-shift',buffered:true}); } catch {}` });
await mkdir(OUTPUT, { recursive: true });
const consoleErrors = []; const failedRequests = []; const requests = [];
session.on('Runtime.consoleAPICalled', (event) => { if (event.type === 'error') consoleErrors.push(event.args.map((arg) => arg.value ?? arg.description ?? '').join(' ')); });
session.on('Log.entryAdded', ({ entry }) => { if (entry.level === 'error') consoleErrors.push(entry.text); });
session.on('Network.loadingFailed', (event) => { if (!event.canceled) failedRequests.push({ error: event.errorText, url: event.url ?? null }); });
session.on('Network.requestWillBeSent', ({ request }) => { requests.push({ url: request.url, method: request.method }); });

async function evaluate(expression) { const response = await session.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (response.exceptionDetails) throw new Error(response.exceptionDetails.text ?? 'Evaluation failed'); return response.result.value; }
async function viewport(width) { await session.send('Emulation.setDeviceMetricsOverride', { width, height: width <= 390 ? 844 : 1000, deviceScaleFactor: 1, mobile: width < 768, screenWidth: width, screenHeight: width <= 390 ? 844 : 1000 }); }
async function navigate(path) { await session.send('Page.navigate', { url: `${BASE}${path}` }); for (let i = 0; i < 100; i += 1) { await delay(50); if (await evaluate('document.readyState === "complete"')) break; } await delay(200); }
async function click(text) { const clicked = await evaluate(`(() => { const node = [...document.querySelectorAll('button, a')].find((item) => item.textContent?.trim().includes(${JSON.stringify(text)})); if (!node) return false; node.click(); return true; })()`); if (!clicked) throw new Error(`Missing control: ${text}`); await delay(100); }
async function answer(value) { const selected = await evaluate(`(() => { const input = document.querySelector('input[value=${JSON.stringify(value)}]'); if (!input) return false; input.click(); return input.checked; })()`); if (!selected) throw new Error(`Missing answer: ${value}`); }
async function complete(values, locale = 'fr') { await click(locale === 'fr' ? 'Commencer' : 'Start'); for (let index = 0; index < values.length; index += 1) { await answer(values[index]); await click(index === 7 ? (locale === 'fr' ? 'Terminer' : 'Finish') : (locale === 'fr' ? 'Suivant' : 'Next')); } }
async function screenshot(name) { const image = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true }); await writeFile(resolve(OUTPUT, name), Buffer.from(image.data, 'base64')); }

await viewport(1440);
await navigate('/');
const home = await evaluate(`(() => { const links = [...document.querySelectorAll('a[href^="/diagnostic"]')].map((a) => ({ text: a.textContent?.trim(), href: a.getAttribute('href'), footer: Boolean(a.closest('footer')) })); return { links, title: document.title, overflow: document.documentElement.scrollWidth > innerWidth + 1 }; })()`);
await screenshot('01-home-entry-fr.png');

await navigate('/?lang=en');
const homeEn = await evaluate(`(() => ({ links: [...document.querySelectorAll('a[href^="/diagnostic"]')].map((a) => ({ text: a.textContent?.trim(), href: a.getAttribute('href'), footer: Boolean(a.closest('footer')) })), overflow: document.documentElement.scrollWidth > innerWidth + 1 }))()`);

await navigate('/diagnostic');
const intro = await evaluate(`(() => ({ h1: document.querySelector('h1')?.textContent, start: [...document.querySelectorAll('button')].some((b) => b.textContent?.includes('Commencer')), storageBefore: sessionStorage.length, url: location.href }))()`);
await click('Commencer'); await answer('A'); await click('Suivant'); await answer('B'); await click('Précédent');
const back = await evaluate(`(() => ({ checked: document.querySelector('input:checked')?.value, question: document.querySelector('fieldset legend')?.textContent }))()`);
await answer('C'); await click('Suivant');
await click('English');
const languagePersistence = await evaluate(`(() => ({ lang: document.querySelector('[data-coro-system]')?.getAttribute('lang'), checked: document.querySelector('input:checked')?.value ?? null, url: location.href, stored: sessionStorage.getItem('coro:diagnostic-express:v1') !== null }))()`);
await click('Français');
for (let index = 1; index < 8; index += 1) { await answer(index < 5 ? 'A' : index < 7 ? 'B' : 'C'); await click(index === 7 ? 'Terminer' : 'Suivant'); }
const result = await evaluate(`(() => ({ score: [...document.querySelectorAll('.resultPage dd, [class*=scorePanel] dd')].slice(0,3).map((n) => n.textContent?.trim()), h2: [...document.querySelectorAll('h2')].map((n) => n.textContent?.trim()), radarAxes: document.querySelectorAll('svg line').length, portraitRows: document.querySelectorAll('table tbody tr').length, pdf: [...document.querySelectorAll('button')].some((b) => b.textContent?.includes('PDF')), share: [...document.querySelectorAll('button')].some((b) => b.textContent?.includes('Partager')), commercial: document.body.textContent.includes('Vous connaissez vos priorités'), temporary: document.body.textContent.includes('temporaire'), url: location.href }))()`);
await screenshot('02-result-fr.png');
await click('View result in English');
const resultEn = await evaluate(`(() => ({ lang: document.querySelector('[lang="en-CA"]')?.getAttribute('lang'), h1: document.querySelector('h1')?.textContent, pdf: [...document.querySelectorAll('button')].some((b) => b.textContent?.includes('PDF')), commercial: document.body.textContent.includes('You know your priorities') }))()`);
await screenshot('03-result-en.png');
await click('Start again');
const reset = await evaluate(`(() => ({ start: [...document.querySelectorAll('button')].some((b) => /Commencer|Start/.test(b.textContent ?? '')), answers: sessionStorage.getItem('coro:diagnostic-express:v1') }))()`);

const responsive = [];
for (const width of widths) {
  await viewport(width); await navigate('/diagnostic');
  const base = await evaluate(`(() => ({ width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth + 1, main: document.querySelector('main')?.getBoundingClientRect().width, minTarget: Math.min(...[...document.querySelectorAll('button, a')].filter((node) => { const r = node.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).map((node) => Math.min(node.getBoundingClientRect().width, node.getBoundingClientRect().height))) }))()`);
  await complete(['A', 'B', 'C', 'D', 'E', 'A', 'B', 'C']);
  const completed = await evaluate(`(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, radar: document.querySelector('svg')?.getBoundingClientRect().width ?? null, tableOverflowContained: [...document.querySelectorAll('table')].every((table) => table.closest('[class*=tableWrap]')?.scrollWidth >= table.scrollWidth), formInitiallyAbsent: !document.querySelector('#diagnostic-commercial-form') }))()`);
  responsive.push({ ...base, result: completed });
}

await viewport(390); await navigate('/diagnostic?lang=en');
await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
const reducedMotion = await evaluate(`(() => ({ language: document.querySelector('[data-coro-system]')?.getAttribute('lang'), preference: matchMedia('(prefers-reduced-motion: reduce)').matches, animationDurations: [...document.querySelectorAll('*')].map((node) => getComputedStyle(node).animationDuration).filter((value) => value !== '0s').slice(0, 10) }))()`);
await complete(['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'], 'en');
const alternative = await evaluate(`(() => ({ scoreText: [...document.querySelectorAll('dd')].map((n) => n.textContent?.trim()), polygon: Boolean(document.querySelector('svg polygon[data-result]')), alternative: document.body.textContent.includes('insufficient numeric coverage'), rows: document.querySelectorAll('table tbody tr').length }))()`);
await screenshot('04-result-en-mobile-alternative.png');

const seo = {};
for (const path of ['/diagnostic', '/diagnostic?lang=en']) {
  await navigate(path);
  seo[path] = await evaluate(`(() => ({ title: document.title, description: document.querySelector('meta[name="description"]')?.content, canonical: document.querySelector('link[rel="canonical"]')?.href, alternates: [...document.querySelectorAll('link[rel="alternate"]')].map((n) => ({ lang: n.hreflang, href: n.href })), og: document.querySelector('meta[property="og:title"]')?.content, robots: document.querySelector('meta[name="robots"]')?.content }))()`);
}
const sitemap = await fetch(`${BASE}/sitemap.xml`).then((r) => r.text());
const robots = await fetch(`${BASE}/robots.txt`).then((r) => r.text());
seo.sitemapHasDiagnostic = sitemap.includes('/diagnostic'); seo.robotsAllowsDiagnostic = !/Disallow:\s*\/diagnostic/.test(robots);
await navigate('/diagnostic'); await delay(1200);
const performance = await evaluate(`(() => { const nav=performance.getEntriesByType('navigation')[0]; const resources=performance.getEntriesByType('resource'); return { localLab:true, domContentLoadedMs:Math.round(nav?.domContentLoadedEventEnd ?? 0), loadMs:Math.round(nav?.loadEventEnd ?? 0), lcpMs:Math.round(window.__dx07Perf?.lcp?.at(-1)?.startTime ?? 0), cls:Number((window.__dx07Perf?.cls ?? 0).toFixed(4)), transferBytes:Math.round(resources.reduce((sum,item)=>sum+(item.transferSize||0),0)), diagnosticImages:resources.filter((item)=>item.name.includes('Coro_Diagnostic')).map((item)=>({name:item.name.split('/').at(-1),transferSize:item.transferSize,duration:Math.round(item.duration)})) }; })()`);

const externalRequests = requests.filter(({ url }) => !url.startsWith(BASE) && !url.startsWith('data:') && !url.startsWith('blob:'));
const mutatingRequests = requests.filter(({ method }) => !['GET', 'HEAD', 'OPTIONS'].includes(method));
const report = { generatedAt: new Date().toISOString(), environment: { baseUrl: BASE, browserTarget: target.id }, navigation: { home, homeEn }, journey: { intro, back, languagePersistence, result, resultEn, reset }, responsive, reducedMotion, alternative, seo, performance, privacy: { externalRequests, mutatingRequests }, consoleErrors, failedRequests };
await writeFile(resolve(OUTPUT, 'dx07-browser-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
socket.close(); await fetch(`${CDP}/json/close/${target.id}`);
