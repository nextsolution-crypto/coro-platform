import { EmailService } from './email.service';

describe('EmailService Demo isolation', () => {
  const originalFetch = global.fetch;
  const originalNodeEnvironment = process.env.NODE_ENV;
  const originalKey = process.env.BREVO_API_KEY;

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalNodeEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnvironment;
    if (originalKey === undefined) delete process.env.BREVO_API_KEY;
    else process.env.BREVO_API_KEY = originalKey;
  });

  it('simule un courriel du tenant Démo sans appeler Brevo', async () => {
    process.env.NODE_ENV = 'production';
    process.env.BREVO_API_KEY = 'production-key-not-used';
    global.fetch = jest.fn();
    const policy = {
      organizationIdForRecipient: jest.fn().mockResolvedValue('org-demo'),
      evaluate: jest.fn().mockResolvedValue({
        disposition: 'SIMULATED',
        eventId: 'event-1',
      }),
    };
    const service = new EmailService(policy as any);
    await expect(
      service.sendClientPasswordReset({
        toEmail: 'client@example.invalid',
        toName: 'Client Démo',
        resetUrl: 'https://client.getcoro.io/reset?token=secret',
      }),
    ).resolves.toEqual({
      success: true,
      messageId: 'demo-simulated:event-1',
    });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(policy.evaluate).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'CLIENT_PORTAL_EMAIL',
        payload: expect.not.objectContaining({ resetUrl: expect.anything() }),
      }),
    );
  });

  it('échoue fermé en production si la politique globale est absente', async () => {
    process.env.NODE_ENV = 'production';
    global.fetch = jest.fn();
    const service = new EmailService();
    await expect(
      service.sendClientPasswordReset({
        toEmail: 'client@example.invalid',
        toName: 'Client Démo',
        resetUrl: 'https://client.getcoro.io/reset?token=secret',
      }),
    ).resolves.toEqual({ success: false });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
