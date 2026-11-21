import { createHash } from 'crypto';
import { isSentinelleDemoSmsCandidate, normalizeDemoSmsRecipient } from './demo-communication-policy.service';

const DEMO_ORG = '916f54ec-af22-45e0-99db-a369d9630002';
const hash = (v: string) => createHash('sha256').update(v).digest('hex');

describe('Controlled live Sentinelle SMS in the demo organization', () => {
  const env = { DEMO_SENTINELLE_SMS_LIVE_RECIPIENT_SHA256: hash('+15145550123') };
  const base = { organizationId: DEMO_ORG, channel: 'SMS' as any, operation: 'INCIDENT_NOTIFICATION' };

  it('normalizes North American numbers to E.164', () => {
    expect(normalizeDemoSmsRecipient('514 555 0123')).toBe('+15145550123');
    expect(normalizeDemoSmsRecipient('+1 (514) 555-0123')).toBe('+15145550123');
    expect(normalizeDemoSmsRecipient('12')).toBeNull();
  });

  it('allows only the allowlisted number, in the demo organization, for incident and panic SMS', () => {
    expect(isSentinelleDemoSmsCandidate({ ...base, recipient: '+15145550123' }, env)).toBe(true);
    expect(isSentinelleDemoSmsCandidate({ ...base, operation: 'MEMBER_ALERT', recipient: '514-555-0123' }, env)).toBe(true);
    expect(isSentinelleDemoSmsCandidate({ ...base, recipient: '+15145550199' }, env)).toBe(false);
    expect(isSentinelleDemoSmsCandidate({ ...base, organizationId: 'other-org', recipient: '+15145550123' }, env)).toBe(false);
    expect(isSentinelleDemoSmsCandidate({ ...base, operation: 'CLIENT_MAGIC_LINK', recipient: '+15145550123' }, env)).toBe(false);
    expect(isSentinelleDemoSmsCandidate({ ...base, channel: 'EMAIL' as any, recipient: '+15145550123' }, env)).toBe(false);
    expect(isSentinelleDemoSmsCandidate({ ...base, recipient: '+15145550123' }, {})).toBe(false);
  });
});
