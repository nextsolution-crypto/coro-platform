import { IncidentService } from './incident.service';

describe('Incident SMS sender (audit T8)', () => {
  const originalFetch = global.fetch;
  const env = { ...process.env };
  const live = { evaluate: jest.fn().mockResolvedValue({ disposition: 'LIVE' }) };

  function service() {
    return new IncidentService({} as any, undefined, live as any) as any;
  }

  beforeEach(() => {
    global.fetch = jest.fn();
    process.env.BREVO_API_KEY = 'test-key';
    process.env.BREVO_SMS_SENDER = '+18335886812';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...env };
  });

  it('never falls back to a default sender when BREVO_SMS_SENDER is missing', async () => {
    delete process.env.BREVO_SMS_SENDER;
    await expect(service().sendSms('514 555 0100', 'Alerte', 'org-1')).resolves.toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('uses the configured toll-free sender and reports acceptance', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 201 });
    await expect(service().sendSms('514 555 0100', 'Alerte', 'org-1')).resolves.toBe(true);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body).toMatchObject({ sender: '+18335886812', recipient: '+15145550100' });
  });

  it('reports a provider refusal instead of a silent success', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 400 });
    await expect(service().sendSms('514 555 0100', 'Alerte', 'org-1')).resolves.toBe(false);
  });

  it('reports a refused incident email', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 });
    await expect(
      service().sendEmail({ to: 'a@example.invalid', toName: 'A', subject: 'S', html: '<p>x</p>' }, 'org-1'),
    ).resolves.toBe(false);
  });
});
