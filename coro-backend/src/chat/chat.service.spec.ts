/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-base-to-string */
import { ChatHttpClient, ChatService, escapeHtml } from './chat.service';

const response = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('ChatService security', () => {
  const previousAnthropicKey = process.env.ANTHROPIC_API_KEY;
  const previousBrevoKey = process.env.BREVO_API_KEY;

  afterEach(() => {
    jest.restoreAllMocks();
    if (previousAnthropicKey === undefined)
      delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = previousAnthropicKey;
    if (previousBrevoKey === undefined) delete process.env.BREVO_API_KEY;
    else process.env.BREVO_API_KEY = previousBrevoKey;
  });

  it('escapes HTML, attributes, quotes and preserves Unicode', () => {
    expect(escapeHtml(`<img src=x onerror="alert('é')"> &`)).toBe(
      '&lt;img src=x onerror=&quot;alert(&#39;é&#39;)&quot;&gt; &amp;',
    );
  });

  it('does not call any provider when Anthropic configuration is absent', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const http = jest.fn() as unknown as ChatHttpClient;
    const result = await new ChatService(http).handleMessage(
      'Quels sont vos prix?',
      [],
    );
    expect(http).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 'UNAVAILABLE',
      contactSuggested: true,
    });
  });

  it('suggests contact on a keyword without sending a notification', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-only';
    const http = jest.fn().mockResolvedValue(
      response(200, {
        content: [{ text: 'Utilisez le formulaire si vous le souhaitez.' }],
      }),
    ) as unknown as ChatHttpClient;
    const result = await new ChatService(http).handleMessage(
      'Je veux une démo',
      [],
    );
    expect(result.contactSuggested).toBe(true);
    expect(http).toHaveBeenCalledTimes(1);
    expect(String((http as jest.Mock).mock.calls[0][0])).toContain(
      'anthropic.com',
    );
  });

  it.each([
    [500, { error: 'provider' }],
    [200, { unexpected: true }],
  ])(
    'fails explicitly for Anthropic status/shape %#',
    async (status, payload) => {
      process.env.ANTHROPIC_API_KEY = 'test-only';
      const http = jest
        .fn()
        .mockResolvedValue(
          response(status, payload),
        ) as unknown as ChatHttpClient;
      await expect(
        new ChatService(http).handleMessage('Bonjour', []),
      ).resolves.toMatchObject({ status: 'UNAVAILABLE' });
    },
  );

  it('fails closed when the Anthropic request times out', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-only';
    const http = jest
      .fn()
      .mockRejectedValue(
        new DOMException('Timed out', 'TimeoutError'),
      ) as unknown as ChatHttpClient;
    await expect(
      new ChatService(http).handleMessage('Bonjour', []),
    ).resolves.toMatchObject({ status: 'UNAVAILABLE' });
  });

  it('escapes notification content and reports provider success only with a message id', async () => {
    process.env.BREVO_API_KEY = 'test-only';
    const http = jest
      .fn()
      .mockResolvedValue(
        response(201, { messageId: 'mock-message' }),
      ) as unknown as ChatHttpClient;
    const result = await new ChatService(http).notifyAgent(
      'a@example.test',
      '<script>alert("é")</script>',
      '20ac4c20-d2c1-4e70-bd82-c353701525b7',
    );
    expect(result).toEqual({ success: true, status: 'SENT' });
    const request = JSON.parse(
      String(((http as jest.Mock).mock.calls[0][1] as RequestInit).body),
    );
    expect(request.htmlContent).toContain(
      '&lt;script&gt;alert(&quot;é&quot;)&lt;/script&gt;',
    );
    expect(request.htmlContent).not.toContain('<script>');
  });

  it('deduplicates concurrent notification submissions by request id', async () => {
    process.env.BREVO_API_KEY = 'test-only';
    let resolveProvider!: (value: Response) => void;
    const http = jest.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveProvider = resolve;
        }),
    ) as unknown as ChatHttpClient;
    const service = new ChatService(http);
    const first = service.notifyAgent(
      'a@example.test',
      'Résumé',
      '20ac4c20-d2c1-4e70-bd82-c353701525b7',
    );
    const second = service.notifyAgent(
      'a@example.test',
      'Résumé',
      '20ac4c20-d2c1-4e70-bd82-c353701525b7',
    );
    expect(http).toHaveBeenCalledTimes(1);
    resolveProvider(response(201, { messageId: 'mock-message' }));
    await expect(Promise.all([first, second])).resolves.toEqual([
      { success: true, status: 'SENT' },
      { success: true, status: 'SENT' },
    ]);
  });

  it.each([
    [500, { messageId: 'ignored' }, 'PROVIDER_ERROR'],
    [201, {}, 'INVALID_PROVIDER_RESPONSE'],
  ])(
    'does not create a false Brevo success %#',
    async (status, payload, expectedStatus) => {
      process.env.BREVO_API_KEY = 'test-only';
      const http = jest
        .fn()
        .mockResolvedValue(
          response(status, payload),
        ) as unknown as ChatHttpClient;
      await expect(
        new ChatService(http).notifyAgent(
          'a@example.test',
          'Résumé',
          crypto.randomUUID(),
        ),
      ).resolves.toEqual({ success: false, status: expectedStatus });
    },
  );
});
