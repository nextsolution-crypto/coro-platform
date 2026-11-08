import { controlledOtpAllowed } from '../population/population-controlled-otp';
import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  DemoCommunicationChannel,
  DemoCommunicationMode,
  PopulationAlertType,
  PopulationAlertStatus,
  PopulationAlertChannel,
  PopulationDeliveryMode,
  PopulationDeliveryStatus,
  PopulationGovernanceMode,
  PopulationProgramStatus,
} from '@prisma/client';
import { estimateControlledCampaignCost } from '../population/population-controlled-test-cost';
import { PrismaService } from '../prisma/prisma.service';

export type DemoCommunicationDecision =
  | { disposition: 'LIVE' }
  | { disposition: 'SIMULATED'; eventId: string }
  | { disposition: 'BLOCKED'; eventId: string };

export type DemoCommunicationRequest = {
  organizationId: string;
  channel: DemoCommunicationChannel;
  operation: string;
  recipient?: string;
  payload: unknown;
  idempotencyKey?: string;
  populationOtpProgramId?: string;
  controlledPopulationContext?: {
    programId: string;
    alertId: string;
    deliveryId: string;
  };
};

function digest(value: unknown): string {
  return createHash('sha256')
    .update(typeof value === 'string' ? value : JSON.stringify(value))
    .digest('hex');
}

const AUTHENTICATION_LIVE_OPERATIONS = new Set([
  'PLATFORM_MFA',
  'PLATFORM_PASSWORD_RESET',
  'CLIENT_PASSWORD_RESET',
  'CLIENT_MAGIC_LINK',
  'CLIENT_INVITATION',
  'ORGANIZATION_USER_INVITATION',
]);
const CORO_DEMO_ORGANIZATION_ID = '916f54ec-af22-45e0-99db-a369d9630002';

