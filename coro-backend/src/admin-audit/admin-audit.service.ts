import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequestContext } from '../common/request-context';

export type AdminAuditInput = {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  targetLabel?: string | null;
  organizationId?: string | null;
  reason?: string | null;
  beforeData?: Prisma.InputJsonValue;
  afterData?: Prisma.InputJsonValue;
};

@Injectable()
export class AdminAuditService {
  normalizeReason(reason: string | undefined, required = false): string | null {
    const value = reason?.trim() || null;
    if (required && !value) throw new BadRequestException('Une raison est requise.');
    if (value && value.length > 500) throw new BadRequestException('La raison ne peut pas dépasser 500 caractères.');
    return value;
  }

  async record(tx: Prisma.TransactionClient, input: AdminAuditInput) {
    const actor = await tx.user.findUnique({ where: { id: input.actorUserId }, select: { firstName: true, lastName: true, role: true } });
    if (!actor) throw new BadRequestException('Acteur administratif introuvable.');
    return tx.adminAuditEvent.create({
      data: {
        actorUserId: input.actorUserId,
        actorDisplayName: `${actor.firstName} ${actor.lastName}`.trim(),
        actorRole: actor.role,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        targetLabel: input.targetLabel,
        organizationId: input.organizationId,
        reason: input.reason,
        requestId: RequestContext.requestId(),
        beforeData: input.beforeData,
        afterData: input.afterData,
      },
    });
  }
}
