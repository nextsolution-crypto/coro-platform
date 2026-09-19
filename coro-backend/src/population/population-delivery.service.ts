import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  POPULATION_EMAIL_TIMEOUT_DEFAULT_MS,
  POPULATION_EMAIL_TIMEOUT_MAX_MS,
} from './population-delivery.constants';

export type PopulationProviderResult = {
  provider: 'BREVO';
  providerMessageId: string | null;
};

export type PopulationProviderOutcome =
  | 'NON_RETRYABLE'
  | 'RETRYABLE_CONFIRMED'
  | 'OUTCOME_UNKNOWN';

function classifyProviderCode(code: string): PopulationProviderOutcome {
  if (code === 'BREVO_NETWORK_ERROR' || code === 'BREVO_TIMEOUT') {
    return 'OUTCOME_UNKNOWN';
  }
  const status = Number(code.replace('BREVO_HTTP_', ''));
  if (status === 429) return 'RETRYABLE_CONFIRMED';
  if (status >= 500) return 'OUTCOME_UNKNOWN';
  return 'NON_RETRYABLE';
}

export class PopulationProviderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly outcome: PopulationProviderOutcome = classifyProviderCode(
      code,
    ),
  ) {
    super(message);
    this.name = 'PopulationProviderError';
  }
}

@Injectable()
export class PopulationDeliveryService {
  private getEmailTimeoutMs(): number {
    const configured = process.env.POPULATION_EMAIL_TIMEOUT_MS?.trim();
    if (!configured) return POPULATION_EMAIL_TIMEOUT_DEFAULT_MS;
    const timeout = Number(configured);
    if (
      !Number.isInteger(timeout) ||
      timeout <= 0 ||
      timeout > POPULATION_EMAIL_TIMEOUT_MAX_MS
    ) {
      throw new PopulationProviderError(
        'EMAIL_TIMEOUT_INVALID',
        'La configuration du délai courriel est invalide',
        'NON_RETRYABLE',
      );
    }
    return timeout;
  }

  private getApiKey(): string {
    const apiKey = process.env.BREVO_API_KEY;

    if (!apiKey) {
      throw new PopulationProviderError(
        'BREVO_NOT_CONFIGURED',
        'Le fournisseur de communication n’est pas configuré',
      );
    }

    return apiKey;
  }

  private sanitizeProviderError(value: unknown): string {
    if (typeof value !== 'string') {
      return 'Erreur du fournisseur de communication';
    }

    /*
     * Ne jamais conserver dans PopulationAlertDelivery
     * une réponse fournisseur arbitrairement longue.
     */
    return value.replace(/\s+/g, ' ').trim().slice(0, 500);
  }

  private async readProviderResponse(response: Response): Promise<any> {
    const text = await response.text();

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return {
        message: this.sanitizeProviderError(text),
      };
    }
  }

  async sendSms(
    destination: string,
    message: string,
  ): Promise<PopulationProviderResult> {
    const apiKey = this.getApiKey();

    let response: Response;

    try {
      response = await fetch('https://api.brevo.com/v3/transactionalSMS/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          sender: process.env.BREVO_SMS_SENDER || 'CORO',
          recipient: destination,
          content: message,
          type: 'transactional',
        }),
      });
    } catch {
      throw new PopulationProviderError(
        'BREVO_NETWORK_ERROR',
        'Le fournisseur SMS est temporairement inaccessible',
        'NON_RETRYABLE',
      );
    }

    const body = await this.readProviderResponse(response);

    if (!response.ok) {
      const providerMessage =
        body?.message || body?.error || `HTTP ${response.status}`;

      throw new PopulationProviderError(
        `BREVO_HTTP_${response.status}`,
        this.sanitizeProviderError(String(providerMessage)),
        'NON_RETRYABLE',
      );
    }

    const messageId = body?.messageId ?? body?.message_id ?? body?.id ?? null;

    return {
      provider: 'BREVO',
      providerMessageId: messageId === null ? null : String(messageId),
    };
  }

  async sendEmail(data: {
    destination: string;
    subject: string;
    html: string;
    providerIdempotencyKey?: string;
  }): Promise<PopulationProviderResult> {
    const apiKey = this.getApiKey();
    const timeoutMs = this.getEmailTimeoutMs();
    const requestBody = JSON.stringify({
      sender: {
        name: 'CORO Sentinelle',
        email: process.env.BREVO_SENDER_EMAIL || 'info@getcoro.io',
      },
      to: [
        {
          email: data.destination,
        },
      ],
      subject: data.subject,
      htmlContent: data.html,
      headers: {
        idempotencyKey: data.providerIdempotencyKey ?? randomUUID(),
      },
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    let body: any;

    try {
      response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: requestBody,
        signal: controller.signal,
      });
      body = await this.readProviderResponse(response);
    } catch {
      throw new PopulationProviderError(
        controller.signal.aborted ? 'BREVO_TIMEOUT' : 'BREVO_NETWORK_ERROR',
        controller.signal.aborted
          ? 'Le délai de réponse du fournisseur courriel est dépassé'
          : 'Le résultat de la tentative courriel est inconnu',
        'OUTCOME_UNKNOWN',
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const providerMessage =
        body?.message || body?.error || `HTTP ${response.status}`;

      throw new PopulationProviderError(
        `BREVO_HTTP_${response.status}`,
        this.sanitizeProviderError(String(providerMessage)),
      );
    }

    const messageId = body?.messageId ?? body?.message_id ?? body?.id ?? null;

    if (messageId === null) {
      throw new PopulationProviderError(
        'BREVO_MESSAGE_ID_MISSING',
        'Le fournisseur a répondu sans identifiant de message',
        'OUTCOME_UNKNOWN',
      );
    }

    return {
      provider: 'BREVO',
      providerMessageId: String(messageId),
    };
  }
}
