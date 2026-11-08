import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  PopulationAlertChannel,
  PopulationAlertType,
  PopulationGovernanceMode,
} from '@prisma/client';
import { createHash } from 'crypto';
import {
  controlledPopulationCampaignPinned,
  POPULATION_CONTROLLED_LIVE_TEST_QA_PROGRAM_ID,
  POPULATION_CONTROLLED_LIVE_TEST_SMS_SENDER_E164,
} from './population-controlled-live-test.constants';
import { estimateControlledCampaignCost } from './population-controlled-test-cost';

type ControlledDelivery = {
  channel: PopulationAlertChannel;
  destinationSnapshot: string | null;
  subscriberId: string | null;
  messageSnapshot: string;
};

type ControlledAlert = {
  id: string;
  type: PopulationAlertType;
  titleFR: string;
  titleEN: string | null;
  createdByType: string;
  createdById: string;
  approvedByType: string | null;
  approvedById: string | null;
};

@Injectable()
export class PopulationControlledLiveTestService {
  private digest(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private normalized(channel: PopulationAlertChannel, value: string) {
    return channel === PopulationAlertChannel.EMAIL
      ? value.trim().toLowerCase()
      : value.replace(/[\s().-]/g, '');
  }

  private configuredHash(channel: PopulationAlertChannel) {
    const name =
      channel === PopulationAlertChannel.EMAIL
        ? 'POPULATION_CONTROLLED_LIVE_TEST_EMAIL_SHA256'
        : 'POPULATION_CONTROLLED_LIVE_TEST_SMS_SHA256';
    const value = process.env[name]?.trim().toLowerCase();
    if (!value || !/^[a-f0-9]{64}$/.test(value)) {
      throw new ServiceUnavailableException(`${name}_INVALID`);
    }
    return value;
  }

  isEnabledFor(organizationId: string, programId: string) {
    return (
      process.env.POPULATION_CONTROLLED_LIVE_TEST_ENABLED === 'true' &&
      process.env.POPULATION_CONTROLLED_LIVE_TEST_ORGANIZATION_ID ===
        organizationId &&
      process.env.POPULATION_CONTROLLED_LIVE_TEST_PROGRAM_ID === programId
    );
  }

  isConfiguredFor(organizationId: string, programId: string, alertId?: string) {
    return Boolean(
      programId === POPULATION_CONTROLLED_LIVE_TEST_QA_PROGRAM_ID ||
      (alertId &&
        process.env.POPULATION_CONTROLLED_LIVE_TEST_ALERT_ID === alertId) ||
      (organizationId &&
        programId &&
        process.env.POPULATION_CONTROLLED_LIVE_TEST_ORGANIZATION_ID ===
          organizationId &&
        process.env.POPULATION_CONTROLLED_LIVE_TEST_PROGRAM_ID === programId),
    );
  }

  assertPinned(input: {
    organizationId: string;
    programId: string;
    alertId: string;
  }) {
    if (!controlledPopulationCampaignPinned(process.env, input)) {
      throw new ServiceUnavailableException(
        'CONTROLLED_TEST_CAMPAIGN_AUTHORITY_INVALID',
      );
    }
  }

  assertNotStopped() {
    if (process.env.POPULATION_CONTROLLED_LIVE_TEST_STOP !== 'false') {
      throw new ServiceUnavailableException(
        'POPULATION_CONTROLLED_LIVE_TEST_STOPPED',
      );
    }
  }

  private assertProviderGovernance() {
    if (
      !process.env.BREVO_API_KEY?.trim() ||
      !process.env.BREVO_SENDER_EMAIL?.trim()
    ) {
      throw new ServiceUnavailableException(
        'CONTROLLED_TEST_PROVIDER_NOT_CONFIGURED',
      );
    }
    const budget = Number(
      process.env.POPULATION_CONTROLLED_LIVE_TEST_MAX_CAMPAIGN_CAD_CENTS,
    );
    if (!Number.isInteger(budget) || budget < 1 || budget > 100) {
      throw new ServiceUnavailableException('CONTROLLED_TEST_BUDGET_INVALID');
    }
    if (process.env.POPULATION_BREVO_EMAIL_SENDER_VERIFIED !== 'true') {
      throw new ServiceUnavailableException(
        'CONTROLLED_TEST_EMAIL_SENDER_NOT_VERIFIED',
      );
    }
    if (process.env.POPULATION_SMS_TFN_APPROVED !== 'true') {
      throw new ServiceUnavailableException('CONTROLLED_TEST_TFN_NOT_APPROVED');
    }
    // Commissioning is narrower than production validation. It is possible only
    // after assertPinned and the complete canonical campaign checks below.
    if (
      !['false', 'true'].includes(
        process.env.POPULATION_SMS_PRODUCTION_VALIDATED ?? '',
      )
    ) {
      throw new ServiceUnavailableException(
        'CONTROLLED_TEST_SMS_GLOBAL_STATE_INVALID',
      );
    }
    if (
      process.env.BREVO_SMS_SENDER?.trim() !==
      POPULATION_CONTROLLED_LIVE_TEST_SMS_SENDER_E164
    ) {
      throw new ServiceUnavailableException(
        'CONTROLLED_TEST_SMS_SENDER_INVALID',
      );
    }
    for (const name of [
      'POPULATION_BREVO_WEBHOOK_SECRET',
      'POPULATION_BREVO_SMS_WEBHOOK_SECRET',
    ]) {
      if (Buffer.byteLength(process.env[name] ?? '', 'utf8') < 32) {
        throw new ServiceUnavailableException(
          'CONTROLLED_TEST_WEBHOOK_NOT_READY',
        );
      }
    }
  }

  assertCampaign(
    input: {
      organizationId: string;
      programId: string;
      governanceMode: PopulationGovernanceMode;
      alert: ControlledAlert;
      deliveries: ControlledDelivery[];
    },
    stage: 'PREPARE' | 'TRANSPORT' = 'TRANSPORT',
  ) {
    if (
      !this.isConfiguredFor(
        input.organizationId,
        input.programId,
        input.alert.id,
      )
    )
      return false;
    this.assertPinned({
      organizationId: input.organizationId,
      programId: input.programId,
      alertId: input.alert.id,
    });
    if (stage === 'TRANSPORT') {
      if (!this.isEnabledFor(input.organizationId, input.programId)) {
        throw new ServiceUnavailableException(
          'CONTROLLED_TEST_TRANSPORT_DISABLED',
        );
      }
      this.assertNotStopped();
    } else if (
      !['true', 'false'].includes(
        process.env.POPULATION_CONTROLLED_LIVE_TEST_ENABLED ?? '',
      ) ||
      !['true', 'false'].includes(
        process.env.POPULATION_CONTROLLED_LIVE_TEST_STOP ?? '',
      )
    ) {
      throw new ServiceUnavailableException(
        'CONTROLLED_TEST_SAFETY_STATE_INVALID',
      );
    }
    this.assertProviderGovernance();
    if (input.governanceMode !== PopulationGovernanceMode.DUAL_CONTROL) {
      throw new BadRequestException('CONTROLLED_TEST_DUAL_CONTROL_REQUIRED');
    }
    if (input.alert.type !== PopulationAlertType.TEST) {
      throw new BadRequestException('CONTROLLED_TEST_CONTEXT_REQUIRED');
    }
    if (!/^EXERCICE\s*\/\s*TEST\b/i.test(input.alert.titleFR.trim())) {
      throw new BadRequestException('CONTROLLED_TEST_FR_LABEL_REQUIRED');
    }
    if (
      input.alert.titleEN?.trim() &&
      !/^EXERCISE\s*\/\s*TEST\b/i.test(input.alert.titleEN.trim())
    ) {
      throw new BadRequestException('CONTROLLED_TEST_EN_LABEL_REQUIRED');
    }
    if (
      !input.alert.approvedById ||
      (input.alert.createdByType === input.alert.approvedByType &&
        input.alert.createdById === input.alert.approvedById)
    ) {
      throw new BadRequestException(
        'CONTROLLED_TEST_DISTINCT_APPROVER_REQUIRED',
      );
    }
    const uniqueSubscribers = new Set(
      input.deliveries.map((delivery) => delivery.subscriberId).filter(Boolean),
    );
    const email = input.deliveries.filter(
      (delivery) => delivery.channel === PopulationAlertChannel.EMAIL,
    );
    const sms = input.deliveries.filter(
      (delivery) => delivery.channel === PopulationAlertChannel.SMS,
    );
    if (
      uniqueSubscribers.size !== 1 ||
      email.length !== 1 ||
      sms.length !== 1 ||
      input.deliveries.length !== 2
    ) {
      throw new BadRequestException('CONTROLLED_TEST_EXACT_ROSTER_REQUIRED');
    }
    for (const delivery of input.deliveries) {
      if (!delivery.destinationSnapshot) {
        throw new BadRequestException('CONTROLLED_TEST_DESTINATION_MISSING');
      }
      const actual = this.digest(
        this.normalized(delivery.channel, delivery.destinationSnapshot),
      );
      if (actual !== this.configuredHash(delivery.channel)) {
        throw new BadRequestException(
          'CONTROLLED_TEST_DESTINATION_NOT_ALLOWED',
        );
      }
    }
    estimateControlledCampaignCost(input.deliveries);
    return true;
  }

  assertDestination(channel: PopulationAlertChannel, destination: string) {
    this.assertNotStopped();
    const actual = this.digest(this.normalized(channel, destination));
    if (actual !== this.configuredHash(channel)) {
      throw new BadRequestException('CONTROLLED_TEST_DESTINATION_NOT_ALLOWED');
    }
  }

  mask(channel: PopulationAlertChannel, value: string) {
    const normalized = this.normalized(channel, value);
    if (channel === PopulationAlertChannel.EMAIL) {
      const [local, domain = ''] = normalized.split('@');
      return `${local.slice(0, 2)}***@${domain}`;
    }
    return `${normalized.slice(0, 2)}***${normalized.slice(-2)}`;
  }
}
