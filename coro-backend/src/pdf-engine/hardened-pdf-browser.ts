import { ServiceUnavailableException } from '@nestjs/common';
import type puppeteerType from 'puppeteer';

type Puppeteer = typeof puppeteerType;
type Launcher = Pick<Puppeteer, 'launch'>;

/**
 * Chargement paresseux : importer ce module (contrôleurs, specs) ne charge
 * pas Chromium ni le module ESM de puppeteer tant qu'aucun PDF n'est rendu.
 */
function defaultLauncher(): Launcher {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const loaded = require('puppeteer');
  return (loaded.default ?? loaded) as Launcher;
}

/**
 * Moteur PDF durci (audit M1-07).
 *
 * - Aucune requête réseau : seules les ressources intégrées (data:, about:)
 *   sont servies ; tout le reste est bloqué par interception et, en défense
 *   en profondeur, par un proxy factice au niveau du navigateur.
 * - JavaScript des pages désactivé : le HTML rendu (contenu saisi par les
 *   clients) ne peut rien exécuter. Les appels DevTools du serveur
 *   (page.evaluate) restent possibles.
 * - Nombre de navigateurs simultanés limité (PDF_MAX_CONCURRENT_BROWSERS,
 *   2 par défaut) avec file d'attente bornée dans le temps, pour éviter les
 *   pics de mémoire.
 *
 * Le conteneur sert de frontière d'isolation : Chromium y tourne en root,
 * ce qui impose --no-sandbox ; le blocage réseau et JavaScript compense.
 */

export const HARDENED_PDF_BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-sync',
  '--disable-default-apps',
  '--disable-component-update',
  '--no-first-run',
  '--no-default-browser-check',
  '--mute-audio',
  '--proxy-server=http://127.0.0.1:9',
  '--proxy-bypass-list=<-loopback>',
];

export function isAllowedPdfResource(url: string): boolean {
  return url.startsWith('data:') || url.startsWith('about:');
}

function maxConcurrent(): number {
  const value = Number(process.env.PDF_MAX_CONCURRENT_BROWSERS);
  return Number.isInteger(value) && value >= 1 && value <= 8 ? value : 2;
}

const QUEUE_TIMEOUT_MS = 120_000;

class RenderSlots {
  private active = 0;
  private readonly waiting: Array<{
    resolve: () => void;
    timer: NodeJS.Timeout;
  }> = [];

  async acquire(): Promise<void> {
    if (this.active < maxConcurrent()) {
      this.active++;
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const entry = {
        resolve: () => {
          clearTimeout(entry.timer);
          resolve();
        },
        timer: setTimeout(() => {
          const index = this.waiting.indexOf(entry);
          if (index >= 0) this.waiting.splice(index, 1);
          reject(
            new ServiceUnavailableException(
              'Le moteur PDF est occupé. Réessayez dans quelques instants.',
            ),
          );
        }, QUEUE_TIMEOUT_MS),
      };
      this.waiting.push(entry);
    });
  }

  release(): void {
    const next = this.waiting.shift();
    if (next) next.resolve();
    else this.active = Math.max(0, this.active - 1);
  }

  get stats() {
    return { active: this.active, waiting: this.waiting.length };
  }
}

const slots = new RenderSlots();

export function pdfRenderStats() {
  return slots.stats;
}

type LaunchedBrowser = Awaited<ReturnType<Puppeteer['launch']>>;
type LaunchedPage = Awaited<ReturnType<LaunchedBrowser['newPage']>>;

export async function hardenPdfPage<P extends LaunchedPage>(page: P): Promise<P> {
  await page.setJavaScriptEnabled(false);
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (isAllowedPdfResource(request.url())) void request.continue();
    else void request.abort('blockedbyclient');
  });
  return page;
}

export interface HardenedPdfBrowser {
  /** Nouvelle page durcie (JavaScript coupé, réseau bloqué). */
  newPage(): Promise<LaunchedPage>;
}

export async function withHardenedPdfBrowser<T>(
  work: (browser: HardenedPdfBrowser) => Promise<T>,
  launcher?: Launcher,
): Promise<T> {
  await slots.acquire();
  let browser: LaunchedBrowser | null = null;
  try {
    browser = await (launcher ?? defaultLauncher()).launch({
      headless: true,
      args: HARDENED_PDF_BROWSER_ARGS,
    });
    const launched = browser;
    return await work({
      newPage: async () => hardenPdfPage(await launched.newPage()),
    });
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    slots.release();
  }
}

/**
 * Variante pour le code existant structuré en « lancer / try / finally
 * close » : close() ferme le navigateur et libère la place de rendu.
 */
export async function launchHardenedPdfBrowser(
  launcher?: Launcher,
): Promise<HardenedPdfBrowser & { close(): Promise<void> }> {
  await slots.acquire();
  let browser: LaunchedBrowser;
  try {
    browser = await (launcher ?? defaultLauncher()).launch({ headless: true, args: HARDENED_PDF_BROWSER_ARGS });
  } catch (error) {
    slots.release();
    throw error;
  }
  let closed = false;
  return {
    newPage: async () => hardenPdfPage(await browser.newPage()),
    close: async () => {
      if (closed) return;
      closed = true;
      try {
        await browser.close();
      } finally {
        slots.release();
      }
    },
  };
}
