import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const puppeteer = require('../../coro-backend/node_modules/puppeteer');

const origin = process.env.WEB_AI_03_WEBSITE_ORIGIN ?? 'http://127.0.0.1:3183';
const evidenceRoot =
  process.env.WEB_AI_03_EVIDENCE_DIR ?? join(tmpdir(), 'coro-web-ai-03-evidence');
const cases = [
  { name: 'fr-desktop', language: 'fr-CA', query: '', width: 1440, height: 900 },
  { name: 'en-desktop', language: 'en-CA', query: '?lang=en', width: 1440, height: 900 },
  { name: 'fr-mobile', language: 'fr-CA', query: '', width: 390, height: 844 },
  { name: 'en-mobile', language: 'en-CA', query: '?lang=en', width: 390, height: 844 },
];

await mkdir(evidenceRoot, { recursive: true });
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const results = [];

try {
  for (const scenario of cases) {
    const page = await browser.newPage();
    await page.setViewport({ width: scenario.width, height: scenario.height });
    const consoleErrors = [];
    const assistantRequests = [];
    page.on('console', (entry) => {
      if (entry.type() === 'error') consoleErrors.push(entry.text());
    });
    page.on('request', (request) => {
      if (request.url().includes('/api/chat/v1/public-assistant')) {
        assistantRequests.push(JSON.parse(request.postData() ?? '{}'));
      }
    });

    await page.goto(`${origin}/${scenario.query}`, {
      waitUntil: 'networkidle0',
      timeout: 30_000,
    });
    const openLabel = scenario.language === 'fr-CA' ? 'Ouvrir CORO AI' : 'Open CORO AI';
    await page.waitForSelector(`button[aria-label="${openLabel}"]`);
    await page.$eval(`button[aria-label="${openLabel}"]`, (button) =>
      button.click(),
    );
    const opened = await page.evaluate(() => Boolean(document.querySelector('#coro-ai-dialog')));
    if (!opened) {
      throw new Error(
        `CHAT_DIALOG_DID_NOT_OPEN:${scenario.name}:${consoleErrors.join('|')}`,
      );
    }
    await page.waitForSelector('#coro-ai-dialog');
    const inputLabel =
      scenario.language === 'fr-CA'
        ? 'Posez une question sur CORO…'
        : 'Ask a question about CORO…';
    const question =
      scenario.language === 'fr-CA'
        ? 'Comment fonctionne CORO Knowledge ?'
        : 'How does CORO Knowledge work?';
    await page.type(`input[aria-label="${inputLabel}"]`, question);
    const responseStartedAt = Date.now();
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () => document.querySelectorAll('#coro-ai-dialog article').length >= 2,
      { timeout: 15_000 },
    );
    const responseMs = Date.now() - responseStartedAt;
    const observation = await page.evaluate(() => {
      const dialog = document.querySelector('#coro-ai-dialog');
      const storage = {
        local: Object.keys(localStorage),
        session: Object.keys(sessionStorage),
      };
      return {
        lang: document.documentElement.lang,
        dialogRole: dialog?.getAttribute('role'),
        citations: dialog?.querySelectorAll('a[href*="getcoro.io"]').length ?? 0,
        officialLinks: dialog?.querySelectorAll('a[href^="/"]').length ?? 0,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        dialogOverflow: dialog ? dialog.scrollWidth > dialog.clientWidth : true,
        storage,
        reducedMotionRule: [...document.styleSheets].some((sheet) => {
          try {
            return [...sheet.cssRules].some((rule) =>
              rule.cssText.includes('prefers-reduced-motion'),
            );
          } catch {
            return false;
          }
        }),
      };
    });
    await page.screenshot({
      path: join(evidenceRoot, `${scenario.name}.png`),
      fullPage: false,
    });

    const request = assistantRequests.at(-1);
    const pass =
      observation.dialogRole === 'dialog' &&
      observation.citations > 0 &&
      observation.officialLinks > 0 &&
      !observation.horizontalOverflow &&
      !observation.dialogOverflow &&
      observation.storage.local.length === 0 &&
      observation.storage.session.length === 0 &&
      observation.reducedMotionRule &&
      request?.message === question &&
      request?.language === scenario.language &&
      request?.pageContext?.pathname === '/' &&
      !('history' in (request ?? {})) &&
      consoleErrors.length === 0;

    results.push({
      ...scenario,
      pass,
      responseMs,
      observation,
      requestShape: request ? Object.keys(request).sort() : [],
      consoleErrors,
    });
    await page.close();
  }
} finally {
  await browser.close();
}

const report = {
  status: results.every((result) => result.pass) ? 'PASS' : 'FAIL',
  origin,
  generatedAt: new Date().toISOString(),
  cases: results,
};
await writeFile(join(evidenceRoot, 'browser-results.json'), JSON.stringify(report, null, 2));
process.stdout.write(`${JSON.stringify(report)}\n`);
if (report.status !== 'PASS') process.exitCode = 1;
