import {
  PopulationPreferredLanguage,
  PopulationProgramStatus,
  PopulationSubscriberStatus,
  RueAssessmentStatus,
} from '@prisma/client';
import { PopulationService } from './population.service';
import { PhoneNumberService } from '../common/phone/phone-number.service';

describe('Population identity acquisition', () => {
  const program = {
    id: 'program-1',
    status: PopulationProgramStatus.ACTIVE,
    registrationEnabled: true,
    smsEnabled: true,
    emailEnabled: true,
    consentVersion: 'v1',
    consentTextFR: 'Consentement',
    consentTextEN: 'Consent',
    privacyTextFR: 'Vie privÃ©e',
    privacyTextEN: 'Privacy',
    rueFacilityProfile: {
      assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
      populationEnabled: true,
    },
  };
  const prisma = {
    populationProgram: { findUnique: jest.fn() },
    populationSubscriber: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    populationVerification: {
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    populationSmsConsentEvidence: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    populationConsentEvent: { createMany: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  const delivery = { sendSms: jest.fn(), sendEmail: jest.fn() };
  const readiness = {
    assertVerificationChannelReady: jest.fn(),
    assertAccessRecoveryReady: jest.fn(),
  };
  let service: PopulationService;

  const candidate = (status: PopulationSubscriberStatus) => ({
    id: 'existing-1',
    status,
    phone: null,
    phoneCanonical: null,
    email: 'Citizen@Example.com',
    emailCanonical: 'citizen@example.com',
    preferredLanguage: PopulationPreferredLanguage.FR,
    smsEnabled: false,
    emailEnabled: status === PopulationSubscriberStatus.ACTIVE,
    createdAt: new Date(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.POPULATION_OTP_SECRET = 'population-identity-test-otp-secret';
    process.env.POPULATION_ACCESS_REQUEST_TOKEN_SECRET = '11'.repeat(32);
    prisma.populationProgram.findUnique.mockResolvedValue(program);
    prisma.populationSubscriber.findMany.mockResolvedValue([]);
    prisma.populationVerification.findFirst.mockResolvedValue(null);
    prisma.populationVerification.count.mockResolvedValue(0);
    prisma.populationVerification.create.mockResolvedValue({
      id: 'verification-1',
    });
    prisma.populationSubscriber.create.mockResolvedValue({
      ...candidate(PopulationSubscriberStatus.PENDING_VERIFICATION),
      id: 'new-1',
    });
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(prisma),
    );
    delivery.sendEmail.mockResolvedValue({ provider: 'BREVO' });
    delivery.sendSms.mockResolvedValue({ provider: 'BREVO' });
    service = new PopulationService(
      prisma as any,
      {} as any,
      delivery as any,
      {} as any,
      readiness as any,
      {} as any,
      new PhoneNumberService(),
    );
  });

  const register = () =>
    service.registerSubscriber('program', {
      email: '  Citizen@Example.com  ',
      preferredLanguage: PopulationPreferredLanguage.FR,
      consentVersion: 'v1',
    });

  it('creates one managed canonical identity and returns only an opaque token', async () => {
    const result = await register();
    expect(prisma.populationSubscriber.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'Citizen@Example.com',
          emailCanonical: 'citizen@example.com',
          identityAuthorityAt: expect.any(Date),
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        accepted: true,
        accessRequestToken: expect.any(String),
      }),
    );
    expect(result).not.toHaveProperty('subscriber');
    expect(result).not.toHaveProperty('subscriberId');
  });

  it.each([
    PopulationSubscriberStatus.ACTIVE,
    PopulationSubscriberStatus.PENDING_VERIFICATION,
  ])(
    'reuses a single %s identity without creating another subscriber',
    async (status) => {
      prisma.populationSubscriber.findMany.mockResolvedValue([
        candidate(status),
      ]);
      await register();
      expect(prisma.populationSubscriber.create).not.toHaveBeenCalled();
      expect(prisma.populationVerification.create).toHaveBeenCalledTimes(1);
      expect(delivery.sendEmail).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    [PopulationSubscriberStatus.SUSPENDED],
    [PopulationSubscriberStatus.ACTIVE, PopulationSubscriberStatus.ACTIVE],
  ])(
    'returns the same opaque contract without provider delivery for protected matches',
    async (...statuses) => {
      prisma.populationSubscriber.findMany.mockResolvedValue(
        statuses.map((status, index) => ({
          ...candidate(status),
          id: `candidate-${index}`,
        })),
      );
      const result = await register();
      expect(result).toEqual(
        expect.objectContaining({
          accepted: true,
          accessRequestToken: expect.any(String),
        }),
      );
      expect(prisma.populationSubscriber.create).not.toHaveBeenCalled();
      expect(prisma.populationVerification.create).not.toHaveBeenCalled();
      expect(delivery.sendEmail).not.toHaveBeenCalled();
    },
  );
});
