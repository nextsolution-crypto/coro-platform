import {
  PopulationDeliveryService,
  PopulationProviderError,
} from './population-delivery.service';

describe('PopulationDeliveryService', () => {
  let service: PopulationDeliveryService;

  const originalFetch = global.fetch;
  const originalApiKey =
    process.env.BREVO_API_KEY;
  const originalSmsSender =
    process.env.BREVO_SMS_SENDER;
  const originalSenderEmail =
    process.env.BREVO_SENDER_EMAIL;

  beforeEach(() => {
    service = new PopulationDeliveryService();

    process.env.BREVO_API_KEY =
      'test-brevo-api-key';

    process.env.BREVO_SMS_SENDER = 'CORO';
    process.env.BREVO_SENDER_EMAIL =
      'info@getcoro.io';

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
      process.env.BREVO_API_KEY =
        originalApiKey;
    }

    if (originalSmsSender === undefined) {
      delete process.env.BREVO_SMS_SENDER;
    } else {
      process.env.BREVO_SMS_SENDER =
        originalSmsSender;
    }

    if (originalSenderEmail === undefined) {
      delete process.env.BREVO_SENDER_EMAIL;
    } else {
      process.env.BREVO_SENDER_EMAIL =
        originalSenderEmail;
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

    const result = await service.sendSms(
      '+15145550101',
      'Alerte CORO',
    );

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

    const request =
      (global.fetch as jest.Mock).mock.calls[0][1];

    expect(
      JSON.parse(request.body),
    ).toEqual({
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
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({
        method: 'POST',
      }),
    );

    const request =
      (global.fetch as jest.Mock).mock.calls[0][1];

    expect(
      JSON.parse(request.body),
    ).toEqual({
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
      htmlContent:
        '<p>Mettez-vous à l’abri.</p>',
    });

    expect(result).toEqual({
      provider: 'BREVO',
      providerMessageId:
        '<email-123@brevo>',
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
      service.sendSms(
        '+15145550101',
        'Alerte CORO',
      ),
    ).rejects.toMatchObject({
      name: 'PopulationProviderError',
      code: 'BREVO_HTTP_401',
      message: 'Unauthorized',
    });
  });

  it('distingue une erreur réseau d’une erreur HTTP', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(
      new Error('ECONNRESET'),
    );

    await expect(
      service.sendSms(
        '+15145550101',
        'Alerte CORO',
      ),
    ).rejects.toMatchObject({
      name: 'PopulationProviderError',
      code: 'BREVO_NETWORK_ERROR',
    });
  });

  it('refuse tout envoi si BREVO_API_KEY est absente', async () => {
    delete process.env.BREVO_API_KEY;

    await expect(
      service.sendSms(
        '+15145550101',
        'Alerte CORO',
      ),
    ).rejects.toBeInstanceOf(
      PopulationProviderError,
    );

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('ne propage pas une réponse fournisseur arbitrairement longue', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      text: jest.fn().mockResolvedValue(
        'X'.repeat(5000),
      ),
    });

    try {
      await service.sendSms(
        '+15145550101',
        'Alerte CORO',
      );

      throw new Error(
        'Le test aurait dû lever une erreur',
      );
    } catch (error) {
      expect(error).toBeInstanceOf(
        PopulationProviderError,
      );

      expect(
        (error as PopulationProviderError)
          .message.length,
      ).toBeLessThanOrEqual(500);
    }
  });

  it('accepte une réponse Brevo 2xx sans messageId', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 204,
      text: jest.fn().mockResolvedValue(''),
    });

    const result = await service.sendSms(
      '+15145550101',
      'Alerte CORO',
    );

    expect(result).toEqual({
      provider: 'BREVO',
      providerMessageId: null,
    });
  });
});