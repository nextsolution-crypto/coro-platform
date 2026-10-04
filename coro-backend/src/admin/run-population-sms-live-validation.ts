import { PrismaClient } from '@prisma/client';
import { PhoneNumberService } from '../common/phone/phone-number.service';
import { PopulationDeliveryService } from '../population/population-delivery.service';
import { PopulationSmsSuppressionService } from '../population/population-sms-suppression.service';
import {
  PopulationSmsLiveValidationError,
  PopulationSmsLiveValidationMode,
  PopulationSmsLiveValidationService,
} from './population-sms-live-validation.service';

export function parseMode(
  value: string | undefined,
): PopulationSmsLiveValidationMode {
  if (value === 'DRY_RUN' || value === 'LIVE') return value;
  throw new PopulationSmsLiveValidationError(
    'MODE_REQUIRED',
    'POPULATION_SMS_LIVE_VALIDATION_MODE doit etre DRY_RUN ou LIVE.',
  );
}

export async function runPopulationSmsLiveValidation(
  env: NodeJS.ProcessEnv = process.env,
) {
  const prisma = new PrismaClient();
  try {
    const phoneNumbers = new PhoneNumberService();
    const service = new PopulationSmsLiveValidationService(
      prisma,
      phoneNumbers,
      new PopulationSmsSuppressionService(prisma as never, phoneNumbers),
      new PopulationDeliveryService(),
    );
    const result = await service.execute({
      mode: parseMode(env.POPULATION_SMS_LIVE_VALIDATION_MODE),
      destination: env.POPULATION_SMS_LIVE_VALIDATION_PHONE,
      evidenceDirectory: env.POPULATION_SMS_LIVE_VALIDATION_EVIDENCE_DIR,
      confirmation: env.POPULATION_SMS_LIVE_VALIDATION_CONFIRM,
      requestedProgram: env.POPULATION_SMS_LIVE_VALIDATION_PROGRAM,
      deployedGitSha: env.DEPLOYED_GIT_SHA,
      backendImage: env.BACKEND_IMAGE,
      environment: env,
    });
    const summary = {
      program: result.evidence.programSlug,
      destination: result.evidence.maskedDestination,
      provider: result.evidence.provider,
      validationVersion: result.evidence.validationWorkflowVersion,
      mode: result.evidence.mode,
      outcome: result.outcome,
      providerContacted: result.evidence.providerContacted,
      providerMessageIdPresent: result.evidence.providerMessageIdPresent,
      evidenceFile: result.evidenceFile,
      evidenceSha256: result.evidenceSha256,
    };
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    process.exitCode = result.exitCode;
    return result;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runPopulationSmsLiveValidation().catch((error: unknown) => {
    const code =
      error instanceof PopulationSmsLiveValidationError
        ? error.code
        : 'VALIDATION_FAILED';
    process.stderr.write(`SMS live validation blocked: ${code}\n`);
    process.exitCode = 1;
  });
}
