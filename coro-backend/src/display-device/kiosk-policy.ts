export const PLAYER_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' blob:",
  "connect-src 'self'",
  "font-src 'self'",
  "media-src 'self' blob:",
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",
  "base-uri 'none'",
  "navigate-to 'self'",
].join('; ');

export const KIOSK_FORBIDDEN_FLAGS = [
  '--no-sandbox',
  '--disable-web-security',
  '--ignore-certificate-errors',
  '--remote-debugging-address',
  '--remote-debugging-port',
  '--remote-debugging-pipe',
  '--allow-running-insecure-content',
  '--disable-site-isolation-trials',
  '--proxy-server',
];

export function validateKioskArguments(args: string[]): void {
  const flagNames = args.map((argument) => argument.split('=', 1)[0]);
  for (const forbidden of KIOSK_FORBIDDEN_FLAGS)
    if (flagNames.includes(forbidden)) throw new Error('UNSAFE_KIOSK_FLAG');
  if (!args.includes('--kiosk')) throw new Error('KIOSK_MODE_REQUIRED');
  if (
    args.some(
      (arg) =>
        arg.startsWith('--load-extension') ||
        arg.startsWith('--disable-extensions-except'),
    )
  )
    throw new Error('KIOSK_EXTENSION_FORBIDDEN');
}

export interface KioskLaunchConfiguration {
  args: string[];
  applicationUrl: string;
  localBindAddress: string;
  devToolsEnabled: boolean;
  downloadsEnabled: boolean;
}

export function validateKioskLaunchConfiguration(
  configuration: KioskLaunchConfiguration,
): void {
  validateKioskArguments(configuration.args);
  let application: URL;
  try {
    application = new URL(configuration.applicationUrl);
  } catch {
    throw new Error('KIOSK_ORIGIN_INVALID');
  }
  if (
    !['app:', 'http:', 'https:'].includes(application.protocol) ||
    (['http:', 'https:'].includes(application.protocol) &&
      !['127.0.0.1', 'localhost', '[::1]'].includes(application.hostname))
  )
    throw new Error('KIOSK_ORIGIN_FORBIDDEN');
  if (
    !['127.0.0.1', '::1', 'localhost'].includes(configuration.localBindAddress)
  )
    throw new Error('KIOSK_PUBLIC_BIND_FORBIDDEN');
  if (configuration.devToolsEnabled)
    throw new Error('KIOSK_DEVTOOLS_FORBIDDEN');
  if (configuration.downloadsEnabled)
    throw new Error('KIOSK_DOWNLOADS_FORBIDDEN');
}

export class RestartWatchdog {
  private readonly restarts: number[] = [];

  constructor(
    private readonly maximumRestarts = 3,
    private readonly windowMs = 5 * 60_000,
  ) {}

  allowRestart(now: Date): boolean {
    const threshold = now.getTime() - this.windowMs;
    while (this.restarts.length && this.restarts[0] < threshold)
      this.restarts.shift();
    if (this.restarts.length >= this.maximumRestarts) return false;
    this.restarts.push(now.getTime());
    return true;
  }
}
