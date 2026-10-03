import { PopulationSmsSuppressionService } from './population-sms-suppression.service';

describe('PopulationSmsSuppressionService', () => {
  const prisma = {
    populationSmsSuppression: { findUnique: jest.fn() },
  };
  const phoneNumbers = {
    normalizePhoneNumber: jest.fn(() => ({ canonical: '+15145550123' })),
  };
  const service = new PopulationSmsSuppressionService(
    prisma as never,
    phoneNumbers as never,
  );

  it('uses canonical E.164 identity and CA SMS context', () => {
    expect(service.canonicalize('(514) 555-0123')).toBe('+15145550123');
    expect(phoneNumbers.normalizePhoneNumber).toHaveBeenCalledWith(
      '(514) 555-0123',
      { defaultCountry: 'CA', purpose: 'SMS' },
    );
  });

  it('returns the durable global suppression state', async () => {
    prisma.populationSmsSuppression.findUnique.mockResolvedValue({ id: 's1' });
    await expect(service.isSuppressed('+15145550123')).resolves.toBe(true);
    prisma.populationSmsSuppression.findUnique.mockResolvedValue(null);
    await expect(service.isSuppressed('+15145550123')).resolves.toBe(false);
  });
});
