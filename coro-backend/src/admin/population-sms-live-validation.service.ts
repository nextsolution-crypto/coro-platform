import {
  PopulationDeliveryMode,
  PopulationProgramStatus,
} from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { chmod, mkdir, rename, rm, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { PhoneNumberService } from '../common/phone/phone-number.service';
import {
  PopulationDeliveryService,
  PopulationProviderError,
  PopulationProviderResult,
} from '../population/population-delivery.service';
import { PopulationSmsSuppressionService } from '../population/population-sms-suppression.service';

export const POPULATION_SMS_LIVE_VALIDATION_PROGRAM = 'coro-validation-live';
export const POPULATION_SMS_LIVE_VALIDATION_VERSION =
  'population-sms-live-validation/v1';
export const POPULATION_SMS_LIVE_VALIDATION_EVIDENCE_VERSION =
  'population-sms-live-validation-evidence/v1';
export const POPULATION_SMS_LIVE_VALIDATION_CONFIRMATION =
  'SEND_ONE_CONTROLLED_SMS';
export const POPULATION_SMS_LIVE_VALIDATION_MESSAGE =
  'CORO Sentinelle Population TEST / ESSAI controle. Aucune urgence; aucune action requise. No emergency; no action required. Repondez/Reply HELP puis/then STOP.';

export type PopulationSmsLiveValidationMode = 'DRY_RUN' | 'LIVE';
export type PopulationSmsLiveValidationOutcome =
  | 'DRY_RUN_READY'
  | 'PROVIDER_ACCEPTED'
  | 'PROVIDER_REJECTED'
  | 'AMBIGUOUS'
  | 'BLOCKED';

export class PopulationSmsLiveValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PopulationSmsLiveValidationError';
  }
}

type ProgramRepository = {
  populationProgram: {
    findUnique(args: {
      where: { publicSlug: string };
      select: {
        publicSlug: true;
        status: true;
        deliveryMode: true;
        smsEnabled: true;
        consentVersion: true;
        consentTextFR: true;
        consentTextEN: true;
      };
    }): Promise<{
      publicSlug: string;
      status: PopulationProgramStatus;
      deliveryMode: PopulationDeliveryMode;
      smsEnabled: boolean;
      consentVersion: string | null;
      consentTextFR: string | null;
      consentTextEN: string | null;
    } | null>;
  };
};

export type PopulationSmsLiveValidationInput = {
  mode: PopulationSmsLiveValidationMode;
  destination: string | undefined;
  evidenceDirectory: string | undefined;
  confirmation: string | undefined;
  requestedProgram?: string;
  deployedGitSha?: string;
  backendImage?: string;
  environment?: NodeJS.ProcessEnv;
};

export type PopulationSmsLiveValidationEvidence = {
  validationSchemaVersion: string;
  validationWorkflowVersion: string;
  validationId: string;
  startedAtUtc: string;
  completedAtUtc: string | null;
  deployedGitSha: string | null;
  backendImage: string | null;
  programSlug: string;
  maskedDestination: string;
  sender: string;
  provider: 'BREVO';
  mode: PopulationSmsLiveValidationMode;
  outcome: PopulationSmsLiveValidationOutcome;
  providerContacted: boolean;
  liveValidation: boolean;
  providerAccepted: boolean | null;
  providerMessageId: string | null;
  providerMessageIdPresent: boolean | null;
  handsetReceived: null;
  handsetReceivedAtUtc: null;
  receiptDelaySeconds: null;
  helpSent: null;
  helpWebhookReceived: null;
  helpClassified: null;
  helpAutoResponseExpected: false;
  helpAutoResponseReceived: null;
  stopSent: null;
  stopWebhookReceived: null;
  stopClassified: null;
  suppressionVerified: null;
  postStopSendGateVerified: null;
  otherProgramsReviewed: null;
  unrelatedSmsObserved: null;
  readinessBefore: 'NOT_VALIDATED';
  readinessAfter: 'NOT_VALIDATED';
  approval: 'NOT_APPROVED';
  approver: null;
  approvalTimestampUtc: null;
  rollbackReady: null;
  notes: string[];
};

export type PopulationSmsLiveValidationResult = {
  outcome: PopulationSmsLiveValidationOutcome;
  exitCode: number;
  evidence: PopulationSmsLiveValidationEvidence;
  evidenceFile: string;
  evidenceSha256: string;
};

