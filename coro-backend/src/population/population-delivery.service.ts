import { Injectable } from '@nestjs/common';

export type PopulationProviderResult = {
  provider: 'BREVO';
  providerMessageId: string | null;
};

export class PopulationProviderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PopulationProviderError';
  }
}

@Injectable()
export class PopulationDeliveryService {
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

  private sanitizeProviderError(
    value: unknown,
  ): string {
    if (typeof value !== 'string') {
      return 'Erreur du fournisseur de communication';
    }

    /*
     * Ne jamais conserver dans PopulationAlertDelivery
     * une réponse fournisseur arbitrairement longue.
     */
    return value
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 500);
  }

  private async readProviderResponse(
    response: Response,
  ): Promise<any> {
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
      response = await fetch(
        'https://api.brevo.com/v3/transactionalSMS/send',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
          },
          body: JSON.stringify({
            sender:
              process.env.BREVO_SMS_SENDER || 'CORO',
            recipient: destination,
            content: message,
            type: 'transactional',
          }),
        },
      );
    } catch {
      throw new PopulationProviderError(
        'BREVO_NETWORK_ERROR',
        'Le fournisseur SMS est temporairement inaccessible',
      );
    }

    const body =
      await this.readProviderResponse(response);

    if (!response.ok) {
      const providerMessage =
        body?.message ||
        body?.error ||
        `HTTP ${response.status}`;

      throw new PopulationProviderError(
        `BREVO_HTTP_${response.status}`,
        this.sanitizeProviderError(
          String(providerMessage),
        ),
      );
    }

    const messageId =
      body?.messageId ??
      body?.message_id ??
      body?.id ??
      null;

    return {
      provider: 'BREVO',
      providerMessageId:
        messageId === null
          ? null
          : String(messageId),
    };
  }

  async sendEmail(data: {
    destination: string;
    subject: string;
    html: string;
  }): Promise<PopulationProviderResult> {
    const apiKey = this.getApiKey();

    let response: Response;

    try {
      response = await fetch(
        'https://api.brevo.com/v3/smtp/email',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
          },
          body: JSON.stringify({
            sender: {
              name: 'CORO Sentinelle',
              email:
                process.env.BREVO_SENDER_EMAIL ||
                'info@getcoro.io',
            },
            to: [
              {
                email: data.destination,
              },
            ],
            subject: data.subject,
            htmlContent: data.html,
          }),
        },
      );
    } catch {
      throw new PopulationProviderError(
        'BREVO_NETWORK_ERROR',
        'Le fournisseur courriel est temporairement inaccessible',
      );
    }

    const body =
      await this.readProviderResponse(response);

    if (!response.ok) {
      const providerMessage =
        body?.message ||
        body?.error ||
        `HTTP ${response.status}`;

      throw new PopulationProviderError(
        `BREVO_HTTP_${response.status}`,
        this.sanitizeProviderError(
          String(providerMessage),
        ),
      );
    }

    const messageId =
      body?.messageId ??
      body?.message_id ??
      body?.id ??
      null;

    return {
      provider: 'BREVO',
      providerMessageId:
        messageId === null
          ? null
          : String(messageId),
    };
  }
}