@Injectable()
export class DemoCommunicationPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async organizationIdForRecipient(email: string): Promise<string | null> {
    const normalized = email.trim().toLowerCase();
    const [user, clientUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { email: normalized },
        select: { organizationId: true },
      }),
      this.prisma.clientUser.findUnique({
        where: { email: normalized },
        select: { organizationId: true },
      }),
    ]);
    const ids = [
      ...new Set(
        [user?.organizationId, clientUser?.organizationId].filter(Boolean),
      ),
    ];
    return ids.length === 1 ? ids[0]! : null;
  }

  async evaluate(
    request: DemoCommunicationRequest,
  ): Promise<DemoCommunicationDecision> {
    const environment = await this.prisma.demoEnvironment.findUnique({
      where: { organizationId: request.organizationId },
      select: {
        status: true,
        communicationMode: true,
        externalProvidersDisabled: true,
      },
    });
    if (!environment) return { disposition: 'LIVE' };
    if (
      request.operation === 'POPULATION_SUBSCRIBER_OTP' &&
      request.populationOtpProgramId &&
      request.recipient &&
      controlledOtpAllowed(process.env, {
        ...request,
        programId: request.populationOtpProgramId,
        recipient: request.recipient,
      })
    ) {
      return this.claimControlledOtp(request);
    }

    if (!environment.externalProvidersDisabled) {
      throw new Error('DEMO_EXTERNAL_PROVIDER_POLICY_INVALID');
    }

    const blocked =
      environment.status !== 'ACTIVE' ||
      environment.communicationMode === DemoCommunicationMode.BLOCK;
    const authenticationLiveException =
      !blocked && (await this.isAuthenticationLiveException(request));
    const controlledPopulationLiveException =
      !blocked && (await this.isControlledPopulationLiveException(request));
    const event = await this.prisma.demoCommunicationEvent.upsert({
      where: {
        organizationId_idempotencyKey: {
          organizationId: request.organizationId,
          idempotencyKey:
            request.idempotencyKey ??
            digest({
              channel: request.channel,
              operation: request.operation,
              recipient: request.recipient,
              payload: request.payload,
            }),
        },
      },
      create: {
        organizationId: request.organizationId,
        channel: request.channel,
        operation: request.operation,
        recipientHash: request.recipient
          ? digest(request.recipient.trim().toLowerCase())
          : null,
        payloadHash: digest(request.payload),
        idempotencyKey:
          request.idempotencyKey ??
          digest({
            channel: request.channel,
            operation: request.operation,
            recipient: request.recipient,
            payload: request.payload,
          }),
        simulated:
          !blocked &&
          !authenticationLiveException &&
          !controlledPopulationLiveException,
        blocked,
      },
      update: {},
      select: { id: true },
    });
    if (blocked) return { disposition: 'BLOCKED', eventId: event.id };
    if (authenticationLiveException || controlledPopulationLiveException)
      return { disposition: 'LIVE' };
    return { disposition: 'SIMULATED', eventId: event.id };
  }

  private async claimControlledOtp(
    request: DemoCommunicationRequest,
  ): Promise<DemoCommunicationDecision> {
    // One irreversible claim per channel/destination/window. An ambiguous provider
    // result consumes the claim: no automatic retry or second transport call.
    const normalizedRecipient =
      request.channel === 'EMAIL'
        ? request.recipient!.trim().toLowerCase()
        : request.recipient!.replace(/[\s().-]/g, '');
    const idempotencyKey = digest([
      'CONTROLLED_POPULATION_OTP',
      request.populationOtpProgramId,
      request.channel,
      digest(normalizedRecipient),
      process.env.POPULATION_CONTROLLED_OTP_EXPIRES_AT,
    ]);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${idempotencyKey}, 0))`;
      const environment = await tx.demoEnvironment.findUnique({
        where: { organizationId: request.organizationId },
      });
      const program = await tx.populationProgram.findUnique({
        where: { id: request.populationOtpProgramId },
        include: {
          rueFacilityProfile: { include: { building: true } },
          subscribers: {
            where: { isSynthetic: false },
            select: {
              phoneCanonical: true,
              emailCanonical: true,
              status: true,
            },
          },
        },
      });
      const previous = await tx.demoCommunicationEvent.findUnique({
        where: {
          organizationId_idempotencyKey: {
            organizationId: request.organizationId,
            idempotencyKey,
          },
        },
      });
      const normalized =
        request.channel === 'EMAIL'
          ? request.recipient!.trim().toLowerCase()
          : request.recipient!.replace(/[\s().-]/g, '');
      const subscriber =
        program?.subscribers.length === 1 ? program.subscribers[0] : null;
      const eligible =
        controlledOtpAllowed(process.env, {
          ...request,
          programId: request.populationOtpProgramId!,
          recipient: request.recipient!,
        }) &&
        environment?.status === 'ACTIVE' &&
        environment.communicationMode === 'SIMULATE' &&
        environment.externalProvidersDisabled &&
        program?.status === 'ACTIVE' &&
        program.registrationEnabled &&
        program.deliveryMode === 'SANDBOX' &&
        program.governanceMode === 'DUAL_CONTROL' &&
        program.rueFacilityProfile.building.organizationId ===
          request.organizationId &&
        subscriber &&
        ['PENDING_VERIFICATION', 'ACTIVE'].includes(subscriber.status) &&
        (request.channel === 'SMS'
          ? program.smsEnabled && subscriber.phoneCanonical === normalized
          : program.emailEnabled && subscriber.emailCanonical === normalized);
      if (previous) return { disposition: 'BLOCKED', eventId: previous.id };
      const event = await tx.demoCommunicationEvent.create({
        data: {
          organizationId: request.organizationId,
          channel: request.channel,
          operation: request.operation,
          recipientHash: digest(normalized),
          // Do not persist a brute-forceable hash of a six-digit OTP.
          payloadHash: digest({
            operation: request.operation,
            programId: request.populationOtpProgramId,
            channel: request.channel,
          }),
          idempotencyKey,
          blocked: !eligible,
          simulated: false,
        },
        select: { id: true },
      });
      return eligible
        ? { disposition: 'LIVE' }
        : { disposition: 'BLOCKED', eventId: event.id };
    });
  }

  private async isControlledPopulationLiveException(
    request: DemoCommunicationRequest,
  ): Promise<boolean> {
    if (
      process.env.POPULATION_CONTROLLED_LIVE_TEST_ENABLED !== 'true' ||
      process.env.POPULATION_CONTROLLED_LIVE_TEST_STOP === 'true' ||
      request.operation !== 'POPULATION_CONTROLLED_LIVE_TEST' ||
      request.organizationId !==
        process.env.POPULATION_CONTROLLED_LIVE_TEST_ORGANIZATION_ID ||
      !request.recipient ||
      !request.controlledPopulationContext
    ) {
      return false;
    }
    const variable =
      request.channel === DemoCommunicationChannel.EMAIL
        ? 'POPULATION_CONTROLLED_LIVE_TEST_EMAIL_SHA256'
        : request.channel === DemoCommunicationChannel.SMS
          ? 'POPULATION_CONTROLLED_LIVE_TEST_SMS_SHA256'
          : null;
    if (!variable) return false;
    const configured = process.env[variable]?.trim().toLowerCase();
    const normalized =
      request.channel === DemoCommunicationChannel.EMAIL
        ? request.recipient.trim().toLowerCase()
        : request.recipient.replace(/[\s().-]/g, '');
    if (
      !configured ||
      !/^[a-f0-9]{64}$/.test(configured) ||
      configured !== digest(normalized)
    ) {
      return false;
    }

    /*
     * L'appelant ne peut pas transformer le nom d'operation en autorisation.
     * La preuve est reconstruite depuis la livraison canonique au plus pres
     * du transport fournisseur. Elle lie tenant, programme, campagne,
     * destination, canal et cle d'idempotence a un etat encore envoyable.
     */
    const context = request.controlledPopulationContext;
    const delivery = await this.prisma.populationAlertDelivery.findUnique({
      where: { id: context.deliveryId },
      select: {
        alertId: true,
        idempotencyKey: true,
        channel: true,
        status: true,
        suppressionReason: true,
        destinationSnapshot: true,
        alert: {
          select: {
            id: true,
            programId: true,
            type: true,
            status: true,
            titleFR: true,
            titleEN: true,
            deliveryModeSnapshot: true,
            createdByType: true,
            createdById: true,
            approvedByType: true,
            approvedById: true,
            program: {
              select: {
                id: true,
                status: true,
                governanceMode: true,
                rueFacilityProfile: {
                  select: {
                    building: { select: { organizationId: true } },
                  },
                },
              },
            },
            deliveries: {
              select: {
                channel: true,
                subscriberId: true,
                destinationSnapshot: true,
                messageSnapshot: true,
              },
            },
          },
        },
      },
    });
    if (!delivery) return false;

    const program = delivery.alert.program;
    const destination = delivery.destinationSnapshot
      ? request.channel === DemoCommunicationChannel.EMAIL
        ? delivery.destinationSnapshot.trim().toLowerCase()
        : delivery.destinationSnapshot.replace(/[\s().-]/g, '')
      : null;
    const campaignDeliveries = delivery.alert.deliveries;
    const campaignSubscribers = new Set(
      campaignDeliveries
        .map((candidate) => candidate.subscriberId)
        .filter(Boolean),
    );
    const campaignRosterIsExact =
      campaignDeliveries.length === 2 &&
      campaignSubscribers.size === 1 &&
      campaignDeliveries.filter(
        (candidate) => candidate.channel === PopulationAlertChannel.EMAIL,
      ).length === 1 &&
      campaignDeliveries.filter(
        (candidate) => candidate.channel === PopulationAlertChannel.SMS,
      ).length === 1;
    if (campaignRosterIsExact) {
      try {
        estimateControlledCampaignCost(campaignDeliveries);
      } catch {
        return false;
      }
    }
    return (
      context.alertId === delivery.alertId &&
      context.alertId === delivery.alert.id &&
      context.programId === delivery.alert.programId &&
      context.programId === program.id &&
      context.programId ===
        process.env.POPULATION_CONTROLLED_LIVE_TEST_PROGRAM_ID &&
      program.rueFacilityProfile.building.organizationId ===
        request.organizationId &&
      program.status === PopulationProgramStatus.ACTIVE &&
      program.governanceMode === PopulationGovernanceMode.DUAL_CONTROL &&
      delivery.alert.type === PopulationAlertType.TEST &&
      delivery.alert.status === PopulationAlertStatus.SENDING &&
      delivery.alert.deliveryModeSnapshot === PopulationDeliveryMode.LIVE &&
      /^EXERCICE\s*\/\s*TEST\b/i.test(delivery.alert.titleFR.trim()) &&
      (!delivery.alert.titleEN?.trim() ||
        /^EXERCISE\s*\/\s*TEST\b/i.test(delivery.alert.titleEN.trim())) &&
      campaignRosterIsExact &&
      Boolean(delivery.alert.approvedById) &&
      !(
        delivery.alert.createdByType === delivery.alert.approvedByType &&
        delivery.alert.createdById === delivery.alert.approvedById
      ) &&
      delivery.channel === request.channel &&
      delivery.status === PopulationDeliveryStatus.SENDING &&
      delivery.suppressionReason === null &&
      destination === normalized &&
      Boolean(request.idempotencyKey) &&
      delivery.idempotencyKey === request.idempotencyKey &&
      process.env.POPULATION_CONTROLLED_LIVE_TEST_STOP !== 'true'
    );
  }

  private async isAuthenticationLiveException(
    request: DemoCommunicationRequest,
  ): Promise<boolean> {
    if (
      request.organizationId !== CORO_DEMO_ORGANIZATION_ID ||
      request.channel !== DemoCommunicationChannel.EMAIL ||
      !request.recipient ||
      !AUTHENTICATION_LIVE_OPERATIONS.has(request.operation)
    )
      return false;
    const configured =
      process.env.DEMO_AUTH_EMAIL_LIVE_RECIPIENT_SHA256_ALLOWLIST;
    if (!configured?.trim()) return false;
    const allowed = new Set(
      configured
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter((value) => /^[a-f0-9]{64}$/.test(value)),
    );
    if (!allowed.has(digest(request.recipient.trim().toLowerCase()))) {
      return false;
    }
    const normalized = request.recipient.trim().toLowerCase();
    const [user, clientUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { email: normalized },
        select: { organizationId: true, isActive: true },
      }),
      this.prisma.clientUser.findUnique({
        where: { email: normalized },
        select: {
          organizationId: true,
          isActive: true,
          client: { select: { isActive: true } },
        },
      }),
    ]);
    const eligibleUser =
      user?.organizationId === CORO_DEMO_ORGANIZATION_ID &&
      user.isActive === true;
    const eligibleClientUser =
      clientUser?.organizationId === CORO_DEMO_ORGANIZATION_ID &&
      clientUser.isActive === true &&
      clientUser.client.isActive === true;
    if (request.operation.startsWith('CLIENT_')) return eligibleClientUser;
    if (request.operation === 'PLATFORM_MFA') {
      return Number(eligibleUser) + Number(eligibleClientUser) === 1;
    }
    return eligibleUser;
  }
}

export const DEMO_COMMUNICATION_CHANNELS = DemoCommunicationChannel;
