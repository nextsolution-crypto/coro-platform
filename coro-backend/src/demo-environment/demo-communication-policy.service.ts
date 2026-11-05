import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  DemoCommunicationChannel,
  DemoCommunicationMode,
} from '@prisma/client';
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

    if (!environment.externalProvidersDisabled) {
      throw new Error('DEMO_EXTERNAL_PROVIDER_POLICY_INVALID');
    }

    const blocked =
      environment.status !== 'ACTIVE' ||
      environment.communicationMode === DemoCommunicationMode.BLOCK;
    const authenticationLiveException =
      !blocked && (await this.isAuthenticationLiveException(request));
    const controlledPopulationLiveException =
      !blocked && this.isControlledPopulationLiveException(request);
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

  private isControlledPopulationLiveException(
    request: DemoCommunicationRequest,
  ): boolean {
    if (
      process.env.POPULATION_CONTROLLED_LIVE_TEST_ENABLED !== 'true' ||
      process.env.POPULATION_CONTROLLED_LIVE_TEST_STOP === 'true' ||
      request.operation !== 'POPULATION_CONTROLLED_LIVE_TEST' ||
      request.organizationId !==
        process.env.POPULATION_CONTROLLED_LIVE_TEST_ORGANIZATION_ID ||
      !request.recipient
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
    return (
      Boolean(configured && /^[a-f0-9]{64}$/.test(configured)) &&
      configured === digest(normalized)
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
