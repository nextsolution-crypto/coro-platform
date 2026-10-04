import {
  PopulationDeliveryMode,
  PopulationProgramStatus,
} from '@prisma/client';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { PhoneNumberService } from '../common/phone/phone-number.service';
import { PopulationProviderError } from '../population/population-delivery.service';
import {
  POPULATION_SMS_LIVE_VALIDATION_CONFIRMATION,
  POPULATION_SMS_LIVE_VALIDATION_MESSAGE,
  POPULATION_SMS_LIVE_VALIDATION_PROGRAM,
  PopulationSmsLiveValidationError,
  PopulationSmsLiveValidationService,
} from './population-sms-live-validation.service';

describe('PopulationSmsLiveValidationService', () => {
  let evidenceDirectory: string;
  const rawPhone = '514 555 0199';
  const canonicalPhone = '+15145550199';
  const apiKey = 'synthetic-api-key-not-a-secret';
  const webhookSecret = 'synthetic-webhook-secret';
  const program = {
    publicSlug: POPULATION_SMS_LIVE_VALIDATION_PROGRAM,
    status: PopulationProgramStatus.ACTIVE,
    deliveryMode: PopulationDeliveryMode.LIVE,
    smsEnabled: true,
    consentVersion: 'validation-v2',
    consentTextFR: 'Consentement test SMS.',
    consentTextEN: 'SMS test consent.',
  };
  const programs = {
    populationProgram: { findUnique: jest.fn().mockResolvedValue(program) },
  };
  const suppressions = { isSuppressed: jest.fn().mockResolvedValue(false) };
  const delivery = {
    sendSms: jest
      .fn()
      .mockResolvedValue({ provider: 'BREVO', providerMessageId: 'message-1' }),
  };
  const env = {
    BREVO_API_KEY: apiKey,
    BREVO_SMS_SENDER: 'CORO',
    POPULATION_SMS_PRODUCTION_VALIDATED: 'false',
    POPULATION_BREVO_SMS_WEBHOOK_SECRET: webhookSecret,
    NODE_ENV: 'test',
    ALLOW_SMS_VALIDATION_MOCK: 'true',
  } as NodeJS.ProcessEnv;

  beforeEach(async () => {
    evidenceDirectory = await mkdtemp(join(tmpdir(), 'coro-sms-validation-'));
    jest.clearAllMocks();
    programs.populationProgram.findUnique.mockResolvedValue(program);
    suppressions.isSuppressed.mockResolvedValue(false);
    delivery.sendSms.mockResolvedValue({
      provider: 'BREVO',
      providerMessageId: 'message-1',
    });
  });

  afterEach(async () => {
    await rm(evidenceDirectory, { recursive: true, force: true });
  });

  function service() {
    return new PopulationSmsLiveValidationService(
      programs,
      new PhoneNumberService(),
      suppressions as never,
      delivery,
      () => new Date('2026-10-04T12:00:00.000Z'),
    );
  }

  function input(mode: 'DRY_RUN' | 'LIVE' = 'DRY_RUN') {
    return {
      mode,
      destination: rawPhone,
      evidenceDirectory,
      confirmation:
        mode === 'LIVE'
          ? POPULATION_SMS_LIVE_VALIDATION_CONFIRMATION
          : undefined,
      requestedProgram: POPULATION_SMS_LIVE_VALIDATION_PROGRAM,
      deployedGitSha: 'ae260702',
      environment: { ...env },
    };
  }

  it('performs a PII-safe dry-run without provider contact', async () => {
    const result = await service().execute(input());
    const artifact = await readFile(result.evidenceFile, 'utf8');

    expect(result.outcome).toBe('DRY_RUN_READY');
    expect(result.evidence.providerContacted).toBe(false);
    expect(result.evidence.liveValidation).toBe(false);
    expect(result.evidence.approval).toBe('NOT_APPROVED');
    expect(delivery.sendSms).not.toHaveBeenCalled();
    for (const forbidden of [rawPhone, canonicalPhone, apiKey, webhookSecret]) {
      expect(JSON.stringify(result)).not.toContain(forbidden);
      expect(artifact).not.toContain(forbidden);
    }
  });

  it('makes exactly one mocked provider call with the fixed message', async () => {
    const result = await service().execute(input('LIVE'));

    expect(result.outcome).toBe('PROVIDER_ACCEPTED');
    expect(delivery.sendSms).toHaveBeenCalledTimes(1);
    expect(delivery.sendSms).toHaveBeenCalledWith(
      canonicalPhone,
      POPULATION_SMS_LIVE_VALIDATION_MESSAGE,
    );
    expect(result.evidence.handsetReceived).toBeNull();
    expect(result.evidence.helpWebhookReceived).toBeNull();
    expect(result.evidence.stopWebhookReceived).toBeNull();
    expect(result.evidence.approval).toBe('NOT_APPROVED');
  });

  it.each([
    ['wrong program', { requestedProgram: 'premont-boucherville' }],
    ['missing arming', { confirmation: undefined }],
    ['CI', { environment: { ...env, CI: 'true' } }],
    [
      'already validated',
      {
        environment: {
          ...env,
          POPULATION_SMS_PRODUCTION_VALIDATED: 'true',
        },
      },
    ],
    ['missing API key', { environment: { ...env, BREVO_API_KEY: '' } }],
    ['missing sender', { environment: { ...env, BREVO_SMS_SENDER: '' } }],
    ['invalid phone', { destination: 'not-a-phone' }],
  ])('blocks %s before provider contact', async (_label, override) => {
    await expect(
      service().execute({ ...input('LIVE'), ...override }),
    ).rejects.toBeInstanceOf(PopulationSmsLiveValidationError);
    expect(delivery.sendSms).not.toHaveBeenCalled();
  });

  it.each([
    [
      'inactive program',
      { ...program, status: PopulationProgramStatus.SUSPENDED },
    ],
    ['SMS disabled', { ...program, smsEnabled: false }],
    [
      'wrong delivery mode',
      { ...program, deliveryMode: PopulationDeliveryMode.SANDBOX },
    ],
    ['missing consent', { ...program, consentVersion: null }],
  ])('blocks %s before provider contact', async (_label, invalidProgram) => {
    programs.populationProgram.findUnique.mockResolvedValueOnce(invalidProgram);
    await expect(service().execute(input('LIVE'))).rejects.toBeInstanceOf(
      PopulationSmsLiveValidationError,
    );
    expect(delivery.sendSms).not.toHaveBeenCalled();
  });

  it('blocks a globally suppressed destination', async () => {
    suppressions.isSuppressed.mockResolvedValueOnce(true);
    await expect(service().execute(input('LIVE'))).rejects.toMatchObject({
      code: 'DESTINATION_SUPPRESSED',
    });
    expect(delivery.sendSms).not.toHaveBeenCalled();
  });

  it('records rejection without retry', async () => {
    delivery.sendSms.mockRejectedValueOnce(
      new PopulationProviderError('BREVO_HTTP_400', 'rejected'),
    );
    const result = await service().execute(input('LIVE'));

    expect(result.outcome).toBe('PROVIDER_REJECTED');
    expect(result.exitCode).toBe(1);
    expect(delivery.sendSms).toHaveBeenCalledTimes(1);
  });

  it('records an ambiguous provider outcome without retry', async () => {
    delivery.sendSms.mockRejectedValueOnce(
      new PopulationProviderError(
        'BREVO_TIMEOUT',
        'timeout',
        'OUTCOME_UNKNOWN',
      ),
    );
    const result = await service().execute(input('LIVE'));

    expect(result.outcome).toBe('AMBIGUOUS');
    expect(result.exitCode).toBe(1);
    expect(delivery.sendSms).toHaveBeenCalledTimes(1);
  });

  it('accepts a provider 2xx contract without message id without fabricating one', async () => {
    delivery.sendSms.mockResolvedValueOnce({
      provider: 'BREVO',
      providerMessageId: null,
    });
    const result = await service().execute(input('LIVE'));

    expect(result.outcome).toBe('PROVIDER_ACCEPTED');
    expect(result.evidence.providerMessageId).toBeNull();
    expect(result.evidence.providerMessageIdPresent).toBe(false);
  });

  it('rejects evidence output inside the Git worktree', async () => {
    await expect(
      service().execute({ ...input(), evidenceDirectory: process.cwd() }),
    ).rejects.toMatchObject({ code: 'EVIDENCE_DIRECTORY_IN_WORKTREE' });
    expect(delivery.sendSms).not.toHaveBeenCalled();
  });

  it('never retries when final evidence writing fails after provider acceptance', async () => {
    delivery.sendSms.mockImplementationOnce(async () => {
      await rm(evidenceDirectory, { recursive: true, force: true });
      return { provider: 'BREVO', providerMessageId: 'message-1' };
    });

    await expect(service().execute(input('LIVE'))).rejects.toMatchObject({
      code: 'EVIDENCE_WRITE_FAILED_AFTER_PROVIDER',
    });
    expect(delivery.sendSms).toHaveBeenCalledTimes(1);
  });
});
