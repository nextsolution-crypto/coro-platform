import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  PopulationProgramStatus,
  PopulationSubscriberStatus,
  PopulationVerificationChannel,
  RueAssessmentStatus,
} from '@prisma/client';
import { createCipheriv, createHmac, randomBytes, randomUUID } from 'crypto';
import { PopulationService } from './population.service';

const REQUEST_KEY = Buffer.alloc(32, 11);
const OTP_SECRET = 'test-population-otp-secret-not-for-production';
const ACCESS_SECRET = 'test-population-access-secret-not-for-production';
const PURPOSE = 'POPULATION_ACCESS_REQUEST';
const AAD = Buffer.from(`CORO:${PURPOSE}:v1`);

describe('Population access recovery', () => {
  const prisma = {
    populationProgram: { findUnique: jest.fn() },
    populationSubscriber: { findMany: jest.fn() },
    populationVerification: {
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const delivery = { sendSms: jest.fn(), sendEmail: jest.fn() };
  const readiness = {
    assertAccessRecoveryReady: jest.fn(),
    assertVerificationChannelReady: jest.fn(),
  };
  let service: PopulationService;

  const program = {
    id: 'program-1',
    status: PopulationProgramStatus.ACTIVE,
    smsEnabled: true,
    emailEnabled: true,
    rueFacilityProfile: {
      assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
      populationEnabled: true,
    },
  };
  const subscriber = {
    id: 'subscriber-1',
    phone: '+14505551234',
    email: 'citizen@example.com',
  };

  const otpHash = (code: string) =>
    createHmac('sha256', OTP_SECRET).update(code).digest('hex');

  const forgeToken = (overrides: Record<string, unknown> = {}) => {
    const now = Date.now();
    const payload = {
      purpose: PURPOSE,
      programId: 'program-1',
      subscriberId: 'subscriber-1',
      verificationId: 'verification-1',
      channel: PopulationVerificationChannel.SMS,
      iat: now,
      exp: now + 600_000,
      jti: randomUUID(),
      ...overrides,
    };
    const json = Buffer.from(JSON.stringify(payload));
    const plaintext = Buffer.alloc(512, 0x20);
    json.copy(plaintext);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', REQUEST_KEY, iv);
    cipher.setAAD(AAD);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return [
      'v1',
      iv.toString('base64url'),
      encrypted.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
    ].join('.');
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.POPULATION_ACCESS_REQUEST_TOKEN_SECRET =
      REQUEST_KEY.toString('base64');
    process.env.POPULATION_OTP_SECRET = OTP_SECRET;
    process.env.POPULATION_ACCESS_SECRET = ACCESS_SECRET;
    prisma.populationProgram.findUnique.mockResolvedValue(program);
    prisma.populationSubscriber.findMany.mockResolvedValue([subscriber]);
    prisma.populationVerification.findFirst.mockResolvedValue(null);
    prisma.populationVerification.count.mockResolvedValue(0);
    prisma.populationVerification.create.mockResolvedValue({
      id: 'verification-1',
    });
    prisma.populationVerification.updateMany.mockResolvedValue({ count: 1 });
    delivery.sendSms.mockResolvedValue({
      provider: 'BREVO',
      providerMessageId: 'sms-1',
    });
    delivery.sendEmail.mockResolvedValue({
      provider: 'BREVO',
      providerMessageId: 'email-1',
    });
    service = new PopulationService(
      prisma as any,
      {} as any,
      delivery as any,
      {} as any,
      readiness as any,
    );
  });

  const requestSms = () =>
    service.requestSubscriberAccessByDestination('public-program', {
      channel: PopulationVerificationChannel.SMS,
      destination: '  +14505551234  ',
    });

  it('refuses recovery before persistence when configuration is unavailable', async () => {
    readiness.assertAccessRecoveryReady.mockImplementationOnce(() => {
      throw new ServiceUnavailableException('Récupération indisponible');
    });

    await expect(requestSms()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(prisma.populationVerification.create).not.toHaveBeenCalled();
    expect(delivery.sendSms).not.toHaveBeenCalled();
  });

  it('creates and sends an OTP for exactly one ACTIVE SMS subscriber', async () => {
    const result = await requestSms();
    expect(prisma.populationSubscriber.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: PopulationSubscriberStatus.ACTIVE,
          phone: '+14505551234',
          smsEnabled: true,
        }),
        take: 2,
      }),
    );
    expect(prisma.populationVerification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          codeHash: expect.any(String),
          maxAttempts: 5,
        }),
      }),
    );
    expect(delivery.sendSms).toHaveBeenCalledWith(
      '+14505551234',
      expect.any(String),
    );
    expect(result).not.toHaveProperty('subscriberId');
    expect(result).not.toHaveProperty('verificationId');
  });

  it('normalizes email exactly as registration does', async () => {
    await service.requestSubscriberAccessByDestination('public-program', {
      channel: PopulationVerificationChannel.EMAIL,
      destination: ' Citizen@Example.COM ',
    });
    expect(prisma.populationSubscriber.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: 'citizen@example.com',
          emailEnabled: true,
        }),
      }),
    );
    expect(delivery.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ destination: 'citizen@example.com' }),
    );
  });

  it('returns an indistinguishable random-IV decoy for unknown destinations', async () => {
    const real = await requestSms();
    prisma.populationSubscriber.findMany.mockResolvedValue([]);
    const decoy = await requestSms();
    const secondDecoy = await requestSms();
    for (const result of [real, decoy, secondDecoy]) {
      expect(Object.keys(result).sort()).toEqual(
        ['accepted', 'message', 'accessRequestToken', 'expiresAt'].sort(),
      );
      expect(
        result.accessRequestToken.split('.').map((part) => part.length),
      ).toEqual(real.accessRequestToken.split('.').map((part) => part.length));
      expect(result.accessRequestToken).not.toMatch(
        /14505551234|subscriber-1|citizen/i,
      );
      expect(() =>
        JSON.parse(
          Buffer.from(
            result.accessRequestToken.split('.')[2],
            'base64url',
          ).toString(),
        ),
      ).toThrow();
    }
    expect(decoy.accessRequestToken.split('.')[1]).not.toBe(
      secondDecoy.accessRequestToken.split('.')[1],
    );
  });

  it.each([
    ['no ACTIVE match', []],
    [
      'duplicate ACTIVE matches',
      [subscriber, { ...subscriber, id: 'subscriber-2' }],
    ],
  ])('does not create or send an OTP for %s', async (_label, candidates) => {
    prisma.populationSubscriber.findMany.mockResolvedValue(candidates);
    await requestSms();
    expect(prisma.populationVerification.create).not.toHaveBeenCalled();
    expect(delivery.sendSms).not.toHaveBeenCalled();
  });

  it('returns a decoy for a suspended program', async () => {
    prisma.populationProgram.findUnique.mockResolvedValue({
      ...program,
      status: PopulationProgramStatus.SUSPENDED,
    });
    await expect(requestSms()).resolves.toMatchObject({ accepted: true });
    expect(prisma.populationSubscriber.findMany).not.toHaveBeenCalled();
    expect(prisma.populationVerification.create).not.toHaveBeenCalled();
  });

  it('excludes PENDING and UNSUBSCRIBED subscribers at the database boundary', async () => {
    prisma.populationSubscriber.findMany.mockResolvedValue([]);
    await requestSms();
    expect(prisma.populationSubscriber.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: PopulationSubscriberStatus.ACTIVE,
        }),
      }),
    );
    expect(prisma.populationVerification.create).not.toHaveBeenCalled();
  });

  it('applies the existing per-subscriber cooldown and hourly limit', async () => {
    prisma.populationVerification.findFirst.mockResolvedValue({
      createdAt: new Date(),
    });
    prisma.populationVerification.count.mockResolvedValue(5);
    await requestSms();
    expect(prisma.populationVerification.create).not.toHaveBeenCalled();
    expect(delivery.sendSms).not.toHaveBeenCalled();
  });

  it('verifies OTP atomically and reveals subscriberId only on success', async () => {
    const requested = await requestSms();
    const code = delivery.sendSms.mock.calls[0][1].match(/\d{6}/)![0];
    prisma.populationVerification.findFirst.mockResolvedValue({
      id: 'verification-1',
      channel: PopulationVerificationChannel.SMS,
      codeHash: otpHash(code),
      expiresAt: new Date(Date.now() + 60_000),
      attemptCount: 0,
      maxAttempts: 5,
      subscriber: {
        id: 'subscriber-1',
        programId: 'program-1',
        status: PopulationSubscriberStatus.ACTIVE,
      },
    });
    const result = await service.verifySubscriberAccessRequest(
      'public-program',
      {
        accessRequestToken: requested.accessRequestToken,
        code,
      },
    );
    expect(prisma.populationVerification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ verifiedAt: null }),
      }),
    );
    expect(result).toMatchObject({
      verified: true,
      subscriberId: 'subscriber-1',
      accessTokenExpiresInSeconds: 1800,
    });
  });

  it('rejects invalid OTPs generically and increments attempts atomically', async () => {
    prisma.populationVerification.findFirst.mockResolvedValue({
      id: 'verification-1',
      codeHash: otpHash('123456'),
      expiresAt: new Date(Date.now() + 60_000),
      attemptCount: 0,
      maxAttempts: 5,
      subscriber: {
        id: 'subscriber-1',
        programId: 'program-1',
        status: PopulationSubscriberStatus.ACTIVE,
      },
    });
    await expect(
      service.verifySubscriberAccessRequest('public-program', {
        accessRequestToken: forgeToken(),
        code: '000000',
      }),
    ).rejects.toMatchObject({ message: 'Code d’accès invalide ou expiré' });
    expect(prisma.populationVerification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { attemptCount: { increment: 1 } } }),
    );
  });

  it.each([
    ['expired', { expiresAt: new Date(Date.now() - 1), attemptCount: 0 }],
    [
      'attempt-limited',
      { expiresAt: new Date(Date.now() + 60_000), attemptCount: 5 },
    ],
  ])('rejects an %s OTP generically', async (_label, state) => {
    prisma.populationVerification.findFirst.mockResolvedValue({
      id: 'verification-1',
      codeHash: otpHash('123456'),
      maxAttempts: 5,
      ...state,
      subscriber: {
        id: 'subscriber-1',
        programId: 'program-1',
        status: PopulationSubscriberStatus.ACTIVE,
      },
    });
    await expect(
      service.verifySubscriberAccessRequest('public-program', {
        accessRequestToken: forgeToken(),
        code: '123456',
      }),
    ).rejects.toMatchObject({ message: 'Code d’accès invalide ou expiré' });
  });

  it('never authenticates a decoy token with any OTP', async () => {
    prisma.populationSubscriber.findMany.mockResolvedValue([]);
    const decoy = await requestSms();
    await expect(
      service.verifySubscriberAccessRequest('public-program', {
        accessRequestToken: decoy.accessRequestToken,
        code: '123456',
      }),
    ).rejects.toMatchObject({ message: 'Code d’accès invalide ou expiré' });
  });

  it('allows only one concurrent/replayed verification to authenticate', async () => {
    prisma.populationVerification.findFirst.mockResolvedValue({
      id: 'verification-1',
      codeHash: otpHash('123456'),
      expiresAt: new Date(Date.now() + 60_000),
      attemptCount: 0,
      maxAttempts: 5,
      subscriber: {
        id: 'subscriber-1',
        programId: 'program-1',
        status: PopulationSubscriberStatus.ACTIVE,
      },
    });
    prisma.populationVerification.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const attempts = await Promise.allSettled([
      service.verifySubscriberAccessRequest('public-program', {
        accessRequestToken: forgeToken(),
        code: '123456',
      }),
      service.verifySubscriberAccessRequest('public-program', {
        accessRequestToken: forgeToken(),
        code: '123456',
      }),
    ]);
    expect(attempts.map((result) => result.status).sort()).toEqual([
      'fulfilled',
      'rejected',
    ]);
  });

  it.each([
    ['expired token', () => forgeToken({ exp: Date.now() - 1 })],
    [
      'wrong purpose',
      () => forgeToken({ purpose: 'POPULATION_LOCATION_RESOLUTION' }),
    ],
    ['another program', () => forgeToken({ programId: 'program-2' })],
    ['access token', () => 'payload.signature'],
    ['location token', () => 'v1.iv.ciphertext.tag.extra'],
  ])('rejects %s with no identity disclosure', async (_label, token) => {
    await expect(
      service.verifySubscriberAccessRequest('public-program', {
        accessRequestToken: token(),
        code: '123456',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a modified request token', async () => {
    const parts = forgeToken().split('.');
    parts[2] = `${parts[2][0] === 'A' ? 'B' : 'A'}${parts[2].slice(1)}`;
    await expect(
      service.verifySubscriberAccessRequest('public-program', {
        accessRequestToken: parts.join('.'),
        code: '123456',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    ['missing', undefined],
    ['invalid', 'too-short'],
  ])(
    'makes only recovery unavailable when its secret is %s',
    async (_label, secret) => {
      if (secret === undefined)
        delete process.env.POPULATION_ACCESS_REQUEST_TOKEN_SECRET;
      else process.env.POPULATION_ACCESS_REQUEST_TOKEN_SECRET = secret;
      await expect(requestSms()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(prisma.populationVerification.create).not.toHaveBeenCalled();
    },
  );

  it('makes verification unavailable when its secret is missing', async () => {
    const token = forgeToken();
    delete process.env.POPULATION_ACCESS_REQUEST_TOKEN_SECRET;
    await expect(
      service.verifySubscriberAccessRequest('public-program', {
        accessRequestToken: token,
        code: '123456',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
