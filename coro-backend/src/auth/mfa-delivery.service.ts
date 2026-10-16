import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { isAbsolute, relative, resolve } from 'path';
import { PLATFORM_MFA_EMAIL_SENDER } from './platform-mfa-email';

export interface MfaMessage {
  to: string;
  recipientName?: string;
  subject: string;
  htmlContent: string;
}

@Injectable()
export class MfaDeliveryService {
  private readonly environment = process.env;
  private readonly qaCapture: boolean;
  private readonly captureDirectory?: string;
  private readonly allowedSuffixes: string[];

  constructor() {
    const environment = this.environment;
    this.qaCapture = environment.MFA_QA_CAPTURE_ENABLED === 'true';
    const qaValuesPresent = [
      environment.MFA_QA_CAPTURE_DIR,
      environment.MFA_QA_ALLOWED_RECIPIENT_SUFFIXES,
      environment.MFA_QA_NETWORK_ISOLATED,
    ].some((value) => Boolean(value?.trim()));
    if (!this.qaCapture) {
      if (qaValuesPresent)
        throw new Error('Incomplete MFA QA capture configuration.');
      this.allowedSuffixes = [];
      return;
    }
    if (environment.NODE_ENV === 'production')
      throw new Error('MFA QA capture is forbidden in production.');
    if (environment.MFA_QA_NETWORK_ISOLATED !== 'true')
      throw new Error('MFA QA capture requires explicit network isolation.');
    if (environment.BREVO_API_KEY?.trim())
      throw new Error('MFA QA capture forbids Brevo credentials.');
    if (
      [
        environment.DO_SPACES_KEY,
        environment.DO_SPACES_SECRET,
        environment.DO_SPACES_ENDPOINT,
      ].some((value) => value?.trim())
    ) {
      throw new Error(
        'MFA QA capture forbids production storage configuration.',
      );
    }
    const captureDirectory = environment.MFA_QA_CAPTURE_DIR?.trim();
    if (!captureDirectory || !isAbsolute(captureDirectory))
      throw new Error('MFA QA capture directory must be absolute.');
    const resolvedDirectory = resolve(captureDirectory);
    const relativeToTemp = relative(resolve(tmpdir()), resolvedDirectory);
    if (relativeToTemp.startsWith('..') || isAbsolute(relativeToTemp))
      throw new Error(
        'MFA QA capture directory must be inside the operating-system temporary directory.',
      );
    const suffixes = (environment.MFA_QA_ALLOWED_RECIPIENT_SUFFIXES ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase().replace(/^@/, ''))
      .filter(Boolean);
    if (
      !suffixes.length ||
      suffixes.some(
        (suffix) => !suffix.endsWith('.invalid') && !suffix.endsWith('.test'),
      )
    ) {
      throw new Error('MFA QA recipients must use reserved synthetic domains.');
    }
    this.captureDirectory = resolvedDirectory;
    this.allowedSuffixes = suffixes;
  }

  isQaCapture(): boolean {
    return this.qaCapture;
  }

  async send(message: MfaMessage): Promise<void> {
    if (this.qaCapture) return this.capture(message);
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.environment.BREVO_API_KEY || '',
      },
      body: JSON.stringify({
        sender: PLATFORM_MFA_EMAIL_SENDER,
        to: [
          {
            email: message.to,
            ...(message.recipientName ? { name: message.recipientName } : {}),
          },
        ],
        subject: message.subject,
        htmlContent: message.htmlContent,
      }),
    });
  }

  private async capture(message: MfaMessage): Promise<void> {
    const recipient = message.to.trim().toLowerCase();
    const domain = recipient.split('@')[1];
    if (
      !domain ||
      !this.allowedSuffixes.some(
        (suffix) => domain === suffix || domain.endsWith(`.${suffix}`),
      )
    ) {
      throw new Error('MFA QA capture rejected a non-synthetic recipient.');
    }
    await mkdir(this.captureDirectory!, { recursive: true, mode: 0o700 });
    const digest = createHash('sha256')
      .update(recipient)
      .digest('hex')
      .slice(0, 16);
    const destination = resolve(
      this.captureDirectory!,
      `${Date.now()}-${digest}-${randomUUID()}.json`,
    );
    await writeFile(
      destination,
      JSON.stringify({ ...message, capturedAt: new Date().toISOString() }),
      { encoding: 'utf8', flag: 'wx', mode: 0o600 },
    );
  }
}
