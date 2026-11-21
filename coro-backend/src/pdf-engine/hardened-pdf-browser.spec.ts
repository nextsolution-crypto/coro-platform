jest.mock('puppeteer', () => ({ __esModule: true, default: {} }));
import {
  HARDENED_PDF_BROWSER_ARGS,
  isAllowedPdfResource,
  launchHardenedPdfBrowser,
  pdfRenderStats,
  withHardenedPdfBrowser,
} from './hardened-pdf-browser';

function fakeLauncher() {
  const handlers: Array<(request: any) => void> = [];
  const page = {
    setJavaScriptEnabled: jest.fn().mockResolvedValue(undefined),
    setRequestInterception: jest.fn().mockResolvedValue(undefined),
    on: jest.fn((event: string, handler: any) => {
      if (event === 'request') handlers.push(handler);
    }),
  };
  const browser = {
    newPage: jest.fn().mockResolvedValue(page),
    close: jest.fn().mockResolvedValue(undefined),
  };
  const launcher = { launch: jest.fn().mockResolvedValue(browser) };
  return { launcher, browser, page, handlers };
}

describe('moteur PDF durci (M1-07)', () => {
  it('coupe JavaScript et bloque toute ressource non intégrée', async () => {
    const fake = fakeLauncher();
    await withHardenedPdfBrowser(async (browser) => {
      await browser.newPage();
    }, fake.launcher as any);
    expect(fake.launcher.launch).toHaveBeenCalledWith({
      headless: true,
      args: HARDENED_PDF_BROWSER_ARGS,
    });
    expect(fake.page.setJavaScriptEnabled).toHaveBeenCalledWith(false);
    expect(fake.page.setRequestInterception).toHaveBeenCalledWith(true);
    const request = (url: string) => ({
      url: () => url,
      continue: jest.fn(),
      abort: jest.fn(),
    });
    const remote = request('https://exemple.test/pixel.png');
    const inline = request('data:image/png;base64,AAAA');
    fake.handlers[0](remote);
    fake.handlers[0](inline);
    expect(remote.abort).toHaveBeenCalled();
    expect(remote.continue).not.toHaveBeenCalled();
    expect(inline.continue).toHaveBeenCalled();
    expect(fake.browser.close).toHaveBeenCalledTimes(1);
  });

  it('autorise seulement data: et about:', () => {
    expect(isAllowedPdfResource('data:text/css,')).toBe(true);
    expect(isAllowedPdfResource('about:blank')).toBe(true);
    expect(isAllowedPdfResource('http://169.254.169.254/')).toBe(false);
    expect(isAllowedPdfResource('file:///etc/passwd')).toBe(false);
    expect(HARDENED_PDF_BROWSER_ARGS).toContain('--proxy-server=http://127.0.0.1:9');
  });

  it('limite les navigateurs simultanés et libère la place après erreur', async () => {
    const fake = fakeLauncher();
    let release!: () => void;
    const blocker = new Promise<void>((resolve) => (release = resolve));
    const first = withHardenedPdfBrowser(() => blocker, fake.launcher as any);
    const second = withHardenedPdfBrowser(() => blocker, fake.launcher as any);
    const third = withHardenedPdfBrowser(async () => 'ok', fake.launcher as any);
    await new Promise((resolve) => setImmediate(resolve));
    expect(pdfRenderStats()).toEqual({ active: 2, waiting: 1 });
    expect(fake.launcher.launch).toHaveBeenCalledTimes(2);
    release();
    await Promise.all([first, second]);
    await expect(third).resolves.toBe('ok');
    await expect(
      withHardenedPdfBrowser(async () => {
        throw new Error('rendu');
      }, fake.launcher as any),
    ).rejects.toThrow('rendu');
    expect(pdfRenderStats()).toEqual({ active: 0, waiting: 0 });
  });

  it('close() de la variante lancée libère la place une seule fois', async () => {
    const fake = fakeLauncher();
    const browser = await launchHardenedPdfBrowser(fake.launcher as any);
    expect(pdfRenderStats().active).toBe(1);
    await browser.close();
    await browser.close();
    expect(pdfRenderStats().active).toBe(0);
    expect(fake.browser.close).toHaveBeenCalledTimes(1);
  });
});
