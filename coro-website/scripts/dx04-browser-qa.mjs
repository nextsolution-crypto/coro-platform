import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const BASE = 'http://127.0.0.1:3414';
const CDP = 'http://127.0.0.1:9334';
const OUTPUT = resolve('docs/diagnostic/evidence/dx04');

class CdpSession {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result);
        return;
      }
      for (const listener of this.events.get(message.method) ?? []) listener(message.params);
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolvePromise, reject) => {
      this.pending.set(id, { resolve: resolvePromise, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, listener) {
    const listeners = this.events.get(method) ?? [];
    listeners.push(listener);
    this.events.set(method, listeners);
  }
}

const delay = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

async function createSession() {
  const target = await fetch(`${CDP}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' }).then((response) => response.json());
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolvePromise, reject) => {
    socket.addEventListener('open', resolvePromise, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  return { session: new CdpSession(socket), socket, target };
}

const { session, socket, target } = await createSession();
await Promise.all([
  session.send('Page.enable'),
  session.send('Runtime.enable'),
  session.send('Network.enable'),
  session.send('Log.enable'),
]);

const consoleErrors = [];
const failedRequests = [];
const requests = [];
session.on('Runtime.consoleAPICalled', (event) => {
  if (event.type === 'error') consoleErrors.push(event.args.map((arg) => arg.value ?? arg.description ?? '').join(' '));
});
session.on('Log.entryAdded', ({ entry }) => {
  if (entry.level === 'error') consoleErrors.push(entry.text);
});
session.on('Network.requestWillBeSent', ({ request }) => requests.push({ method: request.method, url: request.url, type: request.resourceType }));
session.on('Network.loadingFailed', (event) => failedRequests.push({ url: event.url ?? null, error: event.errorText, canceled: event.canceled ?? false }));

async function evaluate(expression, awaitPromise = true) {
  const response = await session.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text ?? 'Browser evaluation failed');
  return response.result.value;
}

async function viewport(width, height = 900) {
  await session.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768, screenWidth: width, screenHeight: height });
}

async function navigate(path) {
  await session.send('Page.navigate', { url: `${BASE}${path}` });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    await delay(50);
    if (await evaluate('document.readyState === "complete"')) break;
  }
  await delay(250);
}

async function screenshot(name) {
  const result = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  await writeFile(resolve(OUTPUT, name), Buffer.from(result.data, 'base64'));
}

async function clickText(selector, text) {
  let clicked = false;
  for (let attempt = 0; attempt < 40 && !clicked; attempt += 1) {
    clicked = await evaluate(`(() => { const element = [...document.querySelectorAll(${JSON.stringify(selector)})].find((node) => node.textContent?.trim().includes(${JSON.stringify(text)})); if (!element) return false; element.click(); return true; })()`);
    if (!clicked) await delay(50);
  }
  if (!clicked) {
    const visibleText = await evaluate(`document.body.innerText.slice(0, 1000)`);
    throw new Error(`Could not click ${text} within ${selector}. Console errors: ${JSON.stringify(consoleErrors)}. Visible text: ${visibleText}`);
  }
  await delay(120);
}

async function scrollText(text) {
  let found = false;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    found = await evaluate(`(() => { const element = [...document.querySelectorAll('h1,h2,h3,p,a,small')].find((node) => node.textContent?.includes(${JSON.stringify(text)})); if (!element) return false; element.scrollIntoView({ block: 'center' }); return true; })()`);
    if (!found) break;
    await delay(250);
  }
  if (!found) throw new Error(`Could not find text: ${text}`);
}

async function geometry(label, width, path) {
  await viewport(width, width <= 390 ? 844 : width <= 768 ? 900 : 1000);
  await navigate(path);
  const measurement = await evaluate(`(() => {
    const viewportWidth = window.innerWidth;
    const offenders = [...document.querySelectorAll('body *')].map((element) => {
      const rect = element.getBoundingClientRect();
      return { tag: element.tagName, text: (element.textContent || '').trim().slice(0, 60), left: Math.round(rect.left * 10) / 10, right: Math.round(rect.right * 10) / 10, width: Math.round(rect.width * 10) / 10 };
    }).filter((rect) => rect.width > 0 && (rect.left < -1 || rect.right > viewportWidth + 1)).slice(0, 10);
    const main = document.querySelector('main')?.getBoundingClientRect();
    const inviteTitle = [...document.querySelectorAll('h3')].find((node) => node.textContent?.includes('Votre organisation est-elle réellement prête'));
    const invite = inviteTitle?.closest('aside')?.getBoundingClientRect();
    return { viewportWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, overflow: document.documentElement.scrollWidth > viewportWidth + 1, offenders, main: main ? { left: main.left, right: main.right, width: main.width } : null, invite: invite ? { left: invite.left, right: invite.right, width: invite.width, top: invite.top, bottom: invite.bottom } : null };
  })()`);
  return { label, width, path, ...measurement };
}

await mkdir(OUTPUT, { recursive: true });
const responsive = [];
for (const width of [320, 375, 390, 768, 1024, 1440, 1920]) {
  responsive.push(await geometry('home-fr', width, '/'));
  responsive.push(await geometry('diagnostic-fr', width, '/diagnostic'));
}

await viewport(1440, 900);
await navigate('/');
await scrollText('Votre organisation est-elle réellement prête');
await screenshot('01-home-fr-desktop.png');

await navigate('/?lang=en');
await scrollText('Is your organization truly ready');
await screenshot('02-home-en-desktop.png');

await viewport(390, 844);
await navigate('/');
await scrollText('Votre organisation est-elle réellement prête');
await evaluate('window.scrollBy(0, 430)');
await delay(100);
await screenshot('03-home-fr-mobile.png');

await viewport(1440, 900);
await navigate('/');
await evaluate(`document.querySelector('[data-group="resources"] > button')?.click()`);
await delay(100);
await screenshot('04-navigation-resources-desktop.png');

await viewport(390, 844);
await navigate('/');
await clickText('header button', 'Ouvrir le menu');
await clickText('nav[aria-label="Navigation mobile"] button', 'Ressources');
await screenshot('05-navigation-mobile.png');

await viewport(1440, 900);
await navigate('/');
await evaluate('window.scrollTo(0, document.documentElement.scrollHeight)');
await delay(100);
await screenshot('06-footer-diagnostic-link.png');

await navigate('/diagnostic');
await screenshot('07-diagnostic-fr.png');
const initialStorage = await evaluate(`({ local: Object.keys(localStorage), session: Object.keys(sessionStorage), cookies: document.cookie })`);

await navigate('/diagnostic?lang=en');
await screenshot('08-diagnostic-en.png');

await navigate('/diagnostic');
await clickText('button', 'Commencer le diagnostic');
const questionTitles = [];
for (let question = 0; question < 8; question += 1) {
  questionTitles.push(await evaluate(`document.querySelector('#question-title')?.textContent`));
  const selected = await evaluate(`(() => { const input = document.querySelector('input[type="radio"][value="A"]'); if (!input) return false; input.click(); return true; })()`);
  if (!selected) throw new Error(`Question ${question + 1}: answer A unavailable`);
  await delay(40);
  await clickText('button', question === 7 ? 'Terminer' : 'Suivant');
}
await evaluate('window.scrollTo(0, 0)');
await delay(100);
await screenshot('09-result-fr.png');
const resultFr = await evaluate(`({
  title: document.querySelector('h1')?.textContent,
  temporary: document.body.innerText.includes("Votre résultat est temporaire"),
  restart: [...document.querySelectorAll('button')].some((button) => button.textContent?.includes('Recommencer')),
  mainCount: document.querySelectorAll('main').length,
  sessionKeys: Object.keys(sessionStorage), localKeys: Object.keys(localStorage), cookies: document.cookie
})`);

await clickText('button', 'View result in English');
await screenshot('10-result-en.png');
const resultEn = await evaluate(`({
  title: document.querySelector('h1')?.textContent,
  temporary: document.body.innerText.includes('Your result is temporary'),
  restart: [...document.querySelectorAll('button')].some((button) => button.textContent?.includes('Start again'))
})`);
await clickText('button', 'Start again');
const restarted = await evaluate(`({ intro: document.body.innerText.includes('Commencer le diagnostic'), sessionKeys: Object.keys(sessionStorage) })`);

await viewport(1440, 900);
await navigate('/');
const integrationFr = await evaluate(`({
  nav: [...document.querySelectorAll('[data-group="resources"] a')].filter((node) => node.textContent?.includes('Évaluer ma préparation')).map((node) => node.href),
  footer: [...document.querySelectorAll('footer a')].filter((node) => node.textContent?.includes('Diagnostic Express')).map((node) => node.href),
  footerGroups: document.querySelectorAll('footer [data-footer-group]').length || document.querySelectorAll('footer > div > div').length
})`);
await navigate('/diagnostic');
const seoFr = await evaluate(`({ title: document.title, description: document.querySelector('meta[name="description"]')?.content, canonical: document.querySelector('link[rel="canonical"]')?.href, alternates: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((node) => ({ lang: node.hreflang, href: node.href })), robots: document.querySelector('meta[name="robots"]')?.content })`);
await navigate('/diagnostic?lang=en');
const seoEn = await evaluate(`({ title: document.title, description: document.querySelector('meta[name="description"]')?.content, canonical: document.querySelector('link[rel="canonical"]')?.href, alternates: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((node) => ({ lang: node.hreflang, href: node.href })), robots: document.querySelector('meta[name="robots"]')?.content })`);
const sitemap = await fetch(`${BASE}/sitemap.xml`).then((response) => response.text());

const report = {
  generatedAt: new Date().toISOString(),
  environment: { baseUrl: BASE, browserTarget: target.id, branch: 'feature/coro-diagnostic-express-v1' },
  responsive,
  resultFr,
  resultEn,
  questionTitles,
  restarted,
  storage: { initial: initialStorage },
  seo: { fr: seoFr, en: seoEn, sitemapHasFr: sitemap.includes('<loc>https://getcoro.io/diagnostic</loc>'), sitemapHasEn: sitemap.includes('<loc>https://getcoro.io/diagnostic?lang=en</loc>') || sitemap.includes('<loc>https://getcoro.io/diagnostic&amp;lang=en</loc>') },
  integration: { fr: integrationFr },
  network: {
    mutatingRequests: requests.filter(({ method }) => !['GET', 'HEAD', 'OPTIONS'].includes(method)),
    externalRequests: requests.filter(({ url }) => !url.startsWith(BASE) && !url.startsWith('data:') && !url.startsWith('blob:') && !url.startsWith('chrome:')),
    failedRequests: failedRequests.filter((request) => !request.canceled),
    canceledNavigationRequests: failedRequests.filter((request) => request.canceled).length,
  },
  consoleErrors,
};
await writeFile(resolve(OUTPUT, 'dx04-browser-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));

socket.close();
await fetch(`${CDP}/json/close/${target.id}`);
