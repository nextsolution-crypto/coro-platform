import { EmailService } from './email.service';

type BrevoRequestBody = {
  subject: string;
  htmlContent: string;
  to: Array<{ email: string; name: string }>;
};

function brevoBody(
  request: jest.SpiedFunction<typeof fetch>,
): BrevoRequestBody {
  const body = request.mock.calls[0]?.[1]?.body;
  if (typeof body !== 'string') throw new Error('Missing Brevo request body.');
  return JSON.parse(body) as BrevoRequestBody;
}

describe('Client password reset email', () => {
  const previousKey = process.env.BREVO_API_KEY;
  const previousAllowlist = process.env.CLIENT_EMAIL_RECIPIENT_ALLOWLIST;
  afterEach(() => {
    if (previousKey === undefined) delete process.env.BREVO_API_KEY;
    else process.env.BREVO_API_KEY = previousKey;
    if (previousAllowlist === undefined)
      delete process.env.CLIENT_EMAIL_RECIPIENT_ALLOWLIST;
    else process.env.CLIENT_EMAIL_RECIPIENT_ALLOWLIST = previousAllowlist;
    jest.restoreAllMocks();
  });

  it('refuse localement un destinataire hors allowlist sans appel fournisseur', async () => {
    process.env.BREVO_API_KEY = 'test-only-secret';
    process.env.CLIENT_EMAIL_RECIPIENT_ALLOWLIST = 'info@getcoro.io';
    const request = jest.spyOn(global, 'fetch');
    await expect(
      new EmailService().sendClientPasswordReset({
        toEmail: 'outside@example.test',
        toName: 'Outside',
        resetUrl:
          'https://client.getcoro.io/reset-password?token=synthetic-token',
      }),
    ).resolves.toEqual({ success: false });
    expect(request).not.toHaveBeenCalled();
  });

  it('retourne la correlation Brevo et rend le magic link a usage unique', async () => {
    process.env.BREVO_API_KEY = 'test-only-secret';
    process.env.CLIENT_EMAIL_RECIPIENT_ALLOWLIST = 'info@getcoro.io';
    const request = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 201,
      json: jest.fn().mockResolvedValue({ messageId: '<provider-message-id>' }),
    } as unknown as Response);
    const magicUrl = 'https://client.getcoro.io/magic?token=synthetic-token';
    await expect(
      new EmailService().sendClientMagicLink({
        toEmail: 'INFO@getcoro.io',
        toName: '<Test>',
        magicUrl,
      }),
    ).resolves.toEqual({ success: true, messageId: '<provider-message-id>' });
    const body = brevoBody(request);
    expect(body.htmlContent).toContain(magicUrl);
    expect(body.htmlContent).toContain('15 minutes');
    expect(body.htmlContent).toContain('&lt;Test&gt;');
    expect(body.to).toEqual([{ email: 'INFO@getcoro.io', name: '<Test>' }]);
  });

  it('envoie le lien 30 minutes via Brevo sans mot de passe ni log sensible', async () => {
    process.env.BREVO_API_KEY = 'test-only-secret';
    const request = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, status: 201 } as Response);
    const log = jest.spyOn(console, 'log').mockImplementation();
    const error = jest.spyOn(console, 'error').mockImplementation();
    const url =
      'https://client.getcoro.io/reset-password?token=synthetic-token';
    await expect(
      new EmailService().sendClientPasswordReset({
        toEmail: 'test@example.invalid',
        toName: '<Test>',
        resetUrl: url,
      }),
    ).resolves.toEqual({ success: true });
    const body = brevoBody(request);
    expect(body.subject).toBe('Réinitialisation de votre mot de passe CORO');
    expect(body.htmlContent).toContain(url);
    expect(body.htmlContent).toContain('30 minutes');
    expect(body.htmlContent).toContain('&lt;Test&gt;');
    expect(body.htmlContent).not.toContain('mot de passe temporaire');
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('ne journalise ni reponse Brevo ni cle API si le fournisseur refuse', async () => {
    process.env.BREVO_API_KEY = 'test-only-secret';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      text: jest.fn(),
    } as unknown as Response);
    const error = jest.spyOn(console, 'error').mockImplementation();
    await expect(
      new EmailService().sendClientPasswordReset({
        toEmail: 'test@example.invalid',
        toName: 'Test',
        resetUrl:
          'https://client.getcoro.io/reset-password?token=synthetic-token',
      }),
    ).resolves.toEqual({ success: false });
    expect(JSON.stringify(error.mock.calls)).not.toContain('test-only-secret');
    expect(JSON.stringify(error.mock.calls)).not.toContain('synthetic-token');
    expect(error).toHaveBeenCalledWith('Erreur Brevo, status:', 503);
  });
});
