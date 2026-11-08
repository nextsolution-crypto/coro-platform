import { createHash } from 'crypto';
import { POPULATION_CONTROLLED_LIVE_TEST_SMS_SENDER_E164 } from './population-controlled-live-test.constants';

export type PopulationOtpScope = {
  organizationId: string;
  programId: string;
  channel: string;
  recipient: string;
};

// Separate commissioning authority for identity verification only. It never
// enables alerts or declares the SMS production transport validated.
export function controlledOtpAllowed(
  env: NodeJS.ProcessEnv,
  scope: PopulationOtpScope,
  now = Date.now(),
): boolean {
  if (
    env.POPULATION_CONTROLLED_OTP_ENABLED !== 'true' ||
    env.POPULATION_CONTROLLED_LIVE_TEST_ENABLED !== 'false' ||
    env.POPULATION_CONTROLLED_LIVE_TEST_STOP !== 'true' ||
    scope.organizationId !==
      env.POPULATION_CONTROLLED_LIVE_TEST_ORGANIZATION_ID ||
    scope.programId !== env.POPULATION_CONTROLLED_LIVE_TEST_PROGRAM_ID
  )
    return false;
  const expires = Date.parse(env.POPULATION_CONTROLLED_OTP_EXPIRES_AT ?? '');
  if (
    !Number.isFinite(expires) ||
    expires <= now ||
    expires - now > 60 * 60 * 1000
  )
    return false;
  if (!['SMS', 'EMAIL'].includes(scope.channel) || !scope.recipient)
    return false;
  if (
    scope.channel === 'SMS' &&
    (env.POPULATION_SMS_TFN_APPROVED !== 'true' ||
      env.BREVO_SMS_SENDER?.trim() !==
        POPULATION_CONTROLLED_LIVE_TEST_SMS_SENDER_E164)
  )
    return false;
  const normalized =
    scope.channel === 'EMAIL'
      ? scope.recipient.trim().toLowerCase()
      : scope.recipient.replace(/[\s().-]/g, '');
  const name =
    scope.channel === 'EMAIL'
      ? 'POPULATION_CONTROLLED_LIVE_TEST_EMAIL_SHA256'
      : 'POPULATION_CONTROLLED_LIVE_TEST_SMS_SHA256';
  const configured = env[name]?.trim().toLowerCase();
  return Boolean(
    configured &&
    /^[a-f0-9]{64}$/.test(configured) &&
    configured === createHash('sha256').update(normalized).digest('hex'),
  );
}
