import { mkdtemp, readFile, readdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { MfaDeliveryService, MfaMessage } from './mfa-delivery.service';

describe('MfaDeliveryService QA isolation', () => {
  const originalFetch = global.fetch;
  const environmentKeys = [
    'NODE_ENV',
    'MFA_QA_CAPTURE_ENABLED',
    'MFA_QA_NETWORK_ISOLATED',
    'MFA_QA_CAPTURE_DIR',
    'MFA_QA_ALLOWED_RECIPIENT_SUFFIXES',
    'BREVO_API_KEY',
    'DO_SPACES_KEY',
    'DO_SPACES_SECRET',
    'DO_SPACES_ENDPOINT',
  ] as const;
  const originalEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const message = {
    to: 'founder@example.invalid',
    recipientName: 'Synthetic Founder',
    subject: '123456 — Votre code de connexion CORO',
    htmlContent: '<p>123456</p>',
  };
  let captureDirectory: string;

  beforeEach(async () => {
    captureDirectory = await mkdtemp(join(tmpdir(), 'coro-mfa-qa-'));
    global.fetch = jest.fn();
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    for (const key of environmentKeys) {
      const value = originalEnvironment[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(captureDirectory, { recursive: true, force: true });
  });

  const useEnvironment = (environment: NodeJS.ProcessEnv) => {
    for (const key of environmentKeys) delete process.env[key];
    Object.assign(process.env, environment);
    return new MfaDeliveryService();
  };

  const qaEnvironment = (
    overrides: NodeJS.ProcessEnv = {},
  ): NodeJS.ProcessEnv => ({
    NODE_ENV: 'test',
    MFA_QA_CAPTURE_ENABLED: 'true',
    MFA_QA_NETWORK_ISOLATED: 'true',
    MFA_QA_CAPTURE_DIR: captureDirectory,
    MFA_QA_ALLOWED_RECIPIENT_SUFFIXES: 'example.invalid',
    ...overrides,
  });

  it('reste désactivé par défaut et conserve le transport Brevo', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
    const service = useEnvironment({
      NODE_ENV: 'test',
      BREVO_API_KEY: 'test-key',
    });
    await service.send(message);
    expect(service.isQaCapture()).toBe(false);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.any(Object),
    );
  });

  it.each([
    ['production runtime', { NODE_ENV: 'production' }],
    ['network isolation missing', { MFA_QA_NETWORK_ISOLATED: 'false' }],
    ['Brevo credential present', { BREVO_API_KEY: 'forbidden' }],
    [
      'production storage configured',
      { DO_SPACES_ENDPOINT: 'https://storage.example.test' },
    ],
  ])('refuse QA capture when %s', (_label, overrides) => {
    expect(() => useEnvironment(qaEnvironment(overrides))).toThrow();
  });

  it('refuse une configuration QA partielle lorsque le mode est désactivé', () => {
    expect(() =>
      useEnvironment({
        NODE_ENV: 'test',
        MFA_QA_CAPTURE_DIR: captureDirectory,
      }),
    ).toThrow('Incomplete');
  });

  it('refuse un répertoire hors du répertoire temporaire système', () => {
    expect(() =>
      useEnvironment(
        qaEnvironment({ MFA_QA_CAPTURE_DIR: join(process.cwd(), 'capture') }),
      ),
    ).toThrow('temporary');
  });

  it('refuse un suffixe qui ne correspond pas à un domaine synthétique réservé', () => {
    expect(() =>
      useEnvironment(
        qaEnvironment({ MFA_QA_ALLOWED_RECIPIENT_SUFFIXES: 'example.com' }),
      ),
    ).toThrow('reserved');
  });

  it('capture localement sans appeler Brevo', async () => {
    const service = useEnvironment(qaEnvironment());
    await service.send(message);
    const files = await readdir(captureDirectory);
    expect(files).toHaveLength(1);
    const capture = JSON.parse(
      await readFile(join(captureDirectory, files[0]), 'utf8'),
    ) as MfaMessage & { capturedAt: string };
    expect(capture).toMatchObject(message);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('refuse un destinataire non synthétique sans fallback externe', async () => {
    const service = useEnvironment(qaEnvironment());
    await expect(
      service.send({ ...message, to: 'person@example.com' }),
    ).rejects.toThrow('non-synthetic');
    expect(await readdir(captureDirectory)).toHaveLength(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('échoue fermé lorsque la capture locale échoue', async () => {
    await rm(captureDirectory, { recursive: true, force: true });
    await writeFile(captureDirectory, 'not-a-directory');
    const service = useEnvironment(qaEnvironment());
    await expect(service.send(message)).rejects.toThrow();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
