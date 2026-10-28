import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import puppeteer from 'puppeteer';

const siteOrigin = process.env.WEB_AI_QA_SITE_ORIGIN;
const chromePath = process.env.WEB_AI_QA_CHROME_PATH;
if (
  !siteOrigin ||
  !/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(siteOrigin)
)
  throw new Error('WEB_AI_QA_SITE_ORIGIN_LOOPBACK_REQUIRED');
if (!chromePath) throw new Error('WEB_AI_QA_CHROME_PATH_REQUIRED');

const evidenceDir = join(tmpdir(), 'coro-web-ai-final-browser');
await mkdir(evidenceDir, { recursive: true });
const browser = await puppeteer.launch({
  headless: true,
  executablePath: chromePath,
});
const results = [];

try {
  for (const width of [320, 375, 390, 768, 1024, 1440, 1920]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: width < 600 ? 844 : 900 });
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (['127.0.0.1', 'localhost'].includes(url.hostname)) request.continue();
      else request.abort();
    });
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto(`${siteOrigin}/coro-knowledge`, {
      waitUntil: 'networkidle0',
    });
    await page.locator('::-p-aria(Ouvrir CORO AI[role="button"])').click();
    await page
      .locator(
        '::-p-aria(Comment CORO Knowledge fonctionne-t-il ?[role="button"])',
      )
      .click();
    await page.waitForFunction(
      () => document.body.innerText.includes('Sources officielles'),
      { timeout: 10_000 },
    );
    const geometry = await page.evaluate(() => {
      const dialog = document.querySelector('#coro-ai-dialog');
      if (!(dialog instanceof HTMLElement)) throw new Error('DIALOG_MISSING');
      const rect = dialog.getBoundingClientRect();
      return {
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        dialogLeft: rect.left,
        dialogRight: rect.right,
        dialogWidth: rect.width,
        citationCount: dialog.querySelectorAll('a[href^="https://getcoro.io/"]')
          .length,
      };
    });
    assert.equal(geometry.scrollWidth, geometry.innerWidth);
    assert.ok(geometry.dialogLeft >= 0 && geometry.dialogRight <= width + 0.5);
    assert.ok(geometry.citationCount > 0);
    assert.deepEqual(errors, []);
    await page.screenshot({
      path: join(evidenceDir, `documentary-fr-${width}.png`),
      fullPage: false,
    });
    results.push({ width, language: 'fr-CA', ...geometry, consoleErrors: 0 });
    await page.close();
  }

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) request.continue();
    else request.abort();
  });
  await page.goto(`${siteOrigin}/coro-knowledge?lang=en`, {
    waitUntil: 'networkidle0',
  });
  await page.locator('::-p-aria(Open CORO AI[role="button"])').click();
  await page
    .locator('::-p-aria(How does CORO Knowledge work?[role="button"])')
    .click();
  await page.waitForFunction(
    () => document.body.innerText.includes('Official sources'),
    { timeout: 10_000 },
  );
  const english = await page.evaluate(() => ({
    language: document.documentElement.lang,
    officialSources: document.body.innerText.includes('Official sources'),
  }));
  assert.equal(english.officialSources, true);
  await page.screenshot({
    path: join(evidenceDir, 'documentary-en-390.png'),
    fullPage: false,
  });
  results.push({ width: 390, language: 'en-CA', ...english });
  await page.close();
} finally {
  await browser.close();
}

process.stdout.write(
  `${JSON.stringify({ status: 'PASS', evidenceDir, results })}\n`,
);
