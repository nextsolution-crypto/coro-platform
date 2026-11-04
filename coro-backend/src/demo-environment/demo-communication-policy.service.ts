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
    const ids = [...new Set([user?.organizationId, clientUser?.organizationId].filter(Boolean))];
    return ids.length === 1 ? ids[0]! : null;
  }

  async evaluate(request: DemoCommunicationRequest): Promise<DemoCommunicationDecision> {
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
        simulated: !blocked,
        blocked,
      },
      update: {},
      select: { id: true },
    });
    if (blocked) return { disposition: 'BLOCKED', eventId: event.id };
    return { disposition: 'SIMULATED', eventId: event.id };
  }
}

export const DEMO_COMMUNICATION_CHANNELS = DemoCommunicationChannel;
