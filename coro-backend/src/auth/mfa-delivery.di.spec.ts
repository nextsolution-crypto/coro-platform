import { Test, TestingModule } from '@nestjs/testing';
import { MfaDeliveryService } from './mfa-delivery.service';

describe('MfaDeliveryService NestJS dependency injection', () => {
  const environmentKeys = [
    'JWT_SECRET',
    'PLATFORM_MFA_SECRET',
    'MFA_QA_CAPTURE_ENABLED',
    'MFA_QA_CAPTURE_DIR',
    'MFA_QA_ALLOWED_RECIPIENT_SUFFIXES',
    'MFA_QA_NETWORK_ISOLATED',
  ] as const;
  const originalEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters';
    process.env.PLATFORM_MFA_SECRET =
      'test-platform-mfa-secret-at-least-32-characters';
    delete process.env.MFA_QA_CAPTURE_ENABLED;
    delete process.env.MFA_QA_CAPTURE_DIR;
    delete process.env.MFA_QA_ALLOWED_RECIPIENT_SUFFIXES;
    delete process.env.MFA_QA_NETWORK_ISOLATED;
  });

  afterAll(() => {
    for (const key of environmentKeys) {
      const value = originalEnvironment[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('resolves without an Object dependency and remains singleton scoped', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [MfaDeliveryService],
    }).compile();

    const first = moduleRef.get(MfaDeliveryService);
    const second = moduleRef.get(MfaDeliveryService);

    expect(first).toBeInstanceOf(MfaDeliveryService);
    expect(second).toBe(first);
    await moduleRef.close();
  });

  it('resolves the provider exported by AuthModule', async () => {
    const { AuthModule } =
      jest.requireActual<typeof import('./auth.module')>('./auth.module');
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    expect(moduleRef.get(MfaDeliveryService)).toBeInstanceOf(
      MfaDeliveryService,
    );
    await moduleRef.close();
  });

  it('resolves the shared provider through ClientPortalModule', async () => {
    jest.doMock('puppeteer', () => ({ __esModule: true, default: {} }));
    const { ClientPortalModule } = jest.requireActual<
      typeof import('../client-portal/client-portal.module')
    >('../client-portal/client-portal.module');
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ClientPortalModule],
    }).compile();

    expect(moduleRef.get(MfaDeliveryService)).toBeInstanceOf(
      MfaDeliveryService,
    );
    await moduleRef.close();
  });
});