export class PopulationSmsLiveValidationService {
  constructor(
    private readonly programs: ProgramRepository,
    private readonly phoneNumbers: PhoneNumberService,
    private readonly suppressions: PopulationSmsSuppressionService,
    private readonly delivery: Pick<PopulationDeliveryService, 'sendSms'>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(
    input: PopulationSmsLiveValidationInput,
  ): Promise<PopulationSmsLiveValidationResult> {
    const env = input.environment ?? process.env;
    this.assertStaticGuards(input, env);

    const destination = this.canonicalize(input.destination);
    const maskedDestination = this.phoneNumbers.maskPhoneNumber(destination);
    if (!maskedDestination) {
      throw new PopulationSmsLiveValidationError(
        'DESTINATION_MASKING_FAILED',
        'La destination ne peut pas etre masquee de facon sure.',
      );
    }

    const program = await this.programs.populationProgram.findUnique({
      where: { publicSlug: POPULATION_SMS_LIVE_VALIDATION_PROGRAM },
      select: {
        publicSlug: true,
        status: true,
        deliveryMode: true,
        smsEnabled: true,
        consentVersion: true,
        consentTextFR: true,
        consentTextEN: true,
      },
    });
    this.assertProgram(program);

    if (await this.suppressions.isSuppressed(destination)) {
      throw new PopulationSmsLiveValidationError(
        'DESTINATION_SUPPRESSED',
        'La destination controlee est globalement supprimee.',
      );
    }

    const evidenceDirectory = this.resolveEvidenceDirectory(
      input.evidenceDirectory,
    );
    await this.prepareEvidenceDirectory(evidenceDirectory);

    const evidence = this.initialEvidence(input, env, maskedDestination);
    const evidenceFile = resolve(
      evidenceDirectory,
      `${evidence.validationId}.json`,
    );
    await this.writeEvidence(evidenceFile, evidence);

    if (input.mode === 'DRY_RUN') {
      const completed = {
        ...evidence,
        completedAtUtc: this.now().toISOString(),
        outcome: 'DRY_RUN_READY' as const,
        notes: [
          'MOCK/DRY RUN ONLY: provider not contacted.',
          'This artifact cannot approve SMS production validation.',
        ],
      };
      const evidenceSha256 = await this.writeEvidence(evidenceFile, completed);
      return {
        outcome: completed.outcome,
        exitCode: 0,
        evidence: completed,
        evidenceFile,
        evidenceSha256,
      };
    }

    let providerResult: PopulationProviderResult;
    try {
      providerResult = await this.delivery.sendSms(
        destination,
        POPULATION_SMS_LIVE_VALIDATION_MESSAGE,
      );
    } catch (error) {
      const ambiguous =
        error instanceof PopulationProviderError &&
        error.outcome === 'OUTCOME_UNKNOWN';
      const completed: PopulationSmsLiveValidationEvidence = {
        ...evidence,
        completedAtUtc: this.now().toISOString(),
        outcome: ambiguous ? 'AMBIGUOUS' : 'PROVIDER_REJECTED',
        providerContacted: true,
        liveValidation: true,
        providerAccepted: false,
        providerMessageIdPresent: false,
        notes: [
          ambiguous
            ? 'Provider outcome is ambiguous. Do not retry; reconcile manually.'
            : 'Provider rejected the one controlled request.',
        ],
      };
      let evidenceSha256: string;
      try {
        evidenceSha256 = await this.writeEvidence(evidenceFile, completed);
      } catch {
        throw new PopulationSmsLiveValidationError(
          'EVIDENCE_WRITE_FAILED_AFTER_PROVIDER',
          'Une interaction fournisseur a eu lieu mais la preuve finale a echoue. Ne pas relancer.',
        );
      }
      return {
        outcome: completed.outcome,
        exitCode: 1,
        evidence: completed,
        evidenceFile,
        evidenceSha256,
      };
    }

    try {
      return await this.completeProviderResult(
        evidenceFile,
        evidence,
        providerResult,
      );
    } catch {
      throw new PopulationSmsLiveValidationError(
        'EVIDENCE_WRITE_FAILED_AFTER_PROVIDER',
        'Le fournisseur a accepte la requete mais la preuve finale a echoue. Ne pas relancer.',
      );
    }
  }

  private assertStaticGuards(
    input: PopulationSmsLiveValidationInput,
    env: NodeJS.ProcessEnv,
  ) {
    if (
      input.requestedProgram !== undefined &&
      input.requestedProgram !== POPULATION_SMS_LIVE_VALIDATION_PROGRAM
    ) {
      throw new PopulationSmsLiveValidationError(
        'PROGRAM_NOT_ALLOWED',
        'Seul le programme de validation SMS controlee est autorise.',
      );
    }
    if (!env.BREVO_API_KEY?.trim()) {
      throw new PopulationSmsLiveValidationError(
        'BREVO_API_KEY_MISSING',
        'BREVO_API_KEY doit etre configure.',
      );
    }
    if (!env.BREVO_SMS_SENDER?.trim()) {
      throw new PopulationSmsLiveValidationError(
        'BREVO_SMS_SENDER_MISSING',
        'BREVO_SMS_SENDER doit etre configure.',
      );
    }
    if (env.POPULATION_SMS_PRODUCTION_VALIDATED === 'true') {
      throw new PopulationSmsLiveValidationError(
        'SMS_ALREADY_VALIDATED',
        "L'outil first-live refuse de fonctionner apres validation globale.",
      );
    }
    if (input.mode === 'LIVE') {
      if (input.confirmation !== POPULATION_SMS_LIVE_VALIDATION_CONFIRMATION) {
        throw new PopulationSmsLiveValidationError(
          'CONFIRMATION_REQUIRED',
          'La phrase exacte de confirmation est requise.',
        );
      }
      if (env.CI || env.GITHUB_ACTIONS || env.BUILD_BUILDID) {
        throw new PopulationSmsLiveValidationError(
          'CI_EXECUTION_FORBIDDEN',
          "L'envoi first-live est interdit en CI.",
        );
      }
      if (
        env.NODE_ENV !== 'production' &&
        env.ALLOW_SMS_VALIDATION_MOCK !== 'true'
      ) {
        throw new PopulationSmsLiveValidationError(
          'LIVE_ENVIRONMENT_REQUIRED',
          "L'envoi first-live exige le runtime production deploye.",
        );
      }
    }
  }

  private canonicalize(destination: string | undefined) {
    try {
      return this.phoneNumbers.normalizePhoneNumber(destination, {
        defaultCountry: 'CA',
        purpose: 'SMS',
      }).canonical;
    } catch {
      throw new PopulationSmsLiveValidationError(
        'DESTINATION_INVALID',
        'La destination controlee est invalide.',
      );
    }
  }

  private assertProgram(
    program: Awaited<
      ReturnType<ProgramRepository['populationProgram']['findUnique']>
    >,
  ) {
    if (
      !program ||
      program.publicSlug !== POPULATION_SMS_LIVE_VALIDATION_PROGRAM
    ) {
      throw new PopulationSmsLiveValidationError(
        'VALIDATION_PROGRAM_MISSING',
        "Le programme de validation SMS controlee n'existe pas.",
      );
    }
    if (program.status !== PopulationProgramStatus.ACTIVE) {
      throw new PopulationSmsLiveValidationError(
        'VALIDATION_PROGRAM_INACTIVE',
        "Le programme de validation n'est pas ACTIVE.",
      );
    }
    if (program.deliveryMode !== PopulationDeliveryMode.LIVE) {
      throw new PopulationSmsLiveValidationError(
        'VALIDATION_PROGRAM_NOT_LIVE',
        "Le programme de validation n'est pas en mode LIVE.",
      );
    }
    if (!program.smsEnabled) {
      throw new PopulationSmsLiveValidationError(
        'VALIDATION_PROGRAM_SMS_DISABLED',
        "Le SMS n'est pas active sur le programme de validation.",
      );
    }
    if (
      !program.consentVersion?.trim() ||
      (!program.consentTextFR?.trim() && !program.consentTextEN?.trim())
    ) {
      throw new PopulationSmsLiveValidationError(
        'VALIDATION_PROGRAM_CONSENT_MISSING',
        'La configuration de consentement du programme est incomplete.',
      );
    }
  }

  private resolveEvidenceDirectory(value: string | undefined) {
    if (!value?.trim()) {
      throw new PopulationSmsLiveValidationError(
        'EVIDENCE_DIRECTORY_REQUIRED',
        'Un repertoire de preuve explicite hors depot est requis.',
      );
    }
    const directory = resolve(value);
    const worktree = resolve(process.cwd());
    if (
      directory === worktree ||
      directory.startsWith(`${worktree}\\`) ||
      directory.startsWith(`${worktree}/`)
    ) {
      throw new PopulationSmsLiveValidationError(
        'EVIDENCE_DIRECTORY_IN_WORKTREE',
        'Le repertoire de preuve doit etre hors du depot Git.',
      );
    }
    return directory;
  }

  private async prepareEvidenceDirectory(directory: string) {
    try {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      await chmod(directory, 0o700).catch(() => undefined);
      const probe = resolve(directory, `.write-probe-${randomUUID()}`);
      await writeFile(probe, '', { flag: 'wx', mode: 0o600 });
      await rm(probe);
    } catch {
      throw new PopulationSmsLiveValidationError(
        'EVIDENCE_DIRECTORY_UNWRITABLE',
        "Le repertoire de preuve n'est pas accessible en ecriture.",
      );
    }
  }

  private initialEvidence(
    input: PopulationSmsLiveValidationInput,
    env: NodeJS.ProcessEnv,
    maskedDestination: string,
  ): PopulationSmsLiveValidationEvidence {
    const gitSha = input.deployedGitSha?.trim() || null;
    if (gitSha && !/^[0-9a-f]{7,40}$/i.test(gitSha)) {
      throw new PopulationSmsLiveValidationError(
        'DEPLOYED_GIT_SHA_INVALID',
        'Le Git SHA deploye est invalide.',
      );
    }
    return {
      validationSchemaVersion: POPULATION_SMS_LIVE_VALIDATION_EVIDENCE_VERSION,
      validationWorkflowVersion: POPULATION_SMS_LIVE_VALIDATION_VERSION,
      validationId: `population-sms-validation-${this.now().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`,
      startedAtUtc: this.now().toISOString(),
      completedAtUtc: null,
      deployedGitSha: gitSha,
      backendImage: input.backendImage?.trim() || null,
      programSlug: POPULATION_SMS_LIVE_VALIDATION_PROGRAM,
      maskedDestination,
      sender: env.BREVO_SMS_SENDER!.trim(),
      provider: 'BREVO',
      mode: input.mode,
      outcome: 'BLOCKED',
      providerContacted: false,
      liveValidation: false,
      providerAccepted: null,
      providerMessageId: null,
      providerMessageIdPresent: null,
      handsetReceived: null,
      handsetReceivedAtUtc: null,
      receiptDelaySeconds: null,
      helpSent: null,
      helpWebhookReceived: null,
      helpClassified: null,
      helpAutoResponseExpected: false,
      helpAutoResponseReceived: null,
      stopSent: null,
      stopWebhookReceived: null,
      stopClassified: null,
      suppressionVerified: null,
      postStopSendGateVerified: null,
      otherProgramsReviewed: null,
      unrelatedSmsObserved: null,
      readinessBefore: 'NOT_VALIDATED',
      readinessAfter: 'NOT_VALIDATED',
      approval: 'NOT_APPROVED',
      approver: null,
      approvalTimestampUtc: null,
      rollbackReady: null,
      notes: [
        'Prepared before provider contact. Human checks remain required.',
      ],
    };
  }

  private async completeProviderResult(
    evidenceFile: string,
    evidence: PopulationSmsLiveValidationEvidence,
    providerResult: PopulationProviderResult,
  ): Promise<PopulationSmsLiveValidationResult> {
    const completed: PopulationSmsLiveValidationEvidence = {
      ...evidence,
      completedAtUtc: this.now().toISOString(),
      outcome: 'PROVIDER_ACCEPTED',
      providerContacted: true,
      liveValidation: true,
      providerAccepted: true,
      providerMessageId: providerResult.providerMessageId,
      providerMessageIdPresent: providerResult.providerMessageId !== null,
      notes: [
        'Provider acceptance is not handset receipt or production approval.',
      ],
    };
    const evidenceSha256 = await this.writeEvidence(evidenceFile, completed);
    return {
      outcome: completed.outcome,
      exitCode: 0,
      evidence: completed,
      evidenceFile,
      evidenceSha256,
    };
  }

  private async writeEvidence(
    file: string,
    evidence: PopulationSmsLiveValidationEvidence,
  ) {
    const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
    const temporary = `${file}.${randomUUID()}.tmp`;
    await writeFile(temporary, serialized, { flag: 'wx', mode: 0o600 });
    try {
      await rename(temporary, file);
      await chmod(file, 0o600).catch(() => undefined);
    } catch (error) {
      await rm(temporary, { force: true }).catch(() => undefined);
      throw error;
    }
    return createHash('sha256').update(serialized).digest('hex');
  }
}
