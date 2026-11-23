import { Inject, Injectable, Logger } from '@nestjs/common';

/*
 * L'ancien clavardage du site (POST /chat/vitrine, API Anthropic aux
 * États-Unis) a été retiré le 23 nov. 2026 : Sophie passe désormais par
 * l'assistant public (corpus du site, Bedrock au Canada). Ce service ne
 * conserve que l'avis courriel de demande de contact.
 */

export const CHAT_HTTP_CLIENT = Symbol('CHAT_HTTP_CLIENT');
export type ChatHttpClient = typeof fetch;

export interface NotificationResult {
  success: boolean;
  status:
    | 'SENT'
    | 'CONFIGURATION_ERROR'
    | 'PROVIDER_ERROR'
    | 'INVALID_PROVIDER_RESPONSE';
}

export function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return Array.from(
    value,
    (character) => entities[character] ?? character,
  ).join('');
}

function isBrevoPayload(value: unknown): value is { messageId: string } {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { messageId?: unknown }).messageId === 'string' &&
    (value as { messageId: string }).messageId.length > 0
  );
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly notificationRequests = new Map<
    string,
    Promise<NotificationResult>
  >();

  constructor(
    @Inject(CHAT_HTTP_CLIENT) private readonly httpClient: ChatHttpClient,
  ) {}

  notifyAgent(
    email: string,
    summary: string,
    requestId: string,
  ): Promise<NotificationResult> {
    const existing = this.notificationRequests.get(requestId);
    if (existing) return existing;
    const operation = this.deliverNotification(email, summary).then(
      (result) => {
        if (!result.success) {
          this.notificationRequests.delete(requestId);
        } else {
          const expiry = setTimeout(
            () => this.notificationRequests.delete(requestId),
            15 * 60_000,
          );
          expiry.unref();
        }
        return result;
      },
    );
    this.notificationRequests.set(requestId, operation);
    return operation;
  }

  private async deliverNotification(
    email: string,
    summary: string,
  ): Promise<NotificationResult> {
    if (!process.env.BREVO_API_KEY)
      return { success: false, status: 'CONFIGURATION_ERROR' };
    const safeEmail = escapeHtml(email.trim());
    const safeSummary = escapeHtml(summary.trim());
    try {
      const response = await this.httpClient(
        'https://api.brevo.com/v3/smtp/email',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': process.env.BREVO_API_KEY,
          },
          signal: AbortSignal.timeout(10_000),
          body: JSON.stringify({
            sender: { name: 'CORO Chat', email: 'info@getcoro.io' },
            to: [{ email: 'info@getcoro.io', name: 'Équipe CORO' }],
            subject: 'Demande volontaire de contact depuis getcoro.io',
            htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px"><h2>Demande de contact</h2><p><strong>Courriel :</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p><p><strong>Résumé fourni avec consentement :</strong></p><pre style="white-space:pre-wrap">${safeSummary}</pre></div>`,
          }),
        },
      );
      if (!response.ok) {
        this.logger.warn(`Brevo request failed with HTTP ${response.status}`);
        return { success: false, status: 'PROVIDER_ERROR' };
      }
      const payload: unknown = await response.json();
      if (!isBrevoPayload(payload)) {
        this.logger.warn('Brevo returned an invalid response shape');
        return { success: false, status: 'INVALID_PROVIDER_RESPONSE' };
      }
      return { success: true, status: 'SENT' };
    } catch {
      this.logger.warn('Brevo request unavailable (transport or timeout)');
      return { success: false, status: 'PROVIDER_ERROR' };
    }
  }
}
