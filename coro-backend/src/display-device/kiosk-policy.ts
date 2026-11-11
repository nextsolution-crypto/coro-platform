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
];

export function validateKioskArguments(args: string[]): void {
  for (const forbidden of KIOSK_FORBIDDEN_FLAGS)
    if (args.includes(forbidden)) throw new Error('UNSAFE_KIOSK_FLAG');
  if (!args.includes('--kiosk')) throw new Error('KIOSK_MODE_REQUIRED');
  if (args.some((arg) => arg.startsWith('--load-extension')))
    throw new Error('KIOSK_EXTENSION_FORBIDDEN');
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
