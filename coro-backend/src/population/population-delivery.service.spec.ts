import {
  PopulationDeliveryService,
  PopulationProviderError,
} from './population-delivery.service';

describe('PopulationDeliveryService', () => {
  let service: PopulationDeliveryService;

  const originalFetch = global.fetch;
  const originalApiKey = process.env.BREVO_API_KEY;
  const originalSmsSender = process.env.BREVO_SMS_SENDER;
  const originalSenderEmail = process.env.BREVO_SENDER_EMAIL;

  beforeEach(() => {
    service = new PopulationDeliveryService();

    process.env.BREVO_API_KEY = 'test-brevo-api-key';

    process.env.BREVO_SMS_SENDER = 'CORO';
    process.env.BREVO_SENDER_EMAIL = 'info@getcoro.io';

    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;

    if (originalApiKey === undefined) {
      delete process.env.BREVO_API_KEY;
    } else {
      process.env.BREVO_API_KEY = originalApiKey;
    }

    if (originalSmsSender === undefined) {
      delete process.env.BREVO_SMS_SENDER;
    } else {
      process.env.BREVO_SMS_SENDER = originalSmsSender;
    }

    if (originalSenderEmail === undefined) {
      delete process.env.BREVO_SENDER_EMAIL;
    } else {
      process.env.BREVO_SENDER_EMAIL = originalSenderEmail;
    }
  });

  it('envoie un SMS transactionnel via Brevo', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 201,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          messageId: 'sms-brevo-123',
        }),
      ),
    });

    const result = await service.sendSms('+15145550101', 'Alerte CORO');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/transactionalSMS/send',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': 'test-brevo-api-key',
        },
      }),
    );

    const request = (global.fetch as jest.Mock).mock.calls[0][1];

    expect(JSON.parse(request.body)).toEqual({
      sender: 'CORO',
      recipient: '+15145550101',
      content: 'Alerte CORO',
      type: 'transactional',
    });

    expect(result).toEqual({
      provider: 'BREVO',
      providerMessageId: 'sms-brevo-123',
    });
  });

  it('envoie un courriel transactionnel via Brevo', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 201,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          messageId: '<email-123@brevo>',
        }),
      ),
    });

    const result = await service.sendEmail({
      destination: 'citoyen@example.com',
      subject: 'Alerte CORO',
      html: '<p>Mettez-vous à l’abri.</p>',
      providerIdempotencyKey: '11111111-1111-4111-8111-111111111111',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({
        method: 'POST',
      }),
    );

    const request = (global.fetch as jest.Mock).mock.calls[0][1];

    expect(JSON.parse(request.body)).toEqual({
      sender: {
        name: 'CORO Sentinelle',
        email: 'info@getcoro.io',
      },
      to: [
        {
          email: 'citoyen@example.com',
        },
      ],
      subject: 'Alerte CORO',
      htmlContent: '<p>Mettez-vous à l’abri.</p>',
      headers: {
        idempotencyKey: '11111111-1111-4111-8111-111111111111',
      },
    });

    expect(result).toEqual({
      provider: 'BREVO',
      providerMessageId: '<email-123@brevo>',
    });
  });

  it('rejette une réponse HTTP Brevo en erreur', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          message: 'Unauthorized',
        }),
      ),
    });

    await expect(
      service.sendSms('+15145550101', 'Alerte CORO'),
    ).rejects.toMatchObject({
      name: 'PopulationProviderError',
      code: 'BREVO_HTTP_401',
      message: 'Unauthorized',
    });
  });

  it('distingue une erreur réseau d’une erreur HTTP', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('ECONNRESET'));

    await expect(
      service.sendSms('+15145550101', 'Alerte CORO'),
    ).rejects.toMatchObject({
      name: 'PopulationProviderError',
      code: 'BREVO_NETWORK_ERROR',
    });
  });

  it('refuse tout envoi si BREVO_API_KEY est absente', async () => {
    delete process.env.BREVO_API_KEY;

    await expect(
      service.sendSms('+15145550101', 'Alerte CORO'),
    ).rejects.toBeInstanceOf(PopulationProviderError);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('ne propage pas une réponse fournisseur arbitrairement longue', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      text: jest.fn().mockResolvedValue('X'.repeat(5000)),
    });

    try {
      await service.sendSms('+15145550101', 'Alerte CORO');

      throw new Error('Le test aurait dû lever une erreur');
    } catch (error) {
      expect(error).toBeInstanceOf(PopulationProviderError);

      expect(
        (error as PopulationProviderError).message.length,
      ).toBeLessThanOrEqual(500);
    }
  });

  it('accepte une réponse Brevo 2xx sans messageId', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 204,
      text: jest.fn().mockResolvedValue(''),
    });

    const result = await service.sendSms('+15145550101', 'Alerte CORO');

    expect(result).toEqual({
      provider: 'BREVO',
      providerMessageId: null,
    });
  });

  it('réutilise exactement la même clé fournisseur lors de deux tentatives', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 201,
      text: jest
        .fn()
        .mockResolvedValue(JSON.stringify({ messageId: '<email@brevo>' })),
    });
    const data = {
      destination: 'citoyen@example.com',
      subject: 'Alerte CORO',
      html: '<p>Alerte</p>',
      providerIdempotencyKey: '22222222-2222-4222-8222-222222222222',
    };
    await service.sendEmail(data);
    await service.sendEmail(data);
    for (const call of (global.fetch as jest.Mock).mock.calls) {
      expect(JSON.parse(call[1].body).headers.idempotencyKey).toBe(
        data.providerIdempotencyKey,
      );
    }
  });

  it.each([
    [400, 'NON_RETRYABLE'],
    [401, 'NON_RETRYABLE'],
    [403, 'NON_RETRYABLE'],
    [429, 'RETRYABLE_CONFIRMED'],
    [500, 'OUTCOME_UNKNOWN'],
    [503, 'OUTCOME_UNKNOWN'],
  ] as const)('classifie HTTP %s comme %s', async (status, outcome) => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status,
      text: jest
        .fn()
        .mockResolvedValue(JSON.stringify({ message: 'provider error' })),
    });
    await expect(
      service.sendEmail({
        destination: 'citoyen@example.com',
        subject: 'Alerte',
        html: '<p>Alerte</p>',
        providerIdempotencyKey: '33333333-3333-4333-8333-333333333333',
      }),
    ).rejects.toMatchObject({ outcome });
  });

  it('classifie une rupture réseau comme outcome unknown', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('ECONNRESET'));
    await expect(
      service.sendEmail({
        destination: 'citoyen@example.com',
        subject: 'Alerte',
        html: '<p>Alerte</p>',
        providerIdempotencyKey: '44444444-4444-4444-8444-444444444444',
      }),
    ).rejects.toMatchObject({
      code: 'BREVO_NETWORK_ERROR',
      outcome: 'OUTCOME_UNKNOWN',
    });
  });

  it('interrompt un fetch courriel au timeout explicite', async () => {
    process.env.POPULATION_EMAIL_TIMEOUT_MS = '10';
    (global.fetch as jest.Mock).mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
    );
    await expect(
      service.sendEmail({
        destination: 'citoyen@example.com',
        subject: 'Alerte',
        html: '<p>Alerte</p>',
        providerIdempotencyKey: '55555555-5555-4555-8555-555555555555',
      }),
    ).rejects.toMatchObject({
      code: 'BREVO_TIMEOUT',
      outcome: 'OUTCOME_UNKNOWN',
    });
    delete process.env.POPULATION_EMAIL_TIMEOUT_MS;
  });

  it('refuse un timeout susceptible de depasser la lease de livraison', async () => {
    process.env.POPULATION_EMAIL_TIMEOUT_MS = '60001';
    await expect(
      service.sendEmail({
        destination: 'citoyen@example.com',
        subject: 'Alerte',
        html: '<p>Alerte</p>',
      }),
    ).rejects.toMatchObject({
      code: 'EMAIL_TIMEOUT_INVALID',
      outcome: 'NON_RETRYABLE',
    });
    expect(global.fetch).not.toHaveBeenCalled();
    delete process.env.POPULATION_EMAIL_TIMEOUT_MS;
  });
});
