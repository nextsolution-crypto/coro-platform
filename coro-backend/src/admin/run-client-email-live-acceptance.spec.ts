import {
  parseMode,
  parseQaDatabaseUrl,
  QA_RECIPIENT,
  requireQaPortal,
  requireRecipientConfiguration,
  requireScenarioAuthorization,
} from './run-client-email-live-acceptance';

describe('controlled client email acceptance guards', () => {
  const safeDb = 'postgresql://coro_email_qa:x@127.0.0.1:55471/coro_email_qa';
  it('accepts only explicit modes', () => {
    expect(parseMode('INSPECT')).toBe('INSPECT');
    expect(() => parseMode(undefined)).toThrow();
    expect(() => parseMode('SEND_ALL')).toThrow();
  });
  it('requires exact loopback database coordinates', () => {
    expect(parseQaDatabaseUrl(safeDb).hostname).toBe('127.0.0.1');
    for (const value of [
      'postgresql://coro_email_qa:x@db.example.com:55471/coro_email_qa',
      'postgresql://coro_email_qa:x@127.0.0.1:5432/coro_email_qa',
      'postgresql://coro_email_qa:x@127.0.0.1:55471/production',
      'postgresql://postgres:x@127.0.0.1:55471/coro_email_qa',
    ])
      expect(() => parseQaDatabaseUrl(value)).toThrow();
  });
  it('refuses production and insecure portal origins', () => {
    expect(requireQaPortal('http://127.0.0.1:3100').hostname).toBe('127.0.0.1');
    expect(() => requireQaPortal(undefined)).toThrow();
    expect(() => requireQaPortal('https://client.getcoro.io')).toThrow();
    expect(() => requireQaPortal('http://portal.qa.example.test')).toThrow();
  });
  it('locks recipient and rejects BCC', () => {
    expect(() =>
      requireRecipientConfiguration({
        CLIENT_EMAIL_RECIPIENT_ALLOWLIST: QA_RECIPIENT,
      }),
    ).not.toThrow();
    expect(() =>
      requireRecipientConfiguration({
        CLIENT_EMAIL_RECIPIENT_ALLOWLIST: `${QA_RECIPIENT},other@example.test`,
      }),
    ).toThrow();
    expect(() =>
      requireRecipientConfiguration({
        CLIENT_EMAIL_RECIPIENT_ALLOWLIST: QA_RECIPIENT,
        CLIENT_EMAIL_BCC: 'other@example.test',
      }),
    ).toThrow();
  });
  it('requires two scenario-specific confirmations', () => {
    const expected = `MAGIC_LINK:run-1234:${QA_RECIPIENT}`;
    expect(() =>
      requireScenarioAuthorization('MAGIC_LINK', 'run-1234', {
        CLIENT_EMAIL_SCENARIO_AUTHORIZATION: expected,
        CLIENT_EMAIL_HUMAN_CONFIRMATION: expected,
      }),
    ).not.toThrow();
    expect(() =>
      requireScenarioAuthorization('MAGIC_LINK', 'run-1234', {
        CLIENT_EMAIL_SCENARIO_AUTHORIZATION: expected,
      }),
    ).toThrow();
  });
});
