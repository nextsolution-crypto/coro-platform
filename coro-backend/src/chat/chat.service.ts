import { Inject, Injectable, Logger } from '@nestjs/common';
import { ChatHistoryMessageDto } from './chat.dto';

export const CHAT_HTTP_CLIENT = Symbol('CHAT_HTTP_CLIENT');
export type ChatHttpClient = typeof fetch;

const CORO_CONTEXT = `Tu es l'assistant virtuel du site public de CORO, une plateforme canadienne de conformité opérationnelle et de résilience organisationnelle.

Capacités publiques confirmées : PMU (plan de mesures d'urgence), PSI (plan de sécurité incendie) et PCA (plan de continuité des activités). Les PGC, PRA et PUE sont planifiés pour une phase ultérieure et ne doivent jamais être présentés comme disponibles aujourd'hui.

Réponds dans la langue du visiteur, de façon concise et factuelle. N'invente jamais une fonctionnalité, un prix, une disponibilité, une conformité juridique, une action effectuée ni un engagement de rappel. Pour une demande commerciale, invite seulement le visiteur à utiliser volontairement le formulaire de contact affiché dans le chat. Tu ne peux ni transmettre une conversation, ni confirmer qu'un conseiller contactera le visiteur. Si l'information n'est pas confirmée, dis-le clairement.`;

const CONTACT_KEYWORDS = [
  'prix',
  'tarif',
  'coût',
  'abonnement',
  'démo',
  'demo',
  'conseiller',
  'contact',
  'price',
  'pricing',
  'advisor',
  'contact us',
];

export interface ChatResult {
  reply: string;
  contactSuggested: boolean;
  /** Compatibilité du contrat historique : cette valeur ne déclenche aucun envoi. */
  transferToAgent: boolean;
  status: 'ANSWERED' | 'UNAVAILABLE';
}

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

function isAnthropicPayload(
  value: unknown,
): value is { content: Array<{ text: string }> } {
  if (!value || typeof value !== 'object') return false;
  const content = (value as { content?: unknown }).content;
  if (!Array.isArray(content) || content.length === 0) return false;
  const first: unknown = content[0];
  return (
    !!first &&
    typeof first === 'object' &&
    typeof (first as { text?: unknown }).text === 'string'
  );
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

  async handleMessage(
    message: string,
    history: ChatHistoryMessageDto[],
  ): Promise<ChatResult> {
    const normalizedMessage = message.trim();
    const contactSuggested = CONTACT_KEYWORDS.some((keyword) =>
      normalizedMessage.toLocaleLowerCase('fr-CA').includes(keyword),
    );
    if (!process.env.ANTHROPIC_API_KEY)
      return this.unavailable(contactSuggested);

    try {
      const response = await this.httpClient(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          signal: AbortSignal.timeout(15_000),
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 500,
            system: CORO_CONTEXT,
            messages: [
              ...history.map(({ role, content }) => ({ role, content })),
              { role: 'user', content: normalizedMessage },
            ],
          }),
        },
      );
      if (!response.ok) {
        this.logger.warn(
          `Anthropic request failed with HTTP ${response.status}`,
        );
        return this.unavailable(contactSuggested);
      }
      const payload: unknown = await response.json();
      if (!isAnthropicPayload(payload)) {
        this.logger.warn('Anthropic returned an invalid response shape');
        return this.unavailable(contactSuggested);
      }
      return {
        reply: payload.content[0].text,
        contactSuggested,
        transferToAgent: contactSuggested,
        status: 'ANSWERED',
      };
    } catch (error) {
      const kind =
        error instanceof DOMException && error.name === 'TimeoutError'
          ? 'timeout'
          : 'transport';
      this.logger.warn(`Anthropic request unavailable (${kind})`);
      return this.unavailable(contactSuggested);
    }
  }

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

  private unavailable(contactSuggested: boolean): ChatResult {
    return {
      reply:
        "L'assistant est temporairement indisponible. Réessayez plus tard ou écrivez à info@getcoro.io.",
      contactSuggested,
      transferToAgent: contactSuggested,
      status: 'UNAVAILABLE',
    };
  }
}
