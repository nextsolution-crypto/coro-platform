import {
  PopulationPreferredLanguage,
  PopulationVerificationChannel,
} from '@prisma/client';
import { PopulationService } from './population.service';

describe('Population SMS global send gate', () => {
  const delivery = { sendSms: jest.fn(), sendEmail: jest.fn() };
  const suppressions = {
    isSuppressed: jest.fn(),
  };
  const phoneNumbers = {
    normalizePhoneNumber: jest.fn(() => ({ canonical: '+15145550123' })),
  };
  const service = new PopulationService(
    {} as never,
    {} as never,
    delivery as never,
    {} as never,
    {} as never,
    {} as never,
    phoneNumbers as never,
    suppressions as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('does not call the provider for a globally suppressed canonical identity', async () => {
    suppressions.isSuppressed.mockResolvedValue(true);
    await expect(
      (
        service as unknown as {
          sendSubscriberOtp(data: object): Promise<string>;
        }
      ).sendSubscriberOtp({
        channel: PopulationVerificationChannel.SMS,
        destination: '+15145550123',
        code: '123456',
        preferredLanguage: PopulationPreferredLanguage.FR,
        purpose: 'VERIFICATION',
      }),
    ).resolves.toBe('FAILED');
    expect(delivery.sendSms).not.toHaveBeenCalled();
  });

  it('allows the existing provider path when no global suppression exists', async () => {
    suppressions.isSuppressed.mockResolvedValue(false);
    delivery.sendSms.mockResolvedValue({ provider: 'BREVO' });
    await expect(
      (
        service as unknown as {
          sendSubscriberOtp(data: object): Promise<string>;
        }
      ).sendSubscriberOtp({
        channel: PopulationVerificationChannel.SMS,
        destination: '+15145550123',
        code: '123456',
        preferredLanguage: PopulationPreferredLanguage.EN,
        purpose: 'ACCESS',
      }),
    ).resolves.toBe('SENT');
    expect(delivery.sendSms).toHaveBeenCalledTimes(1);
  });
});
