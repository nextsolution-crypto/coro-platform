import { EmailService } from './email.service';

describe('Client password reset email', () => {
  const previousKey = process.env.BREVO_API_KEY;
  afterEach(() => {
    if (previousKey === undefined) delete process.env.BREVO_API_KEY;
    else process.env.BREVO_API_KEY = previousKey;
    jest.restoreAllMocks();
  });

  it('envoie le lien 30 minutes via Brevo sans mot de passe ni log sensible', async () => {
    process.env.BREVO_API_KEY = 'test-only-secret';
    const request = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 201 } as Response);
    const log = jest.spyOn(console, 'log').mockImplementation();
    const error = jest.spyOn(console, 'error').mockImplementation();
    const url = 'https://client.getcoro.io/reset-password?token=synthetic-token';
    await expect(new EmailService().sendClientPasswordReset({ toEmail: 'test@example.invalid', toName: '<Test>', resetUrl: url })).resolves.toEqual({ success: true });
    const options = request.mock.calls[0][1]!;
    const body = JSON.parse(options.body as string);
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
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 503, text: jest.fn() } as unknown as Response);
    const error = jest.spyOn(console, 'error').mockImplementation();
    await expect(new EmailService().sendClientPasswordReset({ toEmail: 'test@example.invalid', toName: 'Test', resetUrl: 'https://client.getcoro.io/reset-password?token=synthetic-token' })).resolves.toEqual({ success: false });
    expect(JSON.stringify(error.mock.calls)).not.toContain('test-only-secret');
    expect(JSON.stringify(error.mock.calls)).not.toContain('synthetic-token');
    expect(error).toHaveBeenCalledWith('Erreur Brevo, status:', 503);
  });
});
